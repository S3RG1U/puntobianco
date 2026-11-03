import { z } from "zod";
import { uuid } from "./common";
import { apartmentValues } from "@/lib/patients/form-schema";

export const apartmentCreate = z.strictObject({ name: z.string().trim().min(1).max(200), address: z.string().trim().min(1).max(500), apartmentType: z.enum(apartmentValues) });
export const apartmentAddress = z.strictObject({ id: uuid, address: z.string().trim().min(1).max(500) });
export const accommodationAssign = z.strictObject({ id: uuid, accommodationId: uuid.nullable(), isFree: z.boolean(), freeDays: z.number().int().min(0).max(3650) });
