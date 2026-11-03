import assert from "node:assert/strict";
import { test } from "node:test";
import { commands } from "../lib/api/v1/contracts";
import { pagination } from "../lib/api/v1/validation/common";
import { toForm } from "../lib/api/form-data";
import { readVisit, visitSchema } from "../lib/patients/form-schema";
import { readBody, ApiError } from "../lib/api/http";
import { apiActor } from "../lib/auth/request-context";
import type { users } from "../lib/db/schema";

const patient = { firstName: "Ada", lastName: "Test", arrivalDate: "2026-11-20", departureDate: "2026-11-23", arrivalTime: "12:00", departureTime: "14:00", coordinatorId: "coordinator", availabilityNotes: "", treatment: "Checkup", accommodation: { apartmentType: "studio", isFree: true, freeDays: 2 }, transfer: { direction: "one_way", oneWayLeg: "departure", isFree: false } };
test("API registration preserves all services through the form boundary", () => {
  const data = commands.registrations.schema.parse({ patient, companion: { firstName: "Sam", lastName: "Test", visit: { ...patient, firstName: "Sam" } } });
  const form = toForm(data);
  assert.deepEqual(visitSchema.parse(readVisit(form, "patient")), patient);
  assert.deepEqual(visitSchema.parse(readVisit(form, "companion.visit")), { ...patient, firstName: "Sam" });
  assert.equal(form.get("hasCompanion"), "on");
  assert.equal(form.get("companionTreatment"), "on");
});
test("API rejects unknown and privileged fields, invalid dates and inconsistent services", () => {
  for (const input of [
    { patient, role: "admin" },
    { patient: { ...patient, userId: "someone-else" } },
    { patient: { ...patient, transfer: { ...patient.transfer, admin: true } } },
    { patient: { ...patient, departureDate: "2026-11-19" } },
    { patient: { ...patient, accommodation: { ...patient.accommodation, freeDays: 99 } } },
    { patient: { ...patient, accommodation: { ...patient.accommodation, freeDays: "2" } } },
    { patient, companion: { firstName: "Other", lastName: "Test", visit: patient } },
  ]) assert.equal(commands.registrations.schema.safeParse(input).success, false);
  assert.equal(commands["transfer-pickup"].schema.safeParse({ visitId: "not-a-uuid", pickedUp: "true", leg: "arrival" }).success, false);
});
test("pagination is bounded and rejects unexpected filters", () => {
  assert.equal(pagination.parse({}).limit, 25);
  for (const value of [{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { offset: 500000 }, { after: "invalid" }]) assert.equal(pagination.safeParse(value).success, false);
});
test("JSON body reader enforces actual streamed size, type and valid JSON", async () => {
  const request = (body: string, type = "application/json") => new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": type }, body });
  assert.deepEqual(await readBody(request('{"ok":true}')), { ok: true });
  for (const [req, status] of [[request("{}", "text/plain"), 415], [request("{"), 400], [request('"' + "x".repeat(65536) + '"'), 413]] as const)
    await assert.rejects(readBody(req), (e) => e instanceof ApiError && e.status === status);
});
test("API actors remain isolated across concurrent requests", async () => {
  const actor = (id: string) => ({ user: { id } as typeof users.$inferSelect });
  const values = await Promise.all(["first", "second"].map(id => apiActor.run(actor(id), async () => { await new Promise(resolve => setTimeout(resolve, 5)); return apiActor.getStore()?.user.id; })));
  assert.deepEqual(values, ["first", "second"]);
  assert.equal(apiActor.getStore(), undefined);
});

test("integration access is the intersection of current user roles and key scopes", async () => {
  const { authorize } = await import("../lib/api/permissions");
  const principal = (role: string, scopes: string[] | null) => ({ user: { role } as typeof users.$inferSelect, scopes, principal: "test", credentialId: null });
  assert.doesNotThrow(() => authorize(principal("driver", ["transfer:update"]), "transfer:update"));
  assert.throws(() => authorize(principal("driver", ["patient:read"]), "patient:read"), (e) => e instanceof ApiError && e.status === 403);
  assert.throws(() => authorize(principal("admin", ["transfer:read"]), "patient:read"));
  assert.throws(() => authorize(principal("driver", []), "transfer:read"));
  assert.throws(() => authorize(principal("unknown", null), "transfer:read"));
  assert.doesNotThrow(() => authorize(principal("admin", null), "patient:read"));
});

test("domain actions keep API scopes when reusing a privileged staff user's roles", async () => {
  const { canCurrentActor } = await import("../lib/auth/authorization");
  const { parseRoles } = await import("../lib/auth/permissions");
  const roles = parseRoles("admin");
  const user = { id: "service-user" } as typeof users.$inferSelect;
  assert.equal(canCurrentActor(roles, "transfer", "update"), true);
  await apiActor.run({ user, scopes: ["patient:update"] }, async () => {
    assert.equal(canCurrentActor(roles, "patient", "update"), true);
    for (const resource of ["treatment", "accommodation", "transfer"] as const) {
      assert.equal(canCurrentActor(roles, resource, "update"), false);
    }
    await Promise.resolve();
    assert.equal(canCurrentActor(roles, "transfer", "update"), false);
  });
  assert.equal(canCurrentActor(roles, "transfer", "update"), true);
});
