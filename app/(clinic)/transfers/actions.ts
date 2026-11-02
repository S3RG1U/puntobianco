"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can, parseRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  patientCompanions,
  patients,
  patientTransfers,
  patientVisits,
  visitEvents,
} from "@/lib/db/schema";
import { getI18n } from "@/lib/i18n/server";
import { publishTeamEvent } from "@/lib/notifications/events";
import { clinicDay, transferLegApplies } from "@/lib/transfers/calendar";

const pickupSchema = z.object({
  visitId: z.uuid(),
  leg: z.enum(["arrival", "departure"]),
  pickedUp: z.boolean(),
});

// Failures that are safe to show as they are.
class PickupError extends Error {}

export async function setTransferPickup(
  visitId: string,
  leg: "arrival" | "departure",
  pickedUp: boolean,
): Promise<{ error?: string }> {
  const { user } = await requireSession();
  const { t } = await getI18n();
  const errors = t.backOffice.errors;
  if (!can(parseRoles(user.role), "transfer", "update"))
    return { error: errors.pickupPermission };
  const parsed = pickupSchema.safeParse({ visitId, leg, pickedUp });
  if (!parsed.success) return { error: errors.pickupInvalid };
  const at = (visit: { arrival: Date; departure: Date }) =>
    leg === "arrival" ? visit.arrival : visit.departure;
  try {
    await db.transaction(async (tx) => {
      const [booking] = await tx
        .select({
          direction: patientTransfers.direction,
          oneWayLeg: patientTransfers.oneWayLeg,
          arrival: patientVisits.arrivalAt,
          departure: patientVisits.departureAt,
          firstName: patients.firstName,
          lastName: patients.lastName,
        })
        .from(patientTransfers)
        .innerJoin(
          patientVisits,
          eq(patientVisits.id, patientTransfers.visitId),
        )
        .innerJoin(patients, eq(patients.id, patientVisits.patientId))
        .where(eq(patientTransfers.visitId, visitId));
      if (!booking || !transferLegApplies(booking, leg))
        throw new PickupError(errors.pickupInvalid);
      if (pickedUp && clinicDay(at(booking)) > clinicDay(new Date()))
        throw new PickupError(errors.pickupTooEarly);
      // A treated companion on the same trip shares this calendar event, so
      // their own timeline needs the pickup too.
      const companions = await tx
        .select({
          visitId: patientTransfers.visitId,
          direction: patientTransfers.direction,
          oneWayLeg: patientTransfers.oneWayLeg,
          arrival: patientVisits.arrivalAt,
          departure: patientVisits.departureAt,
        })
        .from(patientCompanions)
        .innerJoin(
          patientTransfers,
          eq(patientTransfers.visitId, patientCompanions.treatmentVisitId),
        )
        .innerJoin(
          patientVisits,
          eq(patientVisits.id, patientTransfers.visitId),
        )
        .where(eq(patientCompanions.visitId, visitId));
      const visitIds = [
        visitId,
        ...companions
          .filter(
            (companion) =>
              transferLegApplies(companion, leg) &&
              at(companion).getTime() === at(booking).getTime(),
          )
          .map((companion) => companion.visitId),
      ];
      let deleted = 0;
      if (!pickedUp) {
        for (const id of visitIds)
          deleted += (await tx
            .delete(visitEvents)
            .where(
              and(
                eq(visitEvents.visitId, id),
                eq(visitEvents.type, "transfer_picked_up"),
                eq(visitEvents.leg, leg),
              ),
            ).returning({ id: visitEvents.id })).length;
        if (deleted) await publishTeamEvent(tx, {
          audience: "transfer", title: "Preluare anulată",
          message: `${booking.firstName} ${booking.lastName}`,
          href: "/transfers", visitId,
        });
        return;
      }
      const inserted = await tx
        .insert(visitEvents)
        .values(
          visitIds.map((id) => ({
            visitId: id,
            type: "transfer_picked_up" as const,
            leg,
            actorId: user.id,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: visitEvents.id });
      if (inserted.length) await publishTeamEvent(tx, {
        audience: "transfer", title: "Pacient preluat",
        message: `${booking.firstName} ${booking.lastName}`,
        href: "/transfers", visitId,
      });
      if (inserted.length)
        await publishTeamEvent(tx, {
          audience: "backOfficeCase",
          title: "Pacient preluat",
          message: `${booking.firstName} ${booking.lastName} · ${leg === "arrival" ? "Sosire" : "Plecare"}`,
          href: `/patients/${visitId}`,
          visitId,
        });
    });
  } catch (error) {
    return {
      error: error instanceof PickupError ? error.message : errors.failed,
    };
  }
  revalidatePath("/transfers");
  revalidatePath("/back-office");
  revalidatePath("/dashboard");
  revalidatePath("/(clinic)/patients/[id]", "page");
  return {};
}
