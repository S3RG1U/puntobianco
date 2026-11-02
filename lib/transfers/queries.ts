import "server-only";

import { and, eq, gte, inArray, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db";
import {
  patientTransfers,
  patientVisits,
  patients,
  patientCompanions,
  visitEvents,
} from "@/lib/db/schema";
import { transferCalendarEvents } from "@/lib/transfers/calendar";

export async function listTransferEvents(start: Date, end: Date) {
  const rows = await db
    .select({
      id: patientTransfers.id,
      visitId: patientVisits.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      arrival: patientVisits.arrivalAt,
      departure: patientVisits.departureAt,
      direction: patientTransfers.direction,
      oneWayLeg: patientTransfers.oneWayLeg,
    })
    .from(patientTransfers)
    .innerJoin(patientVisits, eq(patientVisits.id, patientTransfers.visitId))
    .innerJoin(patients, eq(patients.id, patientVisits.patientId))
    .where(
      or(
        and(
          gte(patientVisits.arrivalAt, start),
          lt(patientVisits.arrivalAt, end),
        ),
        and(
          gte(patientVisits.departureAt, start),
          lt(patientVisits.departureAt, end),
        ),
      ),
    );
  const companionVisits = alias(patientVisits, "companion_transfer_visits");
  const companions = rows.length
    ? await db
        .select({
          visitId: patientCompanions.visitId,
          treatmentVisitId: patientCompanions.treatmentVisitId,
          arrival: companionVisits.arrivalAt,
          departure: companionVisits.departureAt,
          firstName: patients.firstName,
          lastName: patients.lastName,
        })
        .from(patientCompanions)
        .innerJoin(patients, eq(patients.id, patientCompanions.patientId))
        .leftJoin(
          companionVisits,
          eq(companionVisits.id, patientCompanions.treatmentVisitId),
        )
        .where(
          inArray(
            patientCompanions.visitId,
            rows.map((r) => r.visitId),
          ),
        )
    : [];
  const pickups = rows.length
    ? await db
        .select({ visitId: visitEvents.visitId, leg: visitEvents.leg })
        .from(visitEvents)
        .where(
          and(
            eq(visitEvents.type, "transfer_picked_up"),
            inArray(
              visitEvents.visitId,
              rows.map((r) => r.visitId),
            ),
          ),
        )
    : [];
  const pickedUp = new Set(pickups.map((p) => `${p.visitId}:${p.leg}`));
  return transferCalendarEvents(rows, companions, start, end).map((event) => ({
    ...event,
    pickedUp: pickedUp.has(`${event.visitId}:${event.leg}`),
  }));
}
