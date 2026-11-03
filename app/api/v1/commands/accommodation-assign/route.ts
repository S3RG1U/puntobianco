import { commandRoute } from "@/lib/api/command-route";
import { commandResponse } from "@/lib/api/v1/responses";
import { accommodationAssign } from "@/lib/api/v1/validation/accommodations";
import { updateAccommodation } from "@/app/(clinic)/accommodations/actions";
import { toForm } from "@/lib/api/form-data";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const POST = commandRoute({
  version: "v1",
  name: "accommodation-assign",
  scope: "accommodation:update",
  schema: accommodationAssign,
  execute: async (data) => commandResponse(await updateAccommodation({ status: "idle" }, toForm(data))),
});
