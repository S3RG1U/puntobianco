import { z } from "zod";
import { uuid } from "./common";
import { treatmentCategoryValues } from "@/lib/db/schema";

export const treatment = z.strictObject({ name: z.string().trim().min(1).max(200), category: z.enum(treatmentCategoryValues), description: z.string().trim().max(2000), durationMinutes: z.number().int().min(5).max(600) });
export const treatmentCreate = treatment;
export const treatmentUpdate = treatment.extend({ id: uuid });
