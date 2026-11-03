import { commandRoute } from "@/lib/api/command-route";
import { commandResponse } from "@/lib/api/v1/responses";
import { visitUpdate } from "@/lib/api/v1/validation/patients";
import { updatePatientVisit } from "@/app/(clinic)/patients/actions";
import { toForm } from "@/lib/api/form-data";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const POST = commandRoute({
  version: "v1",
  name: "visit-update",
  scope: "patient:update",
  schema: visitUpdate,
  execute: async (data) => commandResponse(await updatePatientVisit({ status: "idle" }, toForm(data))),
});
