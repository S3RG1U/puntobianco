import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { treatments } from "@/lib/db/schema";

export const listTreatmentOptions = () =>
  db
    .select({ name: treatments.name, category: treatments.category })
    .from(treatments)
    .orderBy(asc(treatments.name));
