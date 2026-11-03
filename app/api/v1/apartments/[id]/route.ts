import { apiRoute } from "@/lib/api/route";
import { listApartments } from "@/lib/accommodations/queries";
import { recordResponse } from "@/lib/api/v1/responses";
import { detailId } from "@/lib/api/v1/request";
export { apiOptions as OPTIONS } from "@/lib/api/route";

export const GET = apiRoute<{ params: Promise<{ id: string }> }>(
  { auditPath: "v1/apartments/:id", scope: "accommodation:read" },
  async (request, _actor, context) => {
    const id = await detailId(request, context);
    const response = recordResponse(await listApartments({ id, limit: 1 }));
    return { body: response };
  },
);
