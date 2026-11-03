/** Integration checks create and remove their own database on LOCAL Postgres only. */
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { commands } from "../lib/api/v1/contracts";
import { hashPassword } from "better-auth/crypto";

async function main() {
  const source = new URL(process.env.DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(source.hostname), "Integration checks require local Postgres.");
  const name = `pb_api_test_${randomBytes(6).toString("hex")}`;
  const admin = new Pool({ connectionString: source.toString() });
  let testDb: Pool | undefined;
  let server: ReturnType<typeof spawn> | undefined;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    source.pathname = `/${name}`;
    testDb = new Pool({ connectionString: source.toString() });
    for (const migration of readMigrationFiles({ migrationsFolder: "./drizzle" })) {
      const client = await testDb.connect();
      try { await client.query("BEGIN"); for (const statement of migration.sql) await client.query(statement); await client.query("COMMIT"); }
      catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    }
    for (const [id, role] of [["api-admin", "admin"], ["api-driver", "driver"], ["api-coordinator", "treatmentCoordinator"]])
      await testDb.query("INSERT INTO users(id,name,email,role) VALUES($1,$1,$2,$3)", [id, `${id}@example.test`, role]);
    await testDb.query("INSERT INTO accounts(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES('credential-admin','api-admin','credential','api-admin',$1,now(),now())", [await hashPassword("Integration-test-password-2026")]);
    const key = async (id: string, user: string, scopes: string[]) => {
      const token = `pb_${randomBytes(32).toString("base64url")}`;
      await testDb!.query("INSERT INTO api_credentials(id,name,user_id,scopes,token_hash,expires_at) VALUES($1,'test',$2,$3,$4,now()+interval '1 day')", [id, user, scopes, createHash("sha256").update(token).digest("hex")]);
      return token;
    };
    const keyId = "00000000-0000-4000-8000-000000000001";
    const token = await key(keyId, "api-admin", ["patient:read", "patient:create", "treatment:read", "treatment:create", "accommodation:read", "accommodation:create", "transfer:read", "backOfficeCase:read"]);
    const driver = await key("00000000-0000-4000-8000-000000000002", "api-driver", ["transfer:read", "patient:read"]);
    const port = 32000 + Math.floor(Math.random() * 5000);
    const base = `http://localhost:${port}`;
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], { env: { ...process.env, DATABASE_URL: source.toString(), BETTER_AUTH_URL: base, APP_URL: base, TELEGRAM_ENABLED: "false", API_ALLOWED_ORIGINS: "https://allowed.example" }, stdio: "ignore" });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { await fetch(`${base}/api/health`); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(ready, "Test server did not start. Run the production build first.");
    const call = (path: string, options: RequestInit = {}, credential = token) => fetch(`${base}/api/v1/${path}`, { ...options, headers: { Authorization: `Bearer ${credential}`, ...options.headers } });
    for (const path of ["patients", "visits", "cases", "apartments", "accommodation-requests", "treatments", "transfers", "coordinators", "me", "patients/00000000-0000-4000-8000-000000000001"]) {
      assert.equal((await fetch(`${base}/api/v1/${path}`)).status, 401, path);
    }
    for (const name of Object.keys(commands)) {
      assert.equal((await fetch(`${base}/api/v1/commands/${name}`, { method: "POST" })).status, 401, name);
      assert.equal((await call(`commands/${name}`, { method: "POST" }, driver)).status, 403, name);
    }
    assert.equal((await call("patients", { method: "POST" })).status, 405);
    assert.equal((await call("commands/registrations")).status, 405);
    assert.equal((await call("unknown")).status, 404);
    const preflight = await fetch(`${base}/api/v1/patients`, { method: "OPTIONS", headers: { Origin: "https://allowed.example" } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "https://allowed.example");
    assert.equal((await call("patients", {}, "invalid")).status, 401);
    assert.equal((await call("patients", {}, driver)).status, 403);
    assert.equal((await call("patients?limit=101")).status, 422);
    assert.equal((await call("patients?limit=1&limit=2")).status, 422);
    assert.equal((await call("patients", { headers: { Origin: "https://evil.example" } })).status, 403);
    const cors = await call("patients", { headers: { Origin: "https://allowed.example" } });
    assert.equal(cors.headers.get("access-control-allow-origin"), "https://allowed.example");
    assert.equal(cors.headers.get("cache-control"), "no-store");
    const post = (command: string, body: unknown, idempotency = randomBytes(12).toString("hex")) => call(`commands/${command}`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotency }, body: JSON.stringify(body) });
    const apartment = { name: "Integration apartment", address: "Test street", apartmentType: "studio" };
    const first = await post("apartment-create", apartment, "same-apartment-key");
    assert.equal(first.status, 200, JSON.stringify(await first.clone().json()));
    assert.deepEqual(await first.json(), await (await post("apartment-create", apartment, "same-apartment-key")).json());
    assert.equal((await post("apartment-create", { ...apartment, name: "Changed" }, "same-apartment-key")).status, 409);
    assert.equal(Number((await testDb.query("SELECT count(*) FROM accommodations")).rows[0].count), 1);
    const concurrent = await Promise.all([post("apartment-create", { ...apartment, name: "Concurrent" }, "concurrent-write"), post("apartment-create", { ...apartment, name: "Concurrent" }, "concurrent-write")]);
    assert.ok(concurrent.some(r => r.status === 200));
    assert.ok(concurrent.every(r => [200, 409].includes(r.status)));
    assert.equal(Number((await testDb.query("SELECT count(*) FROM accommodations WHERE name='Concurrent'")).rows[0].count), 1);
    const coordinators = await (await call("coordinators")).json();
    assert.deepEqual(coordinators.data, [{ id: "api-coordinator", name: "api-coordinator" }]);
    const visit = { firstName: "Integration", lastName: "Patient", arrivalDate: "2027-01-10", departureDate: "2027-01-12", arrivalTime: "10:00", departureTime: "18:00", coordinatorId: "api-coordinator", availabilityNotes: "Private clinical note", treatment: "Private treatment", accommodation: { apartmentType: "studio", isFree: true, freeDays: 1 }, transfer: { isFree: false, direction: "one_way", oneWayLeg: "departure" } };
    const registration = await post("registrations", { patient: visit });
    assert.equal(registration.status, 200, JSON.stringify(await registration.clone().json()));
    const registered = await registration.json();
    assert.ok(registered.data.id);
    const detail = await (await call(`visits/${registered.data.id}`)).json();
    assert.ok(Array.isArray(detail.data.companions));
    assert.deepEqual({ apartmentType: detail.data.accommodation.apartmentType, isFree: detail.data.accommodation.isFree, freeDays: detail.data.accommodation.freeDays }, visit.accommodation);
    assert.deepEqual({ isFree: detail.data.transfer.isFree, direction: detail.data.transfer.direction, oneWayLeg: detail.data.transfer.oneWayLeg }, visit.transfer);
    const limitedWriter = await key("00000000-0000-4000-8000-000000000004", "api-admin", ["patient:update"]);
    const writeVisit = (patient: unknown, credential: string) => call("commands/visit-update", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": randomBytes(12).toString("hex") },
      body: JSON.stringify({ id: registered.data.id, patient }),
    }, credential);
    const patientOnly = { ...visit, accommodation: undefined, transfer: undefined };
    const patientEdit = await writeVisit({ ...patientOnly, treatment: "Must not overwrite treatment" }, limitedWriter);
    assert.equal(patientEdit.status, 200, JSON.stringify(await patientEdit.clone().json()));
    const serviceEdit = await writeVisit({
      ...visit,
      treatment: "Still must not overwrite treatment",
      accommodation: { apartmentType: "two_bedrooms", isFree: false, freeDays: 0 },
      transfer: { direction: "round_trip", oneWayLeg: "arrival", isFree: true },
    }, limitedWriter);
    assert.equal(serviceEdit.status, 200, JSON.stringify(await serviceEdit.clone().json()));
    const unchanged = await (await call(`visits/${registered.data.id}`)).json();
    assert.equal(unchanged.data.treatment, visit.treatment);
    assert.deepEqual(unchanged.data.accommodation, detail.data.accommodation);
    assert.deepEqual(unchanged.data.transfer, detail.data.transfer);
    const filtered = await (await call(`visits?patientId=${detail.data.patientId}`)).json();
    assert.equal(filtered.data.length, 1);
    assert.equal(Number((await testDb.query("SELECT count(*) FROM patient_accommodations")).rows[0].count), 1);
    assert.equal(Number((await testDb.query("SELECT count(*) FROM patient_transfers")).rows[0].count), 1);
    for (const resource of ["patients", "visits", "cases", "apartments", "accommodation-requests", "treatments"]) {
      const listed = await call(resource);
      assert.equal(listed.status, 200, resource);
      const collection = await listed.json();
      assert.ok(Array.isArray(collection.data), resource);
      assert.ok("nextCursor" in collection, resource);
      if (collection.data[0]) {
        const detail = await call(`${resource}/${collection.data[0].id}`);
        assert.equal(detail.status, 200, resource);
        assert.equal((await detail.json()).data.id, collection.data[0].id, resource);
      }
    }
    assert.equal((await call("transfers?start=2027-01-10T00:00:00Z&end=2027-01-13T00:00:00Z")).status, 200);
    const narrow = await key("00000000-0000-4000-8000-000000000003", "api-admin", ["patient:read"]);
    const visits = await (await call("visits", {}, narrow)).json();
    assert.ok(!("treatment" in visits.data[0])); assert.ok(!("availabilityNotes" in visits.data[0]));
    const limitedDetail = await (await call(`visits/${registered.data.id}`, {}, narrow)).json();
    for (const field of ["treatment", "treatmentNotes", "availabilityNotes", "accommodation", "transfer"]) {
      assert.ok(!(field in limitedDetail.data), field);
    }
    const fullWriter = await key("00000000-0000-4000-8000-000000000005", "api-admin", ["patient:update", "treatment:update", "accommodation:update", "transfer:update"]);
    const fullEdit = await writeVisit({
      ...visit,
      treatment: "Authorized updated treatment",
      accommodation: { ...visit.accommodation, isFree: false, freeDays: 0 },
      transfer: { ...visit.transfer, isFree: true },
    }, fullWriter);
    assert.equal(fullEdit.status, 200, JSON.stringify(await fullEdit.clone().json()));
    const updated = await (await call(`visits/${registered.data.id}`)).json();
    assert.equal(updated.data.treatment, "Authorized updated treatment");
    assert.equal(updated.data.accommodation.isFree, false);
    assert.equal(updated.data.transfer.isFree, true);
    const signin = await fetch(`${base}/api/auth/sign-in/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ email: "api-admin@example.test", password: "Integration-test-password-2026" }) });
    assert.equal(signin.status, 200, JSON.stringify(await signin.clone().json()));
    const session = signin.headers.get("set-auth-token"); assert.ok(session);
    assert.equal((await call("me", {}, session!)).status, 200);
    // Cookie-only requests and invalid bearer + valid cookie must both fail.
    const cookie = signin.headers.get("set-cookie")!;
    assert.equal((await fetch(`${base}/api/v1/me`, { headers: { Cookie: cookie } })).status, 401);
    assert.equal((await call("me", { headers: { Cookie: cookie } }, "bad-token")).status, 401);
    await testDb.query("UPDATE users SET role='driver' WHERE id='api-admin'");
    assert.equal((await call("patients")).status, 403);
    await testDb.query("UPDATE users SET role='admin' WHERE id='api-admin'");
    await testDb.query("UPDATE api_credentials SET expires_at=now()-interval '1 second' WHERE id=$1", [keyId]);
    assert.equal((await call("patients")).status, 401);
    await testDb.query("UPDATE api_credentials SET expires_at=now()+interval '1 day' WHERE id=$1", [keyId]);
    await testDb.query("UPDATE users SET banned=true WHERE id='api-admin'");
    assert.equal((await call("patients")).status, 401);
    assert.equal((await call("me", {}, session!)).status, 401);
    await testDb.query("UPDATE users SET banned=false WHERE id='api-admin'");
    await testDb.query("UPDATE api_credentials SET revoked_at=now() WHERE id=$1", [keyId]);
    assert.equal((await call("patients")).status, 401);
    await testDb.query("INSERT INTO api_rate_limits(principal,bucket,count) VALUES('key:00000000-0000-4000-8000-000000000003',floor(extract(epoch from now())/60),120) ON CONFLICT(principal) DO UPDATE SET count=120,bucket=EXCLUDED.bucket");
    assert.equal((await call("patients", {}, narrow)).status, 429);
    assert.ok(Number((await testDb.query("SELECT count(*) FROM api_requests WHERE status=200")).rows[0].count) > 0);
    console.log("API integration checks passed: migrations, authentication, signed sessions, scopes, CORS, validation, registration services, idempotency, projections, bans, revocation, quota and audit.");
  } finally {
    if (server) { server.kill("SIGTERM"); await new Promise<void>(resolve => { if (server!.exitCode !== null) resolve(); else server!.once("exit", () => resolve()); }); }
    await testDb?.end();
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.end();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.stack : "Integration checks failed"); process.exitCode = 1; });
