"use server";
import { publishTeamEvent } from "@/lib/notifications/events";
import { recordApartmentChange } from "@/lib/patients/visit-events";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apartmentHasConflict } from "@/lib/accommodations/conflicts";
import { requireSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  accommodations,
  patientAccommodations,
  patientVisits,
} from "@/lib/db/schema";
import { apartmentValues, type FormState } from "@/lib/patients/form-schema";
import { fieldErrors } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";

// Failures that are safe to show as they are.
class AccommodationError extends Error {}

export async function createApartment(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireSession();
  const { t } = await getI18n();
  const errors = t.accommodations.errors;
  if (!can(parseRoles(user.role), "accommodation", "create"))
    return {
      status: "error",
      message: errors.addPermission,
    };
  const parsed = z
    .object({
      name: z.string().trim().min(1, "nameRequired").max(200, "nameTooLong"),
      address: z.string().trim().min(1).max(500),
      apartmentType: z.enum(apartmentValues, "apartmentTypeRequired"),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      status: "error",
      errors: fieldErrors(t, parsed.error.issues),
    };
  try {
    await db.insert(accommodations).values(parsed.data);
  } catch {
    return {
      status: "error",
      message: errors.addFailed,
    };
  }
  revalidatePath("/accommodations");
  revalidatePath("/(clinic)/patients/[id]", "page");
  return { status: "success" };
}

export async function updateAccommodation(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireSession();
  const { t } = await getI18n();
  const errors = t.accommodations.errors;
  if (!can(parseRoles(user.role), "accommodation", "update"))
    return {
      status: "error",
      message: errors.managePermission,
    };
  const parsed = z
    .object({
      id: z.uuid(),
      accommodationId: z.union([z.uuid(), z.literal("")]),
      isFree: z.boolean(),
      freeDays: z.coerce.number().int().min(0).max(3650),
    })
    .safeParse({
      id: form.get("id"),
      accommodationId: form.get("accommodationId") ?? "",
      isFree: form.get("isFree") === "on",
      freeDays: form.get("isFree") === "on" ? form.get("freeDays") : 0,
    });
  if (!parsed.success)
    return {
      status: "error",
      message: errors.checkFields,
      errors: fieldErrors(t, parsed.error.issues),
    };
  try {
    await db.transaction(async (tx) => {
      const data = parsed.data;
      const [request] = await tx
        .select()
        .from(patientAccommodations)
        .where(eq(patientAccommodations.id, data.id))
        .for("update");
      if (!request) throw new AccommodationError(errors.requestGone);
      const [visit] = await tx
        .select({
          arrival: patientVisits.arrivalAt,
          departure: patientVisits.departureAt,
          days: sql<number>`greatest(1, ((${patientVisits.departureAt} AT TIME ZONE 'Europe/Chisinau')::date - (${patientVisits.arrivalAt} AT TIME ZONE 'Europe/Chisinau')::date))`,
        })
        .from(patientVisits)
        .where(eq(patientVisits.id, request.visitId));
      if (!visit) throw new AccommodationError(errors.visitGone);
      if (data.isFree && (data.freeDays < 1 || data.freeDays > visit.days))
        throw new AccommodationError(errors.freeDaysRange(visit.days));
      if (data.accommodationId) {
        // Serialize assignments to an apartment so concurrent requests cannot
        // both pass the overlap check before either commits.
        const [apartment] = await tx
          .select()
          .from(accommodations)
          .where(eq(accommodations.id, data.accommodationId))
          .for("update");
        if (!apartment || apartment.apartmentType !== request.apartmentType)
          throw new AccommodationError(errors.typeMismatch);
        if (
          await apartmentHasConflict(tx, data.accommodationId, data.id, visit)
        )
          throw new AccommodationError(errors.conflict);
      }
      await tx
        .update(patientAccommodations)
        .set({
          accommodationId: data.accommodationId || null,
          status: data.accommodationId ? "reserved" : "unprocessed",
          reservedAt: data.accommodationId ? new Date() : null,
          isFree: data.isFree,
          freeDays: data.freeDays,
        })
        .where(eq(patientAccommodations.id, data.id));
      await recordApartmentChange(tx, {
        visitId: request.visitId,
        from: request.accommodationId,
        to: data.accommodationId || null,
        actorId: user.id,
      });
      await publishTeamEvent(tx, {
        audience: "accommodation",
        title: data.accommodationId
          ? "Cazare · Rezervat"
          : "Cazare · Neprelucrat",
        message: "Cererea de cazare a fost actualizată.",
        href: "/accommodations",
        visitId: request.visitId,
      });
    });
  } catch (error) {
    const message =
      error instanceof AccommodationError ? error.message : errors.updateFailed;
    return { status: "error", message };
  }
  revalidatePath("/accommodations");
  revalidatePath("/(clinic)/patients/[id]", "page");
  return { status: "success" };
}

export async function updateApartmentAddress(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireSession();
  const { t } = await getI18n();
  if (!can(parseRoles(user.role), "accommodation", "update"))
    return {
      status: "error",
      message: t.accommodations.errors.managePermission,
    };
  const parsed = z
    .object({ id: z.uuid(), address: z.string().trim().min(1).max(500) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { status: "error", errors: fieldErrors(t, parsed.error.issues) };
  try {
    const updated = await db
      .update(accommodations)
      .set({ address: parsed.data.address })
      .where(eq(accommodations.id, parsed.data.id))
      .returning({ id: accommodations.id });
    if (!updated.length)
      return { status: "error", message: t.accommodations.errors.addFailed };
  } catch {
    return { status: "error", message: t.accommodations.errors.addFailed };
  }
  revalidatePath("/accommodations");
  revalidatePath(`/accommodations/${parsed.data.id}`);
  return { status: "success" };
}
