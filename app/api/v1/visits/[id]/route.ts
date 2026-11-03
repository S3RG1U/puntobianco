import { apiRoute } from "@/lib/api/route";
import { listVisits, listVisitCompanions } from "@/lib/patients/queries";
import { getVisitAccommodation } from "@/lib/accommodations/queries";
import { getVisitTransfer } from "@/lib/transfers/queries";
import { recordResponse } from "@/lib/api/v1/responses";
import { detailId } from "@/lib/api/v1/request";
export { apiOptions as OPTIONS } from "@/lib/api/route";
import { hasPermission } from "@/lib/api/permissions";

export const GET = apiRoute<{ params: Promise<{ id: string }> }>(
  { auditPath: "v1/visits/:id", scope: "patient:read" },
  async (request, actor, context) => {
    const id = await detailId(request, context);
    const response = recordResponse(await listVisits({ id, limit: 1, includeMedical: hasPermission(actor, "treatment:read") }));
    const [companions, accommodation, transfer] = await Promise.all([
      listVisitCompanions(id),
      hasPermission(actor, "accommodation:read") ? getVisitAccommodation(id) : undefined,
      hasPermission(actor, "transfer:read") ? getVisitTransfer(id) : undefined,
    ]);
    return { body: { data: {
      ...response.data,
      companions,
      ...(accommodation !== undefined ? { accommodation } : {}),
      ...(transfer !== undefined ? { transfer } : {}),
    } } };
  },
);
