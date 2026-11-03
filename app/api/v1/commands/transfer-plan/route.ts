import { commandRoute } from "@/lib/api/command-route";
import { commandResponse } from "@/lib/api/v1/responses";
import { transferPlan } from "@/lib/api/v1/validation/transfers";
import { updateTransferPlan } from "@/app/(clinic)/transfers/plan-actions";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const POST = commandRoute({
  version: "v1",
  name: "transfer-plan",
  scope: "transfer:update",
  schema: transferPlan,
  execute: async (data) => commandResponse(await updateTransferPlan(data)),
});
