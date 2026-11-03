import "server-only";
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import type { QueryOptions } from "@/lib/db/query-options";
import { patientVisits } from "@/lib/db/schema";

export function listCases({ id, after, limit }: QueryOptions) {
  return db.select({
    id: patientVisits.id,
    patientId: patientVisits.patientId,
    arrivalAt: patientVisits.arrivalAt,
    departureAt: patientVisits.departureAt,
    status: patientVisits.backOfficeStatus,
    assigneeId: patientVisits.backOfficeAssigneeId,
    startedAt: patientVisits.backOfficeStartedAt,
    completedAt: patientVisits.backOfficeCompletedAt,
  }).from(patientVisits).where(and(
    id ? eq(patientVisits.id, id) : undefined,
    after ? gt(patientVisits.id, after) : undefined,
  )).orderBy(asc(patientVisits.id)).limit(limit);
}
