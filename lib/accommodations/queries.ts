import "server-only";
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import type { QueryOptions } from "@/lib/db/query-options";
import { accommodations, patientAccommodations } from "@/lib/db/schema";

export function listApartments({ id, after, limit }: QueryOptions) {
  return db.select().from(accommodations).where(and(
    id ? eq(accommodations.id, id) : undefined,
    after ? gt(accommodations.id, after) : undefined,
  )).orderBy(asc(accommodations.id)).limit(limit);
}

export function listAccommodationRequests({ id, after, limit }: QueryOptions) {
  return db.select().from(patientAccommodations).where(and(
    id ? eq(patientAccommodations.id, id) : undefined,
    after ? gt(patientAccommodations.id, after) : undefined,
  )).orderBy(asc(patientAccommodations.id)).limit(limit);
}

export async function getVisitAccommodation(visitId: string) {
  const [request] = await db.select({
    id: patientAccommodations.id,
    apartmentType: patientAccommodations.apartmentType,
    isFree: patientAccommodations.isFree,
    freeDays: patientAccommodations.freeDays,
    accommodationId: patientAccommodations.accommodationId,
    status: patientAccommodations.status,
    reservedAt: patientAccommodations.reservedAt,
  }).from(patientAccommodations).where(eq(patientAccommodations.visitId, visitId)).limit(1);
  return request ?? null;
}
