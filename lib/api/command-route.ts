import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiIdempotency } from "@/lib/db/schema";
import { apiActor } from "@/lib/auth/request-context";
import { readBody, ApiError, hash } from "./security";
import { apiRoute, type ApiResult } from "./route";

// Each version supplies its own validator, operation identity and response adapter.
export function commandRoute<Schema extends z.ZodType>(options: {
  name: string;
  version: `v${number}`;
  scope: string;
  schema: Schema;
  execute: (data: z.output<Schema>) => Promise<ApiResult>;
}) {
  return apiRoute({ auditPath: `${options.version}/commands/${options.name}`, scope: options.scope }, async (request, actor) => {
    if (new URL(request.url).search) throw new ApiError(422, "invalid_query", "Commands do not accept query parameters.");
    const data = options.schema.parse(await readBody(request));
    const key = z.string().min(8).max(128).regex(/^[A-Za-z0-9_-]+$/).parse(request.headers.get("idempotency-key"));
    // Preserve existing v1 fingerprints; future versions get separate identities.
    const identity = options.version === "v1" ? options.name : `${options.version}/${options.name}`;
    const fingerprint = hash(JSON.stringify({ name: identity, data }));
    const [claimed] = await db.insert(apiIdempotency).values({ principal: actor.principal, key, fingerprint }).onConflictDoNothing().returning();
    if (!claimed) {
      const [prior] = await db.select().from(apiIdempotency).where(and(eq(apiIdempotency.principal, actor.principal), eq(apiIdempotency.key, key)));
      if (prior.fingerprint !== fingerprint) throw new ApiError(409, "idempotency_conflict", "Key already used with different input.");
      if (!prior.response || !prior.status) throw new ApiError(409, "operation_pending", "Operation is pending or its result needs reconciliation. Do not retry with a new key.");
      return { body: JSON.parse(prior.response), status: prior.status };
    }
    const result = await apiActor.run({ user: actor.user, scopes: actor.scopes }, () => options.execute(data));
    const status = result.status ?? 200;
    await db.update(apiIdempotency).set({ response: JSON.stringify(result.body), status }).where(eq(apiIdempotency.id, claimed.id));
    return { body: result.body, status };
  });
}
