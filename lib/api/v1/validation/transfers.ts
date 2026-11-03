import { z } from "zod";
import { uuid } from "./common";
import { transferPlanInput } from "@/lib/transfers/plan-schema";

export const transferPickup = z.strictObject({ visitId: uuid, leg: z.enum(["arrival", "departure"]), pickedUp: z.boolean() });
export const transferPlan = transferPlanInput.strict();
