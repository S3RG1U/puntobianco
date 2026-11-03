import { commandRoute } from "@/lib/api/command-route";
import { commandResponse } from "@/lib/api/v1/responses";
import { caseTransition } from "@/lib/api/v1/validation/cases";
import { updateCase } from "@/app/(clinic)/back-office/actions";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const POST = commandRoute({
  version: "v1",
  name: "case-transition",
  scope: "backOfficeCase:update",
  schema: caseTransition,
  execute: async (data) => commandResponse(await updateCase(data.id, data.action)),
});
