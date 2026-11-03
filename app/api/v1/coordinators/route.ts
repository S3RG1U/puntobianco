import { apiRoute } from "@/lib/api/route";
import { authorize } from "@/lib/api/permissions";
import { listActiveCoordinators } from "@/lib/patients/queries";
import { coordinatorFilters } from "@/lib/api/v1/validation/common";
import { queryParameters } from "@/lib/api/v1/request";
import { pageResponse } from "@/lib/api/v1/responses";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const GET = apiRoute({ auditPath: "v1/coordinators" }, async (request, actor) => {
  try { authorize(actor, "patient:create"); }
  catch { authorize(actor, "patient:update"); }
  const page = coordinatorFilters.parse(queryParameters(request));
  const rows = await listActiveCoordinators({ ...page, limit: page.limit + 1 });
  return { body: pageResponse(rows, page.limit) };
});
