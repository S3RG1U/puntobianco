import { commandRoute } from "@/lib/api/command-route";
import { commandResponse } from "@/lib/api/v1/responses";
import { registration } from "@/lib/api/v1/validation/patients";
import { createPatientRegistration } from "@/app/(clinic)/patients/actions";
import { toForm } from "@/lib/api/form-data";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const POST = commandRoute({
  version: "v1",
  name: "registrations",
  scope: "patient:create",
  schema: registration,
  execute: async (data) => commandResponse(await createPatientRegistration({ status: "idle" }, toForm(data))),
});
