import { commandRoute } from "@/lib/api/command-route";
import { commandResponse } from "@/lib/api/v1/responses";
import { apartmentCreate } from "@/lib/api/v1/validation/accommodations";
import { createApartment } from "@/app/(clinic)/accommodations/actions";
import { toForm } from "@/lib/api/form-data";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const POST = commandRoute({
  version: "v1",
  name: "apartment-create",
  scope: "accommodation:create",
  schema: apartmentCreate,
  execute: async (data) => commandResponse(await createApartment({ status: "idle" }, toForm(data))),
});
