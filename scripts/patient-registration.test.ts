import assert from "node:assert/strict";
import { test } from "node:test";
import {
  completedTabs,
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
const filledForm = (fields: Record<string, string>) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
};
const filledVisit = {
  "patient.firstName": "Ana",
  "patient.lastName": "Pop",
  "patient.arrivalDate": "2026-11-10",
  "patient.arrivalTime": "09:00",
  "patient.departureDate": "2026-11-13",
  "patient.departureTime": "18:00",
  "patient.coordinatorId": "coordinator-id",
  "patient.availabilityNotes": "",
  "patient.treatment": "Consultation",
};
test("marks only the required tabs as complete until an optional section is asked for", () => {
  assert.deepEqual(completedTabs(filledForm({})), []);
  assert.deepEqual(completedTabs(filledForm(filledVisit)), [
    "overview",
    "treatment",
  ]);
  assert.deepEqual(
    completedTabs(
      filledForm({ ...filledVisit, "patient.needsAccommodation": "on" }),
    ),
    ["overview", "treatment"],
  );
  assert.deepEqual(
    completedTabs(
      filledForm({
        ...filledVisit,
        "patient.needsAccommodation": "on",
        "patient.apartmentType": "studio",
        "patient.needsTransfer": "on",
        "patient.transferDirection": "round_trip",
        hasCompanion: "on",
        "companion.firstName": "Ion",
        "companion.lastName": "Pop",
      }),
    ),
    ["overview", "treatment", "accommodation", "transfer", "companions"],
  );
});
test("keeps the overview tab incomplete when the departure is before the arrival", () => {
  assert.deepEqual(
    completedTabs(
      filledForm({ ...filledVisit, "patient.departureDate": "2026-11-01" }),
    ),
    ["treatment"],
  );
});
test("treatment notes are optional and stay undefined when not sent", () => {
  assert.equal(readVisit(filledForm(filledVisit), "patient").treatmentNotes, undefined);
  assert.equal(
    readVisit(
      filledForm({ ...filledVisit, "patient.treatmentNotes": "a\r\nb" }),
      "patient",
    ).treatmentNotes,
    "a\nb",
  );
});

test("a companion being added on an existing registration must be filled in too", () => {
  const saved = {
    ...filledVisit,
    "companions.id-1.firstName": "Ion",
    "companions.id-1.lastName": "Pop",
  };
  assert.ok(completedTabs(filledForm(saved)).includes("companions"));
  assert.ok(
    !completedTabs(filledForm({ ...saved, hasCompanion: "on" })).includes(
      "companions",
    ),
  );
  assert.ok(
    completedTabs(
      filledForm({
        ...filledVisit,
        hasCompanion: "on",
        "companion.firstName": "Eva",
        "companion.lastName": "Pop",
      }),
    ).includes("companions"),
  );
});
