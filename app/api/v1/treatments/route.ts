import { apiRoute } from "@/lib/api/route";
import { listTreatments } from "@/lib/treatments/queries";
import { pageResponse } from "@/lib/api/v1/responses";
import { queryParameters } from "@/lib/api/v1/request";
import { pagination } from "@/lib/api/v1/validation/common";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const GET = apiRoute(
  { auditPath: "v1/treatments", scope: "treatment:read" },
  async (request) => {
    const page = pagination.parse(queryParameters(request));
    const rows = await listTreatments({ ...page, limit: page.limit + 1 });
    return { body: pageResponse(rows, page.limit) };
  },
);
