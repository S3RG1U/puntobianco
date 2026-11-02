"use server";
import { and, eq, gt, lt, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  accommodations,
  patientAccommodations,
  patientVisits,
} from "@/lib/db/schema";
import { apartmentValues, type FormState } from "@/lib/patients/form-schema";

export async function createApartment(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireSession();
  if (!can(parseRoles(user.role), "accommodation", "create"))
    return {
      status: "error",
      message: "You don't have permission to add apartments.",
    };
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Enter an apartment name.").max(200),
      apartmentType: z.enum(apartmentValues, "Choose an apartment type."),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      status: "error",
      errors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  try {
    await db.insert(accommodations).values(parsed.data);
  } catch {
    return {
      status: "error",
      message: "The apartment could not be saved. Please try again.",
    };
  }
  revalidatePath("/dashboard/accommodations");
  revalidatePath("/dashboard/patients/[id]", "page");
  return { status: "success" };
}

export async function updateAccommodation(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireSession();
  if (!can(parseRoles(user.role), "accommodation", "update"))
    return {
      status: "error",
      message: "You don't have permission to manage accommodation.",
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
      message: "Check the apartment and complimentary days.",
      errors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    };
  try {
    await db.transaction(async (tx) => {
      const data = parsed.data;
      const [request] = await tx
        .select()
        .from(patientAccommodations)
        .where(eq(patientAccommodations.id, data.id))
        .for("update");
      if (!request)
        throw new Error("This accommodation request no longer exists.");
      const [visit] = await tx
        .select({
          arrival: patientVisits.arrivalAt,
          departure: patientVisits.departureAt,
          days: sql<number>`greatest(1, ((${patientVisits.departureAt} AT TIME ZONE 'Europe/Chisinau')::date - (${patientVisits.arrivalAt} AT TIME ZONE 'Europe/Chisinau')::date))`,
        })
        .from(patientVisits)
        .where(eq(patientVisits.id, request.visitId));
      if (!visit) throw new Error("The patient visit could not be found.");
      if (data.isFree && (data.freeDays < 1 || data.freeDays > visit.days))
        throw new Error(
          `Choose between 1 and ${visit.days} complimentary days for this stay.`,
        );
      if (data.accommodationId) {
        // Serialize assignments to an apartment so concurrent requests cannot
        // both pass the overlap check before either commits.
        const [apartment] = await tx
          .select()
          .from(accommodations)
          .where(eq(accommodations.id, data.accommodationId))
          .for("update");
        if (!apartment || apartment.apartmentType !== request.apartmentType)
          throw new Error(
            "Choose an apartment that matches the requested type.",
          );
        const conflicts = await tx
          .select({ id: patientAccommodations.id })
          .from(patientAccommodations)
          .innerJoin(
            patientVisits,
            eq(patientVisits.id, patientAccommodations.visitId),
          )
          .where(
            and(
              eq(patientAccommodations.accommodationId, data.accommodationId),
              ne(patientAccommodations.id, data.id),
              lt(patientVisits.arrivalAt, visit.departure),
              gt(patientVisits.departureAt, visit.arrival),
            ),
          )
          .limit(1);
        if (conflicts.length)
          throw new Error(
            "This apartment is already assigned during the selected stay. Choose another apartment or leave it unassigned.",
          );
      }
      await tx
        .update(patientAccommodations)
        .set({
          accommodationId: data.accommodationId || null,
          isFree: data.isFree,
          freeDays: data.freeDays,
        })
        .where(eq(patientAccommodations.id, data.id));
    });
  } catch (error) {
    const messages = [
      "This accommodation request no longer exists.",
      "The patient visit could not be found.",
      "Choose an apartment that matches the requested type.",
      "This apartment is already assigned during the selected stay. Choose another apartment or leave it unassigned.",
    ];
    const message =
      error instanceof Error &&
      (messages.includes(error.message) ||
        error.message.startsWith("Choose between "))
        ? error.message
        : "The accommodation could not be updated. Please try again.";
    return { status: "error", message };
  }
  revalidatePath("/dashboard/accommodations");
  revalidatePath("/dashboard/patients/[id]", "page");
  return { status: "success" };
}
