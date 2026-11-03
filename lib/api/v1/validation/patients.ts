import { z } from "zod";
import { registrationSchema, visitSchema } from "@/lib/patients/form-schema";
import { uuid } from "./common";

export const strictVisit = visitSchema.safeExtend({
  coordinatorId: z.string().min(1).max(200),
  accommodation: visitSchema.shape.accommodation.unwrap().safeExtend({ freeDays: z.number().int().min(0).max(3650) }).strict().optional(),
  transfer: visitSchema.shape.transfer.unwrap().strict().optional(),
}).strict();
export const registration = registrationSchema.safeExtend({ patient: strictVisit,
  companion: z.strictObject({ firstName: z.string().trim().min(1).max(200), lastName: z.string().trim().min(1).max(200), visit: strictVisit.optional() }).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.companion?.visit && (data.companion.firstName !== data.companion.visit.firstName || data.companion.lastName !== data.companion.visit.lastName))
    ctx.addIssue({ code: "custom", path: ["companion", "visit"], message: "Companion identity must match." });
});
export const visitUpdate = z.strictObject({ id: uuid, patient: strictVisit });
