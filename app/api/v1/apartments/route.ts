import { apiRoute } from "@/lib/api/route";
import { listApartments } from "@/lib/accommodations/queries";
import { pageResponse } from "@/lib/api/v1/responses";
import { queryParameters } from "@/lib/api/v1/request";
import { pagination } from "@/lib/api/v1/validation/common";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const GET = apiRoute(
  { auditPath: "v1/apartments", scope: "accommodation:read" },
  async (request) => {
    const page = pagination.parse(queryParameters(request));
    const rows = await listApartments({ ...page, limit: page.limit + 1 });
    return { body: pageResponse(rows, page.limit) };
  },
);
