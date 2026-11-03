import { writeFileSync } from "node:fs";
import { z } from "zod";
import { commands } from "../lib/api/v1/contracts";

const response = { description: "JSON envelope: data on success, error and requestId on failure. See docs/api.md." };
const security = [{ bearerAuth: [] }];
const paths: Record<string, unknown> = {
  "/me": { get: { summary: "Current identity, roles and key scopes", security, responses: { "200": response, "401": response } } },
};
for (const resource of ["patients", "visits", "cases", "apartments", "accommodation-requests", "treatments"]) {
  paths[`/${resource}`] = { get: { summary: `List ${resource}`, security, parameters: [
    { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
    { in: "query", name: "after", schema: { type: "string", format: "uuid" } },
    ...(resource === "visits" ? [{ in: "query", name: "patientId", schema: { type: "string", format: "uuid" } }] : []),
  ], responses: { "200": response, "401": response, "403": response, "422": response, "429": response } } };
  paths[`/${resource}/{id}`] = { get: { summary: `Read ${resource} record`, security, parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": response, "401": response, "403": response, "404": response, "422": response } } };
}
paths["/coordinators"] = { get: { summary: "Active treatment coordinator IDs and names (patient:create or patient:update)", security, parameters: [
  { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
  { in: "query", name: "after", schema: { type: "string", maxLength: 200 } },
], responses: { "200": response, "401": response, "403": response, "422": response } } };
paths["/transfers"] = { get: { summary: "Effective transfer events (maximum 31-day range)", security, parameters: ["start", "end"].map(name => ({ in: "query", name, required: true, schema: { type: "string", format: "date-time" } })), responses: { "200": response, "401": response, "403": response, "422": response } } };
for (const [name, definition] of Object.entries(commands)) {
  paths[`/commands/${name}`] = { post: { summary: name, description: `Requires ${definition.scope} in the user's current roles and, for integration keys, the key scopes. Retains all website business rules.`, security,
    parameters: [{ in: "header", name: "Idempotency-Key", required: true, schema: { type: "string", minLength: 8, maxLength: 128, pattern: "^[A-Za-z0-9_-]+$" } }],
    requestBody: { required: true, content: { "application/json": { schema: z.toJSONSchema(definition.schema, { target: "draft-2020-12" }) } } },
    responses: Object.fromEntries([200, 401, 403, 409, 413, 415, 422, 429, 500].map(code => [String(code), response])),
  } };
}
writeFileSync("docs/openapi.json", JSON.stringify({ openapi: "3.1.0", info: { title: "Punto Bianco API", version: "1.0.0", description: "Clinical workflow API. Runtime validation includes date-order, complimentary-stay, coordinator, conflict and concurrency rules beyond JSON Schema." }, servers: [{ url: "/api/v1" }], components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", description: "Signed Better Auth session token or scoped pb_ integration key" } } }, paths }, null, 2) + "\n");
