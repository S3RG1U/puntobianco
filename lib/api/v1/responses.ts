import { ApiError } from "@/lib/api/http";

// v1 wire contracts live here; v2 can format the same domain data independently.
export function pageResponse<T extends { id: string }>(rows: T[], limit: number) {
  return { data: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1].id : null };
}
export function recordResponse<T>(rows: T[]) {
  if (!rows.length) throw new ApiError(404, "not_found", "Record not found.");
  return { data: rows[0] };
}
export function commandResponse(result: object) {
  const failed = ("error" in result && result.error) || ("status" in result && result.status === "error");
  return failed
    ? { body: { error: { code: "operation_rejected", details: result } }, status: 422 }
    : { body: { data: result }, status: 200 };
}
