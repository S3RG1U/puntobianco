import { createHash } from "node:crypto";
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export async function readBody(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new ApiError(415, "unsupported_media_type", "Use application/json.");
  if (Number(request.headers.get("content-length")) > 65536) throw new ApiError(413, "body_too_large", "Maximum body size is 64 KiB.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "invalid_json", "A JSON body is required.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 65536) { await reader.cancel(); throw new ApiError(413, "body_too_large", "Maximum body size is 64 KiB."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(400, "invalid_json", "Malformed JSON."); }
}
