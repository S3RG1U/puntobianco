import { commandRoute } from "@/lib/api/command-route";
import { commandResponse } from "@/lib/api/v1/responses";
import { treatmentCreate } from "@/lib/api/v1/validation/treatments";
import { createTreatment } from "@/app/(clinic)/treatments/actions";
import { toForm } from "@/lib/api/form-data";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const POST = commandRoute({
  version: "v1",
  name: "treatment-create",
  scope: "treatment:create",
  schema: treatmentCreate,
  execute: async (data) => commandResponse(await createTreatment({ status: "idle" }, toForm(data))),
});
