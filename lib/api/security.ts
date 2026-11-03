import "server-only";
import { and, eq, isNull, sql, gt } from "drizzle-orm";
import { auth } from "@/lib/auth";
export { authorize } from "./permissions";
import { db } from "@/lib/db";
import { apiCredentials, users } from "@/lib/db/schema";

export { ApiError, hash, readBody } from "./http";
import { ApiError, hash } from "./http";
export async function authenticate(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ") || authorization.length > 2048)
    throw new ApiError(401, "unauthorized", "A bearer token is required.");
  const token = authorization.slice(7);
  if (/^pb_[A-Za-z0-9_-]{43}$/.test(token)) {
    const [record] = await db.select({ credential: apiCredentials, user: users }).from(apiCredentials)
      .innerJoin(users, eq(users.id, apiCredentials.userId))
      .where(and(eq(apiCredentials.tokenHash, hash(token)), isNull(apiCredentials.revokedAt), gt(apiCredentials.expiresAt, new Date())));
    if (!record || record.user.banned) throw new ApiError(401, "unauthorized", "Invalid or expired credential.");
    return { user: record.user, principal: `key:${record.credential.id}`, scopes: record.credential.scopes, credentialId: record.credential.id };
  }
  // Never fall back to ambient cookies when a bearer token is invalid.
  const session = await auth.api.getSession({ headers: new Headers({ authorization }) });
  if (!session) throw new ApiError(401, "unauthorized", "Invalid or expired session.");
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!user || user.banned) throw new ApiError(401, "unauthorized", "Account unavailable.");
  return { user, principal: `user:${user.id}`, scopes: null, credentialId: null };
}
export type Principal = Awaited<ReturnType<typeof authenticate>>;
// Atomic Postgres counters work across processes and deployments.
export async function rateLimit(actor: Principal) {
  const bucket = Math.floor(Date.now() / 60000);
  const rows = await db.execute(sql`
    INSERT INTO api_rate_limits (principal, bucket, count) VALUES (${actor.principal}, ${bucket}, 1)
    ON CONFLICT (principal) DO UPDATE SET bucket = EXCLUDED.bucket,
      count = CASE WHEN api_rate_limits.bucket = EXCLUDED.bucket THEN api_rate_limits.count + 1 ELSE 1 END
    WHERE api_rate_limits.bucket <> EXCLUDED.bucket OR api_rate_limits.count < 120
    RETURNING count`);
  if (!rows.rowCount) throw new ApiError(429, "rate_limited", "Try again in one minute.");
}
