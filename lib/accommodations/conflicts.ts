import "server-only";

import { and, eq, gt, lt, ne } from "drizzle-orm";

import { patientAccommodations, patientVisits } from "@/lib/db/schema";
import type { Transaction } from "@/lib/db";

// Callers lock the apartment row first, so concurrent changes cannot both pass
// this check before either commits.
export async function apartmentHasConflict(
  tx: Transaction,
  apartmentId: string,
  requestId: string,
  stay: { arrival: Date; departure: Date },
) {
  const conflicts = await tx
    .select({ id: patientAccommodations.id })
    .from(patientAccommodations)
    .innerJoin(
      patientVisits,
      eq(patientVisits.id, patientAccommodations.visitId),
    )
    .where(
      and(
        eq(patientAccommodations.accommodationId, apartmentId),
        ne(patientAccommodations.id, requestId),
        lt(patientVisits.arrivalAt, stay.departure),
        gt(patientVisits.departureAt, stay.arrival),
      ),
    )
    .limit(1);
  return conflicts.length > 0;
}
