import { ApiError } from "@/lib/api/http";
import { uuid } from "./validation/common";

export function queryParameters(request: Request) {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => params.getAll(key).length > 1)) {
    throw new ApiError(422, "invalid_query", "Duplicate query parameters are not allowed.");
  }
  return Object.fromEntries(params);
}
export async function detailId(request: Request, context: { params: Promise<{ id: string }> }) {
  if (new URL(request.url).search) throw new ApiError(422, "invalid_query", "Detail requests do not accept pagination.");
  return uuid.parse((await context.params).id);
}
