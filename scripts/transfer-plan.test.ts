import assert from "node:assert/strict";
import { test } from "node:test";
import { transferPlanInput } from "../lib/transfers/plan-schema";
import {
  transferCalendarEvents,
  type TransferBooking,
} from "../lib/transfers/calendar";
import { can } from "../lib/auth/permissions";
const base = {
  visitId: "bdb65c1e-e473-4083-bafc-85d606b47977",
  leg: "arrival",
  revision: 0,
  expectedStart: "2026-11-02T08:00:00Z",
  intent: "reschedule",
  moment: "2026-11-02T14:30",
  reason: "Flight delayed",
};
test("driver changes require a valid local date, time, reason and concurrency version", () => {
  assert.equal(transferPlanInput.safeParse(base).success, true);
  for (const patch of [
    { reason: "  " },
    { moment: "2026-02-30T10:00" },
    { moment: "2026-11-02T25:00" },
    { moment: "" },
    { moment: "2026-11-02T09:00Tignored" },
    { revision: -1 },
    { expectedStart: "invalid" },
  ])
    assert.equal(
      transferPlanInput.safeParse({ ...base, ...patch }).success,
      false,
    );
  assert.equal(
    transferPlanInput.safeParse({
      ...base,
      intent: "complete",
      reason: "",
      moment: undefined,
    }).success,
    true,
  );
});
test("drivers can update transfers without gaining access to treatment or accommodation management", () => {
  assert.equal(can(["driver"], "transfer", "update"), true);
  assert.equal(can(["driver"], "patient", "update"), false);
  assert.equal(can(["driver"], "accommodation", "update"), false);
  assert.equal(can(["qualityControl"], "transfer", "update"), false);
});
test("shared trip membership follows the effective transfer time, leaving other legs independent", () => {
  const parent: TransferBooking = {
    id: "p",
    visitId: "parent",
    firstName: "Parent",
    lastName: "Test",
    arrival: new Date("2026-11-02T10:00Z"),
    departure: new Date("2026-11-07T10:00Z"),
    direction: "round_trip",
    oneWayLeg: "arrival",
  };
  const child = { ...parent, id: "c", visitId: "child", firstName: "Child" };
  const companion = {
    visitId: "parent",
    treatmentVisitId: "child",
    firstName: "Child",
    lastName: "Test",
    arrival: child.arrival,
    departure: child.departure,
  };
  const from = new Date("2026-11-01Z"),
    to = new Date("2026-12-01Z");
  const shared = transferCalendarEvents([parent, child], [companion], from, to);
  assert.equal(shared.length, 2);
  assert.deepEqual(shared[0].memberVisitIds, ["parent", "child"]);
  const moved = { ...child, arrival: new Date("2026-11-03T11:00Z") };
  const split = transferCalendarEvents(
    [parent, moved],
    [{ ...companion, arrival: moved.arrival }],
    from,
    to,
  );
  assert.equal(split.length, 3);
  assert.deepEqual(
    split.find((event) => event.visitId === "parent" && event.leg === "arrival")
      ?.memberVisitIds,
    ["parent"],
  );
});

test("one-way treatment companions join only their booked transfer leg", () => {
  const parent: TransferBooking = {
    id: "p", visitId: "parent", firstName: "Parent", lastName: "Test",
    arrival: new Date("2026-11-02T10:00Z"),
    departure: new Date("2026-11-07T10:00Z"),
    direction: "round_trip", oneWayLeg: "arrival",
  };
  const child: TransferBooking = {
    ...parent, id: "c", visitId: "child", firstName: "Child",
    direction: "one_way", oneWayLeg: "departure",
  };
  const events = transferCalendarEvents([parent, child], [{
    visitId: "parent", treatmentVisitId: "child", firstName: "Child",
    lastName: "Test", arrival: child.arrival, departure: child.departure,
  }], new Date("2026-11-01Z"), new Date("2026-12-01Z"));
  assert.equal(events.length, 2);
  const arrival = events.find((event) => event.leg === "arrival")!;
  const departure = events.find((event) => event.leg === "departure")!;
  assert.deepEqual(arrival.memberVisitIds, ["parent"]);
  assert.deepEqual(arrival.names, ["Parent Test"]);
  assert.deepEqual(departure.memberVisitIds, ["parent", "child"]);
  assert.deepEqual(departure.names, ["Parent Test", "Child Test"]);
});
