import { commandRoute } from "@/lib/api/command-route";
import { commandResponse } from "@/lib/api/v1/responses";
import { apartmentAddress } from "@/lib/api/v1/validation/accommodations";
import { updateApartmentAddress } from "@/app/(clinic)/accommodations/actions";
import { toForm } from "@/lib/api/form-data";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const POST = commandRoute({
  version: "v1",
  name: "apartment-address",
  scope: "accommodation:update",
  schema: apartmentAddress,
  execute: async (data) => commandResponse(await updateApartmentAddress({ status: "idle" }, toForm(data))),
});
