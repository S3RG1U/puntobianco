import { apiRoute } from "@/lib/api/route";
import { listVisits } from "@/lib/patients/queries";
import { pageResponse } from "@/lib/api/v1/responses";
import { queryParameters } from "@/lib/api/v1/request";
import { visitFilters } from "@/lib/api/v1/validation/common";
export { apiOptions as OPTIONS } from "@/lib/api/route";
import { hasPermission } from "@/lib/api/permissions";

export const GET = apiRoute(
  { auditPath: "v1/visits", scope: "patient:read" },
  async (request, actor) => {
    const page = visitFilters.parse(queryParameters(request));
    const rows = await listVisits({ ...page, limit: page.limit + 1, includeMedical: hasPermission(actor, "treatment:read") });
    return { body: pageResponse(rows, page.limit) };
  },
);
