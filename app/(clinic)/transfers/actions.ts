"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
  transferPlans,
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
      const linked = await tx.select({ visitId: patientCompanions.treatmentVisitId })
        .from(patientCompanions).where(eq(patientCompanions.visitId, visitId));
      await tx.select({ id: patientTransfers.id }).from(patientTransfers)
        .where(inArray(patientTransfers.visitId, [visitId, ...linked.flatMap((c) => c.visitId ? [c.visitId] : [])]))
        .orderBy(asc(patientTransfers.id)).for("update");
      const plan = alias(transferPlans, "pickup_plan");
      const effectiveArrival = sql<Date>`case when ${plan.leg} = 'arrival' then coalesce(${plan.scheduledAt}, ${patientVisits.arrivalAt}) else ${patientVisits.arrivalAt} end`.mapWith(patientVisits.arrivalAt);
      const effectiveDeparture = sql<Date>`case when ${plan.leg} = 'departure' then coalesce(${plan.scheduledAt}, ${patientVisits.departureAt}) else ${patientVisits.departureAt} end`.mapWith(patientVisits.departureAt);
      const [booking] = await tx
        .select({
          direction: patientTransfers.direction,
          oneWayLeg: patientTransfers.oneWayLeg,
          arrival: effectiveArrival,
          departure: effectiveDeparture,
          firstName: patients.firstName,
          lastName: patients.lastName,
        })
        .from(patientTransfers)
        .innerJoin(
          patientVisits,
          eq(patientVisits.id, patientTransfers.visitId),
        )
        .innerJoin(patients, eq(patients.id, patientVisits.patientId))
        .leftJoin(plan, and(eq(plan.transferId, patientTransfers.id), eq(plan.leg, leg)))
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
          arrival: effectiveArrival,
          departure: effectiveDeparture,
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
        .leftJoin(plan, and(eq(plan.transferId, patientTransfers.id), eq(plan.leg, leg)))
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
