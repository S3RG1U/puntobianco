import { commandRoute } from "@/lib/api/command-route";
import { commandResponse } from "@/lib/api/v1/responses";
import { transferPickup } from "@/lib/api/v1/validation/transfers";
import { setTransferPickup } from "@/app/(clinic)/transfers/actions";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const POST = commandRoute({
  version: "v1",
  name: "transfer-pickup",
  scope: "transfer:update",
  schema: transferPickup,
  execute: async (data) => commandResponse(await setTransferPickup(data.visitId, data.leg, data.pickedUp)),
});
