/** Run only from a trusted operator terminal. Never expose credential management as a public route. */
import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../lib/db";
import { apiCredentials, users } from "../lib/db/schema";
import { can, parseRoles, type Resource } from "../lib/auth/permissions";
import { scopeSchema } from "../lib/api/scopes";

async function main() {
  const [operation, ...args] = process.argv.slice(2);
  if (operation === "revoke") {
    const id = z.uuid().parse(args[0]);
    const changed = await db.update(apiCredentials).set({ revokedAt: new Date() }).where(eq(apiCredentials.id, id)).returning({ id: apiCredentials.id });
    if (!changed.length) throw new Error("Credential not found.");
    console.log(`Revoked ${id}`); return;
  }
  if (operation !== "create") throw new Error("Usage: api:key create <user-id> <name> <days:1-90> <comma-separated scopes> | revoke <key-id>");
  const userId = z.string().min(1).max(200).parse(args[0]);
  const name = z.string().trim().min(1).max(100).parse(args[1]);
  const days = z.coerce.number().int().min(1).max(90).parse(args[2]);
  const scopes = z.array(scopeSchema).min(1).parse((args[3] ?? "").split(","));
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.banned) throw new Error("Choose an active service user.");
  for (const scope of scopes) {
    const [resource, action] = scope.split(":");
    if (!can(parseRoles(user.role), resource as Resource, action)) throw new Error(`User lacks ${scope}`);
  }
  const token = `pb_${randomBytes(32).toString("base64url")}`;
  const [credential] = await db.insert(apiCredentials).values({ userId, name, scopes, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + days * 86400000) }).returning({ id: apiCredentials.id, expiresAt: apiCredentials.expiresAt });
  console.log(JSON.stringify({ ...credential, token, notice: "Shown once. Store in a secret manager; never put integration keys in a mobile app." }));
}
main().then(() => process.exit(0)).catch(() => { console.error("Credential operation failed. Check arguments, user permissions, and database connection."); process.exit(1); });
