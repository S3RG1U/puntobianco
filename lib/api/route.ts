import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiRequests } from "@/lib/db/schema";
import { authenticate, authorize, rateLimit, ApiError, type Principal } from "./security";

export type ApiResult = { body: unknown; status?: number };

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = (process.env.API_ALLOWED_ORIGINS ?? "").split(",").filter(Boolean);
  if (origin && !allowed.includes(origin)) {
    throw new ApiError(403, "origin_denied", "Origin is not allowed.");
  }
  return origin;
}

// Shared transport protection; domain queries and versioned wire formats stay outside.
export function apiRoute<Context = unknown>(
  options: { auditPath: string; scope?: string },
  handler: (request: Request, actor: Principal, context: Context) => Promise<ApiResult>,
) {
  return async function handle(request: Request, context: Context) {
    const requestId = randomUUID();
    let auditId: string | undefined;
    let origin: string | null = null;

    function response(body: unknown, status = 200) {
      const payload = body && typeof body === "object" && "error" in body
        ? { ...body, requestId }
        : body;
      return Response.json(payload, {
        status,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "X-Request-Id": requestId,
          "Vary": "Origin",
          ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
          ...(status === 401 ? { "WWW-Authenticate": "Bearer" } : {}),
          ...(status === 429 ? { "Retry-After": "60" } : {}),
        },
      });
    }

    try {
      origin = allowedOrigin(request);
      const actor = await authenticate(request);
      await rateLimit(actor);
      const [audit] = await db.insert(apiRequests).values({
        principal: actor.principal,
        method: request.method,
        path: options.auditPath,
      }).returning({ id: apiRequests.id });
      auditId = audit.id;
      if (options.scope) authorize(actor, options.scope);
      const { body, status = 200 } = await handler(request, actor, context);
      await db.update(apiRequests).set({ status }).where(eq(apiRequests.id, auditId));
      return response(body, status);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : error instanceof z.ZodError ? 422 : 500;
      if (auditId) {
        await db.update(apiRequests).set({ status }).where(eq(apiRequests.id, auditId)).catch(() => {});
      }
      // Never log tokens, payloads, or database errors containing patient data.
      if (status === 500) console.error("API request failed", requestId);
      return response({
        error: {
          code: error instanceof ApiError ? error.code : status === 422 ? "validation_failed" : "internal_error",
          message: error instanceof ApiError ? error.message : status === 422 ? "Invalid request fields." : "Request failed.",
          ...(error instanceof z.ZodError ? {
            fields: error.issues.map(issue => ({ path: issue.path.join("."), code: issue.code })),
          } : {}),
        },
      }, status);
    }
  };
}

export async function apiOptions(request: Request) {
  try {
    const origin = allowedOrigin(request);
    return new Response(null, {
      status: 204,
      headers: {
        "Vary": "Origin",
        "Cache-Control": "no-store",
        ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
        "Access-Control-Max-Age": "600",
      },
    });
  } catch {
    return new Response(null, { status: 403 });
  }
}
