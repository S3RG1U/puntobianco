import "server-only";
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import type { QueryOptions } from "@/lib/db/query-options";
import { treatments } from "@/lib/db/schema";

export function listTreatments({ id, after, limit }: QueryOptions) {
  return db.select().from(treatments).where(and(
    id ? eq(treatments.id, id) : undefined,
    after ? gt(treatments.id, after) : undefined,
  )).orderBy(asc(treatments.id)).limit(limit);
}
