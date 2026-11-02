import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countTransfersByWeek,
  transferCalendarEvents,
  type TransferBooking,
} from "../lib/transfers/calendar";
import { can, parseRoles } from "../lib/auth/permissions";
import { en } from "../lib/i18n/en";
import { ro } from "../lib/i18n/ro";
import { readVisit, registrationSchema } from "../lib/patients/form-schema";
const booking: TransferBooking = {
  id: "transfer-1",
  visitId: "visit-1",
  firstName: "Ana",
  lastName: "Pop",
  arrival: new Date("2026-11-03T14:30:00+02:00"),
  departure: new Date("2026-11-06T10:00:00+02:00"),
  direction: "round_trip",
  oneWayLeg: "arrival",
};
const start = new Date("2026-11-01T00:00:00Z"),
  end = new Date("2026-12-01T00:00:00Z");
test("round trips include arrival and departure with clinic time and companion names", () => {
  const events = transferCalendarEvents(
    [booking],
    [{ visitId: "visit-1", firstName: "Ion", lastName: "Pop" }],
    start,
    end,
  );
  assert.equal(events.length, 2);
  assert.equal(events[0].title, "Sosire 14:30 – Ana Pop, Ion Pop");
  assert.equal(events[1].title, "Plecare 10:00 – Ana Pop, Ion Pop");
  assert.equal(events[0].start, "2026-11-03T12:30:00.000Z");
});
test("one-way departure does not schedule an arrival", () => {
  const events = transferCalendarEvents(
    [{ ...booking, direction: "one_way", oneWayLeg: "departure" }],
    [],
    start,
    end,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].leg, "departure");
});
test("calendar range is inclusive at start and exclusive at end", () => {
  assert.equal(
    transferCalendarEvents([booking], [], booking.arrival, booking.departure)
      .length,
    1,
  );
  assert.equal(
    transferCalendarEvents(
      [booking],
      [],
      booking.departure,
      new Date(booking.departure.getTime() + 1),
    ).length,
    1,
  );
});
test("weekly transfer counts use clinic-local Monday to Sunday weeks", () => {
  const counts = countTransfersByWeek(
    [
      // Sunday 23:30 UTC is already Monday 01:30 at the clinic.
      { start: "2026-11-01T23:30:00.000Z" },
      { start: "2026-11-08T21:59:00.000Z" },
      { start: "2026-11-08T22:30:00.000Z" },
      { start: "2026-10-26T08:00:00.000Z" },
    ],
    "2026-11-04",
  );
  assert.deepEqual(counts, { thisWeek: 2, lastWeek: 1 });
});
test("clinic time observes summer daylight saving", () => {
  const events = transferCalendarEvents(
    [
      {
        ...booking,
        arrival: new Date("2026-07-10T14:30:00+03:00"),
        direction: "one_way",
      },
    ],
    [],
    new Date("2026-07-01"),
    new Date("2026-08-01"),
  );
  assert.equal(events[0].title, "Sosire 14:30 – Ana Pop");
});
test("back office case updates are restricted to back office and administrators", () => {
  assert.equal(can(["backOffice"], "backOfficeCase", "update"), true);
  assert.equal(can(["admin"], "backOfficeCase", "update"), true);
  assert.equal(can(["driver"], "backOfficeCase", "read"), false);
  assert.equal(
    can(["treatmentCoordinator"], "backOfficeCase", "update"),
    false,
  );
  assert.equal(can(["qualityControl"], "backOfficeCase", "update"), false);
  assert.equal(can(parseRoles("driver"), "transfer", "read"), true);
});
test("one-way transfer direction survives form parsing", () => {
  const form = new FormData();
  form.set("patient.needsTransfer", "on");
  form.set("patient.transferDirection", "one_way");
  form.set("patient.oneWayLeg", "departure");
  assert.equal(readVisit(form, "patient").transfer?.oneWayLeg, "departure");
});
test("registration rejects unsupported transfer legs", () => {
  const patient = {
    firstName: "Ana",
    lastName: "Pop",
    coordinatorId: "id",
    arrivalDate: "2026-11-03",
    arrivalTime: "14:30",
    departureDate: "2026-11-06",
    departureTime: "10:00",
    treatment: "Consultation",
    availabilityNotes: "",
    transfer: { isFree: true, direction: "one_way", oneWayLeg: "unknown" },
  };
  assert.equal(registrationSchema.safeParse({ patient }).success, false);
});

test("treated companions share matching legs without duplicate calendar events", () => {
  const child = {
    ...booking,
    id: "child-transfer",
    visitId: "child-visit",
    firstName: "Ion",
    lastName: "Pop",
  };
  const events = transferCalendarEvents(
    [booking, child],
    [
      {
        visitId: booking.visitId,
        firstName: "Ion",
        lastName: "Pop",
        treatmentVisitId: child.visitId,
        arrival: child.arrival,
        departure: child.departure,
      },
    ],
    start,
    end,
  );
  assert.equal(events.length, 2);
  assert.ok(events.every((event) => event.title.includes("Ana Pop, Ion Pop")));
});
test("companions arriving at a different time remain separate passengers", () => {
  const child = {
    ...booking,
    id: "child-transfer",
    visitId: "child-visit",
    firstName: "Ion",
    lastName: "Pop",
    arrival: new Date("2026-11-04T10:00:00+02:00"),
  };
  const events = transferCalendarEvents(
    [booking, child],
    [
      {
        visitId: booking.visitId,
        firstName: "Ion",
        lastName: "Pop",
        treatmentVisitId: child.visitId,
        arrival: child.arrival,
        departure: child.departure,
      },
    ],
    start,
    end,
  );
  assert.equal(events.length, 3);
  assert.equal(events[0].title, "Sosire 14:30 – Ana Pop");
  assert.ok(events.some((event) => event.title === "Sosire 10:00 – Ion Pop"));
});
test("counts read correctly in both languages", () => {
  assert.equal(ro.transfers.dayCount(1), "1 transfer");
  assert.equal(ro.transfers.dayCount(19), "19 transferuri");
  assert.equal(ro.transfers.dayCount(20), "20 de transferuri");
  assert.equal(ro.transfers.dayCount(101), "101 transferuri");
  assert.equal(ro.accommodations.freeTerms(1), "1 zi gratuită");
  assert.equal(en.transfers.dayCount(1), "1 transfer");
  assert.equal(en.transfers.dayCount(2), "2 transfers");
});
