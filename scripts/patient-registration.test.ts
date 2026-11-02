import assert from "node:assert/strict";
import { test } from "node:test";
import {
  registrationSchema,
  readVisit,
  visitSchema,
} from "../lib/patients/form-schema";
const visit = {
  firstName: "Ana",
  lastName: "Pop",
  coordinatorId: "coordinator-id",
  arrivalDate: "2026-11-10",
  arrivalTime: "09:00",
  departureDate: "2026-11-13",
  departureTime: "18:00",
  treatment: "Consultation",
  availabilityNotes: "Mornings",
};
test("supports a patient, all apartment types, partial complimentary stays and both transfer directions", () => {
  for (const apartmentType of [
    "studio",
    "one_bedroom_sofa",
    "two_bedrooms",
    "two_bedrooms_living",
  ]) {
    for (const direction of ["one_way", "round_trip"])
      assert.equal(
        registrationSchema.safeParse({
          patient: {
            ...visit,
            accommodation: { apartmentType, isFree: true, freeDays: 2 },
            transfer: { direction, isFree: false },
          },
        }).success,
        true,
      );
  }
});
test("supports companions with and without a complete treatment visit", () => {
  const companion = { firstName: "Ion", lastName: "Pop" };
  assert.equal(
    registrationSchema.safeParse({ patient: visit, companion }).success,
    true,
  );
  assert.equal(
    registrationSchema.safeParse({
      patient: visit,
      companion: { ...companion, visit: { ...visit, ...companion } },
    }).success,
    true,
  );
  assert.equal(
    registrationSchema.safeParse({
      patient: visit,
      companion: { ...companion, visit: { ...visit, treatment: "" } },
    }).success,
    false,
  );
});
test("rejects invalid dates, reverse ranges, missing coordinator and incomplete treatment", () => {
  for (const patch of [
    { arrivalDate: "2026-02-30" },
    { departureDate: "2026-11-09" },
    { arrivalTime: "25:00" },
    { coordinatorId: "" },
    { treatment: " " },
    { firstName: " " },
  ])
    assert.equal(visitSchema.safeParse({ ...visit, ...patch }).success, false);
});
test("allows same-day visits only when departure time is later", () => {
  assert.equal(
    visitSchema.safeParse({ ...visit, departureDate: visit.arrivalDate })
      .success,
    true,
  );
  assert.equal(
    visitSchema.safeParse({
      ...visit,
      departureDate: visit.arrivalDate,
      departureTime: visit.arrivalTime,
    }).success,
    false,
  );
});
test("rejects excessive or inconsistent complimentary days", () => {
  for (const terms of [
    { isFree: true, freeDays: 0 },
    { isFree: true, freeDays: 4 },
    { isFree: false, freeDays: 1 },
    { isFree: true, freeDays: 1.5 },
  ])
    assert.equal(
      visitSchema.safeParse({
        ...visit,
        accommodation: { apartmentType: "studio", ...terms },
      }).success,
      false,
    );
});
test("ignores hidden service values after a request is unchecked", () => {
  const form = new FormData();
  form.set("patient.freeAccommodation", "on");
  form.set("patient.freeDays", "100");
  form.set("patient.transferDirection", "round_trip");
  const result = readVisit(form, "patient");
  assert.equal(result.accommodation, undefined);
  assert.equal(result.transfer, undefined);
});
test("a single date-time answer fills the date and time of the visit", () => {
  const form = new FormData();
  form.set("patient.arrival", "2026-11-18T09:30");
  form.set("patient.departure", "2026-11-22T18:00");
  const visit = readVisit(form, "patient");
  assert.equal(visit.arrivalDate, "2026-11-18");
  assert.equal(visit.arrivalTime, "09:30");
  assert.equal(visit.departureDate, "2026-11-22");
  assert.equal(visit.departureTime, "18:00");
});
