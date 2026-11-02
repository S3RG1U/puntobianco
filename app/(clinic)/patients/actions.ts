"use server";

import { publishTeamEvent } from "@/lib/notifications/events";
import {
  recordApartmentChange,
  recordVisitEvent,
} from "@/lib/patients/visit-events";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { apartmentHasConflict } from "@/lib/accommodations/conflicts";
import { revalidatePath } from "next/cache";
import { can, parseRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { db, type Transaction } from "@/lib/db";
import {
  patients,
  visitEvents,
  patientVisits,
  patientCompanions,
  patientAccommodations,
  patientTransfers,
  accommodations,
  users,
} from "@/lib/db/schema";
import {
  readVisit,
  registrationSchema,
  personNameSchema,
  stayDays,
  visitSchema,
  type FormState,
  type VisitInput,
} from "@/lib/patients/form-schema";
import { fieldErrors } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";

const localTimestamp = (date: string, time: string) =>
  sql`(${`${date} ${time}`}::timestamp AT TIME ZONE 'Europe/Chisinau')`;

// Failures that are safe to show as they are.
class PatientError extends Error {}

async function requireActiveCoordinator(
  tx: Transaction,
  coordinatorId: string,
  message: string,
) {
  const [coordinator] = await tx
    .select()
    .from(users)
    .where(eq(users.id, coordinatorId))
    .for("share");
  if (
    !coordinator ||
    coordinator.banned ||
    !parseRoles(coordinator.role).includes("treatmentCoordinator")
  )
    throw new PatientError(message);
}

export async function createPatientRegistration(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireSession();
  const { t } = await getI18n();
  if (!can(parseRoles(user.role), "patient", "create"))
    return {
      status: "error",
      message: t.patients.errors.permission,
    };
  const companionName = {
    firstName: String(form.get("companion.firstName") ?? ""),
    lastName: String(form.get("companion.lastName") ?? ""),
  };
  const parsed = registrationSchema.safeParse({
    patient: readVisit(form, "patient"),
    companion:
      form.get("hasCompanion") === "on"
        ? {
            ...companionName,
            visit:
              form.get("companionTreatment") === "on"
                ? { ...readVisit(form, "companion.visit"), ...companionName }
                : undefined,
          }
        : undefined,
  });
  if (!parsed.success)
    return {
      status: "error",
      message: t.patients.errors.checkFields,
      errors: fieldErrors(t, parsed.error.issues),
    };

  try {
    const id = await db.transaction(async (tx) => {
      async function createVisit(data: VisitInput, patientId: string) {
        await requireActiveCoordinator(
          tx,
          data.coordinatorId,
          t.patients.errors.coordinatorUnavailable,
        );
        const [visit] = await tx
          .insert(patientVisits)
          .values({
            patientId,
            coordinatorId: data.coordinatorId,
            arrivalAt: localTimestamp(data.arrivalDate, data.arrivalTime),
            departureAt: localTimestamp(data.departureDate, data.departureTime),
            availabilityNotes: data.availabilityNotes,
            treatment: data.treatment,
          })
          .returning({ id: patientVisits.id });
        await recordVisitEvent(tx, {
          visitId: visit.id,
          type: "registered",
          actorId: user.id,
        });
        if (data.accommodation)
          await tx
            .insert(patientAccommodations)
            .values({ visitId: visit.id, ...data.accommodation });
        if (data.transfer)
          await tx
            .insert(patientTransfers)
            .values({ visitId: visit.id, ...data.transfer });
        const name = `${data.firstName} ${data.lastName}`;
        await publishTeamEvent(tx, {
          audience: "patient",
          title: "Pacient înregistrat",
          message: name,
          href: `/patients/${visit.id}`,
          visitId: visit.id,
        });
        await publishTeamEvent(
          tx,
          {
            audience: "backOfficeCase",
            title: "Caz nou · Back office",
            message: `${name} · Sosire ${data.arrivalDate} ${data.arrivalTime}`,
            href: "/back-office",
            visitId: visit.id,
          },
          true,
        );
        if (data.accommodation)
          await publishTeamEvent(
            tx,
            {
              audience: "accommodation",
              title: "Cerere cazare · Neprelucrat",
              message: `${name} · ${data.arrivalDate} – ${data.departureDate}`,
              href: "/accommodations",
              visitId: visit.id,
            },
            true,
          );
        if (data.transfer)
          await publishTeamEvent(
            tx,
            {
              audience: "transfer",
              title: "Transfer nou",
              message: `${name} · ${data.transfer.direction === "round_trip" ? "Sosire și plecare" : data.transfer.oneWayLeg === "departure" ? "Plecare" : "Sosire"}`,
              href: "/transfers",
              visitId: visit.id,
            },
            true,
          );
        return visit.id;
      }
      const data = parsed.data;
      const [patient] = await tx
        .insert(patients)
        .values({
          firstName: data.patient.firstName,
          lastName: data.patient.lastName,
        })
        .returning({ id: patients.id });
      const visitId = await createVisit(data.patient, patient.id);
      if (data.companion) {
        const [companion] = await tx
          .insert(patients)
          .values({
            firstName: data.companion.firstName,
            lastName: data.companion.lastName,
          })
          .returning({ id: patients.id });
        const treatmentVisitId = data.companion.visit
          ? await createVisit(data.companion.visit, companion.id)
          : null;
        await tx
          .insert(patientCompanions)
          .values({ visitId, patientId: companion.id, treatmentVisitId });
      }
      return visitId;
    });
    revalidatePath("/patients");
    revalidatePath("/accommodations");
    revalidatePath("/back-office");
    revalidatePath("/transfers");
    revalidatePath("/dashboard");
    return { status: "success", id };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof PatientError
          ? error.message
          : t.patients.errors.saveFailed,
    };
  }
}

export async function updatePatientVisit(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireSession();
  const { t } = await getI18n();
  const errors = t.patients.errors;
  const roles = parseRoles(user.role);
  if (!can(roles, "patient", "update"))
    return { status: "error", message: errors.updatePermission };
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { status: "error", message: errors.gone };
  const parsed = visitSchema.safeParse(readVisit(form, "patient"));
  if (!parsed.success)
    return {
      status: "error",
      message: errors.checkFields,
      errors: fieldErrors(t, parsed.error.issues, "patient."),
    };
  const data = parsed.data;
  const visitId = id.data;
  // Companions who only accompany have no visit of their own, just a name. Only
  // those linked to this visit can be changed, whatever the form sends.
  const companions = (
    await db
      .select({
        patientId: patientCompanions.patientId,
        treatmentVisitId: patientCompanions.treatmentVisitId,
      })
      .from(patientCompanions)
      .where(eq(patientCompanions.visitId, visitId))
  ).filter(
    ({ patientId, treatmentVisitId }) =>
      !treatmentVisitId && form.has(`companions.${patientId}.firstName`),
  );
  const companionNames = companions.map(({ patientId }) => ({
    patientId,
    prefix: `companions.${patientId}.`,
    parsed: personNameSchema.safeParse({
      firstName: form.get(`companions.${patientId}.firstName`),
      lastName: form.get(`companions.${patientId}.lastName`),
    }),
  }));
  const invalidCompanions = companionNames.flatMap(({ parsed, prefix }) =>
    parsed.success ? [] : [fieldErrors(t, parsed.error.issues, prefix)],
  );
  if (invalidCompanions.length)
    return {
      status: "error",
      message: errors.checkFields,
      errors: Object.assign({}, ...invalidCompanions),
    };
  try {
    await db.transaction(async (tx) => {
      // Assigning an apartment locks the request first, then reads the visit
      // dates, so taking the same lock here keeps both changes in order.
      const [request] = await tx
        .select()
        .from(patientAccommodations)
        .where(eq(patientAccommodations.visitId, visitId))
        .for("update");
      const [current] = await tx
        .select()
        .from(patientVisits)
        .where(eq(patientVisits.id, visitId))
        .for("update");
      if (!current) throw new PatientError(errors.gone);
      if (data.coordinatorId !== current.coordinatorId) {
        await requireActiveCoordinator(
          tx,
          data.coordinatorId,
          errors.coordinatorUnavailable,
        );
      }
      await tx
        .update(patients)
        .set({ firstName: data.firstName, lastName: data.lastName })
        .where(eq(patients.id, current.patientId));
      for (const { patientId, parsed } of companionNames)
        if (parsed.success)
          await tx
            .update(patients)
            .set(parsed.data)
            .where(eq(patients.id, patientId));
      const [stay] = await tx
        .update(patientVisits)
        .set({
          coordinatorId: data.coordinatorId,
          arrivalAt: localTimestamp(data.arrivalDate, data.arrivalTime),
          departureAt: localTimestamp(data.departureDate, data.departureTime),
          availabilityNotes: data.availabilityNotes,
          // Each section only changes for roles allowed to update it.
          treatment: can(roles, "treatment", "update")
            ? data.treatment
            : current.treatment,
        })
        .where(eq(patientVisits.id, visitId))
        .returning({
          arrival: patientVisits.arrivalAt,
          departure: patientVisits.departureAt,
        });
      const datesChanged =
        stay.arrival.getTime() !== current.arrivalAt.getTime() ||
        stay.departure.getTime() !== current.departureAt.getTime();

      const accommodation = can(roles, "accommodation", "update")
        ? data.accommodation
        : request && {
            apartmentType: request.apartmentType,
            isFree: request.isFree,
            freeDays: request.freeDays,
          };
      if (
        accommodation &&
        accommodation.freeDays > stayDays(data.arrivalDate, data.departureDate)
      )
        throw new PatientError(t.validation.freeDaysRange);
      if (!accommodation) {
        if (request)
          await tx
            .delete(patientAccommodations)
            .where(eq(patientAccommodations.id, request.id));
      } else if (!request) {
        await tx
          .insert(patientAccommodations)
          .values({ visitId, ...accommodation });
      } else {
        // An apartment of another type can't stay assigned to this request.
        const keepsApartment =
          request.accommodationId !== null &&
          request.apartmentType === accommodation.apartmentType;
        if (keepsApartment && datesChanged) {
          await tx
            .select({ id: accommodations.id })
            .from(accommodations)
            .where(eq(accommodations.id, request.accommodationId!))
            .for("update");
          if (
            await apartmentHasConflict(
              tx,
              request.accommodationId!,
              request.id,
              stay,
            )
          )
            throw new PatientError(errors.apartmentConflict);
        }
        await tx
          .update(patientAccommodations)
          .set({
            ...accommodation,
            ...(keepsApartment
              ? {}
              : {
                  accommodationId: null,
                  status: "unprocessed" as const,
                  reservedAt: null,
                }),
          })
          .where(eq(patientAccommodations.id, request.id));
      }

      const [existingTransfer] = await tx
        .select()
        .from(patientTransfers)
        .where(eq(patientTransfers.visitId, visitId))
        .for("update");
      const transfer = can(roles, "transfer", "update")
        ? data.transfer
        : existingTransfer && {
            isFree: existingTransfer.isFree,
            direction: existingTransfer.direction,
            oneWayLeg: existingTransfer.oneWayLeg,
          };
      if (!transfer) {
        if (existingTransfer)
          await tx
            .delete(patientTransfers)
            .where(eq(patientTransfers.id, existingTransfer.id));
      } else if (existingTransfer) {
        await tx
          .update(patientTransfers)
          .set(transfer)
          .where(eq(patientTransfers.id, existingTransfer.id));
      } else {
        await tx.insert(patientTransfers).values({ visitId, ...transfer });
      }

      // Pickup belongs to the scheduled leg, so changing it resets its status.
      for (const leg of ["arrival", "departure"] as const) {
        const scheduledAt = leg === "arrival" ? stay.arrival : stay.departure;
        const previousAt = leg === "arrival" ? current.arrivalAt : current.departureAt;
        if (!transfer || !existingTransfer ||
          scheduledAt.getTime() !== previousAt.getTime() ||
          (transfer.direction === "one_way" && transfer.oneWayLeg !== leg)) {
          await tx.delete(visitEvents).where(and(
            eq(visitEvents.visitId, visitId),
            eq(visitEvents.type, "transfer_picked_up"),
            eq(visitEvents.leg, leg),
          ));
        }
      }

      await recordVisitEvent(tx, {
        visitId,
        type: "patient_updated",
        actorId: user.id,
      });
      if (
        request?.accommodationId &&
        request.apartmentType !== accommodation?.apartmentType
      )
        await recordApartmentChange(tx, {
          visitId,
          from: request.accommodationId,
          to: null,
          actorId: user.id,
        });

      const name = `${data.firstName} ${data.lastName}`;
      await publishTeamEvent(tx, {
        audience: "patient",
        title: "Pacient actualizat",
        message: name,
        href: `/patients/${visitId}`,
        visitId,
      });
      const accommodationChanged =
        datesChanged ||
        !request !== !accommodation ||
        request?.apartmentType !== accommodation?.apartmentType;
      if ((request || accommodation) && accommodationChanged)
        await publishTeamEvent(tx, {
          audience: "accommodation",
          title: "Cazare · Actualizată",
          message: `${name} · ${data.arrivalDate} – ${data.departureDate}`,
          href: "/accommodations",
          visitId,
        });
      const transferChanged =
        datesChanged ||
        !existingTransfer !== !transfer ||
        existingTransfer?.direction !== transfer?.direction ||
        existingTransfer?.oneWayLeg !== transfer?.oneWayLeg;
      if ((existingTransfer || transfer) && transferChanged)
        await publishTeamEvent(tx, {
          audience: "transfer",
          title: "Transfer actualizat",
          message: `${name} · ${data.arrivalDate} – ${data.departureDate}`,
          href: "/transfers",
          visitId,
        });
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof PatientError ? error.message : errors.updateFailed,
    };
  }
  revalidatePath("/patients");
  revalidatePath("/(clinic)/patients/[id]", "page");
  revalidatePath("/accommodations");
  revalidatePath("/back-office");
  revalidatePath("/transfers");
  revalidatePath("/dashboard");
  return { status: "success", id: visitId };
}
