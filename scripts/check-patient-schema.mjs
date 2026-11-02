import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
let checks = 0;
async function rejects(query, values, code) {
  await client.query("SAVEPOINT invalid_case");
  try {
    await client.query(query, values);
    assert.fail("Expected constraint rejection");
  } catch (error) {
    assert.equal(error.code, code);
    checks++;
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT invalid_case");
  }
}
try {
  await client.query("BEGIN");
  const user = randomUUID(),
    patient = randomUUID(),
    companion = randomUUID(),
    visit = randomUUID(),
    companionVisit = randomUUID();
  await client.query(
    "INSERT INTO users (id,name,email,role) VALUES ($1,$2,$3,$4)",
    [user, "Schema check", `${user}@example.invalid`, "treatmentCoordinator"],
  );
  for (const [id, name] of [
    [patient, "Patient"],
    [companion, "Companion"],
  ])
    await client.query(
      "INSERT INTO patients (id,first_name,last_name) VALUES ($1,$2,$3)",
      [id, name, "Test"],
    );
  for (const [id, pid] of [
    [visit, patient],
    [companionVisit, companion],
  ])
    await client.query(
      "INSERT INTO patient_visits (id,patient_id,coordinator_id,arrival_at,departure_at,treatment,availability_notes) VALUES ($1,$2,$3,'2026-11-10T10:00:00+02:00','2026-11-17T16:00:00+02:00','Consultation','Mornings')",
      [id, pid, user],
    );
  await client.query(
    "INSERT INTO patient_companions (visit_id,patient_id,treatment_visit_id) VALUES ($1,$2,$3)",
    [visit, companion, companionVisit],
  );
  await client.query(
    "INSERT INTO patient_accommodations (visit_id,apartment_type,is_free,free_days) VALUES ($1,'studio',true,3)",
    [visit],
  );
  await client.query(
    "INSERT INTO patient_transfers (visit_id,is_free,direction) VALUES ($1,false,'round_trip')",
    [visit],
  );
  await rejects(
    "UPDATE patient_visits SET departure_at=arrival_at WHERE id=$1",
    [visit],
    "23514",
  );
  await rejects(
    "UPDATE patient_accommodations SET free_days=-1 WHERE visit_id=$1",
    [visit],
    "23514",
  );
  await rejects(
    "UPDATE patient_accommodations SET is_free=false WHERE visit_id=$1",
    [visit],
    "23514",
  );
  await rejects(
    "UPDATE patient_companions SET treatment_visit_id=$1 WHERE visit_id=$2",
    [visit, visit],
    "23514",
  );
  await rejects(
    "UPDATE patient_companions SET patient_id=$1 WHERE visit_id=$2",
    [patient, visit],
    "23503",
  );
  await rejects(
    "UPDATE patient_transfers SET direction='invalid' WHERE visit_id=$1",
    [visit],
    "22P02",
  );
  await rejects("DELETE FROM users WHERE id=$1", [user], "23503");
  const rows = await client.query(
    "SELECT v.treatment,a.free_days,t.direction FROM patient_visits v JOIN patient_accommodations a ON a.visit_id=v.id JOIN patient_transfers t ON t.visit_id=v.id WHERE v.id=$1",
    [visit],
  );
  assert.deepEqual(rows.rows, [
    { treatment: "Consultation", free_days: 3, direction: "round_trip" },
  ]);
  console.log(
    `Patient + treatment companion registration round trip passed; ${checks} invalid cases rejected. All test data rolled back.`,
  );
} finally {
  await client.query("ROLLBACK");
  await client.end();
}
