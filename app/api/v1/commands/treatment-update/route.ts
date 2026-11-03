import { commandRoute } from "@/lib/api/command-route";
import { commandResponse } from "@/lib/api/v1/responses";
import { treatmentUpdate } from "@/lib/api/v1/validation/treatments";
import { updateTreatment } from "@/app/(clinic)/treatments/actions";
import { toForm } from "@/lib/api/form-data";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const POST = commandRoute({
  version: "v1",
  name: "treatment-update",
  scope: "treatment:update",
  schema: treatmentUpdate,
  execute: async (data) => commandResponse(await updateTreatment({ status: "idle" }, toForm(data))),
});
