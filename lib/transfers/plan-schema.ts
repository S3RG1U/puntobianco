import { z } from "zod";

export const transferPlanInput = z
  .object({
    visitId: z.uuid(),
    leg: z.enum(["arrival", "departure"]),
    expectedStart: z.iso.datetime({ offset: true }),
    revision: z.number().int().min(0),
    intent: z.enum(["reschedule", "complete", "reopen"]),
    moment: z.string().optional(),
    reason: z.string().trim().max(1000).default(""),
    pickup: z.string().trim().max(500).optional(),
    dropoff: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.intent !== "reschedule") return;
    const [date, time] = (data.moment ?? "").split("T");
    if (
      data.moment !== `${date}T${time}` ||
      !z.iso.date().safeParse(date).success ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time ?? "")
    )
      ctx.addIssue({ code: "custom", path: ["moment"], message: "invalid" });
    if (!data.reason)
      ctx.addIssue({ code: "custom", path: ["reason"], message: "required" });
  });
export type TransferPlanInput = z.input<typeof transferPlanInput>;
