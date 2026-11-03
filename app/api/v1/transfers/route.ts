import { apiRoute } from "@/lib/api/route";
import { ApiError } from "@/lib/api/http";
import { listTransferEvents } from "@/lib/transfers/queries";
import { transferRange } from "@/lib/api/v1/validation/common";
import { queryParameters } from "@/lib/api/v1/request";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const GET = apiRoute(
  { auditPath: "v1/transfers", scope: "transfer:read" },
  async (request) => {
    const range = transferRange.parse(queryParameters(request));
    const start = new Date(range.start);
    const end = new Date(range.end);
    if (end <= start || +end - +start > 31 * 86400000) {
      throw new ApiError(422, "invalid_range", "Use a range of at most 31 days.");
    }
    return { body: { data: await listTransferEvents(start, end) } };
  },
);
