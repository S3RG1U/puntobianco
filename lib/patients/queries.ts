import "server-only";
import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { QueryOptions } from "@/lib/db/query-options";
import { patients, patientVisits, patientCompanions, users } from "@/lib/db/schema";

export function listPatients({ id, after, limit }: QueryOptions) {
  return db.select({
    id: patients.id,
    firstName: patients.firstName,
    lastName: patients.lastName,
    createdAt: patients.createdAt,
  }).from(patients).where(and(
    id ? eq(patients.id, id) : undefined,
    after ? gt(patients.id, after) : undefined,
  )).orderBy(asc(patients.id)).limit(limit);
}

export function listVisits({ id, after, limit, patientId, includeMedical }: QueryOptions & {
  patientId?: string;
  includeMedical: boolean;
}) {
  return db.select({
    id: patientVisits.id,
    patientId: patientVisits.patientId,
    coordinatorId: patientVisits.coordinatorId,
    arrivalAt: patientVisits.arrivalAt,
    departureAt: patientVisits.departureAt,
    ...(includeMedical ? {
      treatment: patientVisits.treatment,
      treatmentNotes: patientVisits.treatmentNotes,
      availabilityNotes: patientVisits.availabilityNotes,
    } : {}),
  }).from(patientVisits).where(and(
    id ? eq(patientVisits.id, id) : undefined,
    after ? gt(patientVisits.id, after) : undefined,
    patientId ? eq(patientVisits.patientId, patientId) : undefined,
  )).orderBy(asc(patientVisits.id)).limit(limit);
}

export function listVisitCompanions(visitId: string) {
  return db.select({
    patientId: patientCompanions.patientId,
    treatmentVisitId: patientCompanions.treatmentVisitId,
  }).from(patientCompanions).where(eq(patientCompanions.visitId, visitId));
}

export function listActiveCoordinators({ after, limit }: Omit<QueryOptions, "id">) {
  return db.select({ id: users.id, name: users.name }).from(users).where(and(
    or(eq(users.banned, false), isNull(users.banned)),
    sql`string_to_array(replace(${users.role}, ' ', ''), ',') @> ARRAY['treatmentCoordinator']::text[]`,
    after ? gt(users.id, after) : undefined,
  )).orderBy(asc(users.id)).limit(limit);
}
