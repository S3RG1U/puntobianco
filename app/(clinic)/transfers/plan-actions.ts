"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseRoles } from "@/lib/auth/permissions";
import { canCurrentActor as can } from "@/lib/auth/authorization";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  patientTransfers,
  patientVisits,
  transferPlans,
  transferChanges,
  visitEvents,
} from "@/lib/db/schema";
import { getI18n } from "@/lib/i18n/server";
import { clinicDay, clinicTime } from "@/lib/transfers/calendar";
import { listTransferEvents } from "@/lib/transfers/queries";
import {
  transferPlanInput,
  type TransferPlanInput,
} from "@/lib/transfers/plan-schema";
import { publishTeamEvent } from "@/lib/notifications/events";

class PlanError extends Error {}
export async function updateTransferPlan(
  input: TransferPlanInput,
): Promise<{ error?: string }> {
  const { user } = await requireSession();
  const { t } = await getI18n();
  const labels = t.transfers.details;
  if (!can(parseRoles(user.role), "transfer", "update"))
    return { error: t.backOffice.errors.pickupPermission };
  const parsed = transferPlanInput.safeParse(input);
  if (!parsed.success) return { error: labels.checkFields };
  const data = parsed.data;
  try {
    await db.transaction(async (tx) => {
      const start = new Date(data.expectedStart);
      const end = new Date(start.getTime() + 1);
      const findEvent = async () =>
        (await listTransferEvents(start, end, tx)).find(
          (e) => e.visitId === data.visitId && e.leg === data.leg,
        );
      const before = await findEvent();
      if (!before) throw new PlanError(labels.stale);
      const members = [
        ...new Set(before.memberVisitIds ?? [data.visitId]),
      ].sort();
      // All members of a shared trip move together. Consistent lock order also
      // serializes completion, patient edits, and concurrent driver changes.
      const transfers = await tx
        .select()
        .from(patientTransfers)
        .where(inArray(patientTransfers.visitId, members))
        .orderBy(asc(patientTransfers.id))
        .for("update");
      const current = await findEvent();
      if (
        !current ||
        current.revision !== data.revision ||
        JSON.stringify(
          [...(current.memberVisitIds ?? [data.visitId])].sort(),
        ) !== JSON.stringify(members)
      )
        throw new PlanError(labels.stale);
      if (data.intent === "reschedule" && current.completedAt)
        throw new PlanError(labels.reopenFirst);
      if (data.intent === "complete" && start.getTime() > Date.now())
        throw new PlanError(labels.tooEarly);
      if (
        (data.intent === "complete" && current.completedAt) ||
        (data.intent === "reopen" && !current.completedAt)
      )
        return;
      let scheduledAt = start;
      if (data.intent === "reschedule") {
        const [date, time] = data.moment!.split("T");
        const [converted] = await tx
          .select({
            at: sql<Date>`(${`${date} ${time}`}::timestamp AT TIME ZONE 'Europe/Chisinau')`.mapWith(
              patientVisits.arrivalAt,
            ),
          })
          .from(patientVisits)
          .where(eq(patientVisits.id, data.visitId));
        scheduledAt = converted.at;
        if (
          clinicDay(scheduledAt) !== date ||
          clinicTime(scheduledAt) !== time ||
          date < clinicDay(new Date())
        )
          throw new PlanError(labels.invalidDate);
      }
      if (data.intent === "reschedule")
        await tx
          .delete(visitEvents)
          .where(
            and(
              inArray(visitEvents.visitId, members),
              eq(visitEvents.type, "transfer_picked_up"),
              eq(visitEvents.leg, data.leg),
            ),
          );
      for (const transfer of transfers) {
        const [plan] = await tx
          .select()
          .from(transferPlans)
          .where(
            and(
              eq(transferPlans.transferId, transfer.id),
              eq(transferPlans.leg, data.leg),
            ),
          );
        if (data.intent === "reschedule" && plan?.completedAt)
          throw new PlanError(labels.reopenFirst);
        const values = {
          scheduledAt:
            data.intent === "reschedule"
              ? scheduledAt
              : (plan?.scheduledAt ?? null),
          pickup:
            data.intent === "reschedule" && data.pickup !== undefined
              ? data.pickup || null
              : (plan?.pickup ?? null),
          dropoff:
            data.intent === "reschedule" && data.dropoff !== undefined
              ? data.dropoff || null
              : (plan?.dropoff ?? null),
          completedAt: data.intent === "complete" ? new Date() : null,
          revision: (plan?.revision ?? 0) + 1,
        };
        await tx
          .insert(transferPlans)
          .values({ transferId: transfer.id, leg: data.leg, ...values })
          .onConflictDoUpdate({
            target: [transferPlans.transferId, transferPlans.leg],
            set: values,
          });
        await tx.insert(transferChanges).values({
          transferId: transfer.id,
          leg: data.leg,
          action: data.intent,
          previousAt: start,
          scheduledAt,
          reason: data.reason,
          pickup: values.pickup,
          dropoff: values.dropoff,
          actorId: user.id,
        });
      }
      for (const audience of ["transfer", "backOfficeCase"] as const)
        await publishTeamEvent(tx, {
          audience,
          title: "Transfer actualizat",
          message: `${current.names.join(", ")} · ${t.transfers.legs[data.leg]}`,
          href: "/transfers",
          visitId: data.visitId,
        });
    });
  } catch (error) {
    return {
      error: error instanceof PlanError ? error.message : labels.failed,
    };
  }
  revalidatePath("/transfers");
  revalidatePath("/dashboard");
  revalidatePath("/back-office");
  return {};
}
