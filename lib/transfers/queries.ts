import "server-only";

import { and, asc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  accommodations,
  patientAccommodations,
  patientTransfers,
  patientVisits,
  patients,
  patientCompanions,
  visitEvents,
  transferPlans,
  transferChanges,
  users,
} from "@/lib/db/schema";
import { transferCalendarEvents } from "@/lib/transfers/calendar";

export async function listTransferEvents(
  start: Date,
  end: Date,
  database: Pick<typeof db, "select"> = db,
) {
  const arrivalPlan = alias(transferPlans, "arrival_plan");
  const departurePlan = alias(transferPlans, "departure_plan");
  const arrivalAt =
    sql<Date>`coalesce(${arrivalPlan.scheduledAt}, ${patientVisits.arrivalAt})`.mapWith(
      patientVisits.arrivalAt,
    );
  const departureAt =
    sql<Date>`coalesce(${departurePlan.scheduledAt}, ${patientVisits.departureAt})`.mapWith(
      patientVisits.departureAt,
    );
  const rows = await database
    .select({
      id: patientTransfers.id,
      visitId: patientVisits.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      arrival: arrivalAt,
      departure: departureAt,
      direction: patientTransfers.direction,
      oneWayLeg: patientTransfers.oneWayLeg,
      arrivalPlan,
      departurePlan,
      apartmentName: accommodations.name,
      apartmentAddress: accommodations.address,
    })
    .from(patientTransfers)
    .innerJoin(patientVisits, eq(patientVisits.id, patientTransfers.visitId))
    .innerJoin(patients, eq(patients.id, patientVisits.patientId))
    .leftJoin(
      arrivalPlan,
      and(
        eq(arrivalPlan.transferId, patientTransfers.id),
        eq(arrivalPlan.leg, "arrival"),
      ),
    )
    .leftJoin(
      departurePlan,
      and(
        eq(departurePlan.transferId, patientTransfers.id),
        eq(departurePlan.leg, "departure"),
      ),
    )
    .leftJoin(
      patientAccommodations,
      eq(patientAccommodations.visitId, patientVisits.id),
    )
    .leftJoin(
      accommodations,
      eq(accommodations.id, patientAccommodations.accommodationId),
    )
    .where(
      or(
        and(gte(arrivalAt, start), lt(arrivalAt, end)),
        and(gte(departureAt, start), lt(departureAt, end)),
      ),
    );
  if (!rows.length) return [];
  const ids = rows.map((r) => r.visitId);
  const companionVisits = alias(patientVisits, "companion_visits");
  const childArrival = alias(transferPlans, "child_arrival");
  const childDeparture = alias(transferPlans, "child_departure");
  const childTransfers = alias(patientTransfers, "child_transfers");
  const companions = await database
    .select({
      visitId: patientCompanions.visitId,
      treatmentVisitId: patientCompanions.treatmentVisitId,
      arrival:
        sql<Date | null>`coalesce(${childArrival.scheduledAt}, ${companionVisits.arrivalAt})`.mapWith(
          companionVisits.arrivalAt,
        ),
      departure:
        sql<Date | null>`coalesce(${childDeparture.scheduledAt}, ${companionVisits.departureAt})`.mapWith(
          companionVisits.departureAt,
        ),
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(patientCompanions)
    .innerJoin(patients, eq(patients.id, patientCompanions.patientId))
    .leftJoin(
      companionVisits,
      eq(companionVisits.id, patientCompanions.treatmentVisitId),
    )
    .leftJoin(childTransfers, eq(childTransfers.visitId, companionVisits.id))
    .leftJoin(
      childArrival,
      and(
        eq(childArrival.transferId, childTransfers.id),
        eq(childArrival.leg, "arrival"),
      ),
    )
    .leftJoin(
      childDeparture,
      and(
        eq(childDeparture.transferId, childTransfers.id),
        eq(childDeparture.leg, "departure"),
      ),
    )
    .where(inArray(patientCompanions.visitId, ids));
  const pickups = await database
    .select({ visitId: visitEvents.visitId, leg: visitEvents.leg })
    .from(visitEvents)
    .where(
      and(
        eq(visitEvents.type, "transfer_picked_up"),
        inArray(visitEvents.visitId, ids),
      ),
    );
  const history = await database
    .select({
      id: transferChanges.id,
      transferId: transferChanges.transferId,
      leg: transferChanges.leg,
      action: transferChanges.action,
      previousAt: transferChanges.previousAt,
      scheduledAt: transferChanges.scheduledAt,
      reason: transferChanges.reason,
      actor: users.name,
      occurredAt: transferChanges.occurredAt,
    })
    .from(transferChanges)
    .leftJoin(users, eq(users.id, transferChanges.actorId))
    .where(
      inArray(
        transferChanges.transferId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(transferChanges.occurredAt));
  const pickedUp = new Set(pickups.map((p) => `${p.visitId}:${p.leg}`));
  return transferCalendarEvents(rows, companions, start, end).map((event) => {
    const booking = rows.find((r) => r.visitId === event.visitId)!;
    const plan =
      event.leg === "arrival" ? booking.arrivalPlan : booking.departurePlan;
    const apartment = booking.apartmentName
      ? { name: booking.apartmentName, address: booking.apartmentAddress ?? "" }
      : null;
    const address = apartment
      ? [apartment.name, apartment.address].filter(Boolean).join(" · ")
      : null;
    return {
      ...event,
      revision: plan?.revision ?? 0,
      completedAt: plan?.completedAt?.toISOString() ?? null,
      pickup: plan?.pickup || (event.leg === "departure" ? address : null),
      dropoff: plan?.dropoff || (event.leg === "arrival" ? address : null),
      apartment,
      otherApartments: [
        ...new Map(
          rows
            .filter(
              (r) =>
                r.visitId !== event.visitId &&
                event.memberVisitIds?.includes(r.visitId) &&
                r.apartmentName &&
                r.apartmentName !== booking.apartmentName,
            )
            .map((r) => [
              r.apartmentName!,
              { name: r.apartmentName!, address: r.apartmentAddress ?? "" },
            ]),
        ).values(),
      ],
      pickedUp: pickedUp.has(`${event.visitId}:${event.leg}`),
      history: history
        .filter((h) => h.transferId === booking.id && h.leg === event.leg)
        .map((h) => ({
          id: h.id,
          action: h.action,
          previousAt: h.previousAt.toISOString(),
          scheduledAt: h.scheduledAt.toISOString(),
          reason: h.reason,
          actor: h.actor,
          occurredAt: h.occurredAt.toISOString(),
        })),
    };
  });
}
