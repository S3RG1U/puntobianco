import { z } from "zod";

export const uuid = z.uuid();
export const pagination = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  after: uuid.optional(),
});
export const visitFilters = pagination.extend({ patientId: uuid.optional() });
export const coordinatorFilters = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  after: z.string().min(1).max(200).optional(),
});
export const transferRange = z.strictObject({
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
});
