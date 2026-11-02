import "server-only";

import { asc, eq, inArray } from "drizzle-orm";

import { can, type RoleName } from "@/lib/auth/permissions";
import { db, type Transaction } from "@/lib/db";
import { accommodations, users, visitEvents } from "@/lib/db/schema";

type VisitEventType = (typeof visitEvents.$inferSelect)["type"];

export type VisitEventView = {
  id: string;
  type: VisitEventType;
  leg: "arrival" | "departure" | null;
  apartmentName: string | null;
  actorName: string | null;
  occurredAt: Date;
};

export async function recordVisitEvent(
  tx: Transaction,
  event: typeof visitEvents.$inferInsert,
) {
  await tx.insert(visitEvents).values(event);
}

export async function recordApartmentChange(
  tx: Transaction,
  change: {
    visitId: string;
    from: string | null;
    to: string | null;
    actorId: string;
  },
) {
  const { visitId, from, to, actorId } = change;
  if (from === to) return;
  const events = [
    { apartmentId: from, type: "apartment_released" as const },
    { apartmentId: to, type: "apartment_assigned" as const },
  ];
  for (const { apartmentId, type } of events) {
    if (!apartmentId) continue;
    const [apartment] = await tx
      .select({ name: accommodations.name })
      .from(accommodations)
      .where(eq(accommodations.id, apartmentId));
    await recordVisitEvent(tx, {
      visitId,
      type,
      apartmentName: apartment?.name,
      actorId,
    });
  }
}

// Each event type is visible to the roles that can read the matching module.
const readableBy = {
  registered: "patient",
  patient_updated: "patient",
  case_started: "backOfficeCase",
  case_completed: "backOfficeCase",
  apartment_assigned: "accommodation",
  apartment_released: "accommodation",
  transfer_picked_up: "transfer",
} as const satisfies Record<VisitEventType, string>;

export async function listVisitEvents(visitIds: string[], roles: RoleName[]) {
  const timelines = new Map<string, VisitEventView[]>();
  if (!visitIds.length) return timelines;
  const rows = await db
    .select({
      visitId: visitEvents.visitId,
      id: visitEvents.id,
      type: visitEvents.type,
      leg: visitEvents.leg,
      apartmentName: visitEvents.apartmentName,
      actorName: users.name,
      occurredAt: visitEvents.occurredAt,
    })
    .from(visitEvents)
    .leftJoin(users, eq(users.id, visitEvents.actorId))
    .where(inArray(visitEvents.visitId, visitIds))
    .orderBy(asc(visitEvents.occurredAt), asc(visitEvents.id));
  for (const { visitId, ...event } of rows) {
    if (!can(roles, readableBy[event.type], "read")) continue;
    timelines.set(visitId, [...(timelines.get(visitId) ?? []), event]);
  }
  return timelines;
}
