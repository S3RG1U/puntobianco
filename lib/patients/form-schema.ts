import { z } from "zod";

// Validation messages are keys of `validation` in lib/i18n.

export const apartmentValues = [
  "studio",
  "one_bedroom_sofa",
  "two_bedrooms",
  "two_bedrooms_living",
] as const;
const name = z
  .string()
  .trim()
  .min(1, "nameRequired")
  .max(200, "nameTooLong");
export const personNameSchema = z.object({ firstName: name, lastName: name });
const date = z.iso.date("dateInvalid");
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "timeInvalid");
export const stayDays = (arrival: string, departure: string) =>
  Math.max(
    1,
    Math.ceil((Date.parse(departure) - Date.parse(arrival)) / 86400000),
  );

const departsAfterArrival = (visit: {
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
}) =>
  `${visit.departureDate}T${visit.departureTime}` >
  `${visit.arrivalDate}T${visit.arrivalTime}`;

export const visitSchema = z
  .object({
    firstName: name,
    lastName: name,
    arrivalDate: date,
    departureDate: date,
    arrivalTime: time,
    departureTime: time,
    coordinatorId: z.string().min(1, "coordinatorRequired"),
    availabilityNotes: z.string().trim().max(5000),
    treatment: z
      .string()
      .trim()
      .min(1, "treatmentRequired")
      .max(10000),
    treatmentNotes: z.string().trim().max(5000).optional(),
    accommodation: z
      .object({
        apartmentType: z.enum(apartmentValues, "apartmentTypeRequired"),
        isFree: z.boolean(),
        freeDays: z.coerce.number().int().min(0).max(3650),
      })
      .optional(),
    transfer: z
      .object({
        isFree: z.boolean(),
        direction: z.enum(["one_way", "round_trip"]),
        oneWayLeg: z.enum(["arrival", "departure"]).default("arrival"),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!departsAfterArrival(data)) {
      ctx.addIssue({
        code: "custom",
        path: ["departureDate"],
        message: "departureAfterArrival",
      });
    }
    const accommodation = data.accommodation;
    if (
      accommodation &&
      ((accommodation.isFree &&
        (accommodation.freeDays < 1 ||
          accommodation.freeDays >
            stayDays(data.arrivalDate, data.departureDate))) ||
        (!accommodation.isFree && accommodation.freeDays !== 0))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["accommodation", "freeDays"],
        message: "freeDaysRange",
      });
    }
  });
export const companionSchema = z
  .object({ firstName: name, lastName: name, visit: visitSchema.optional() })
  .optional();
export const registrationSchema = z.object({
  patient: visitSchema,
  companion: companionSchema,
});
export type VisitInput = z.infer<typeof visitSchema>;
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string>;
  id?: string;
};
export const initialFormState: FormState = { status: "idle" };

export function readVisit(form: FormData, prefix: string) {
  const get = (key: string) => String(form.get(`${prefix}.${key}`) ?? "");
  const checked = (key: string) => get(key) === "on";
  return {
    firstName: get("firstName"),
    lastName: get("lastName"),
    arrivalDate: get("arrivalDate"),
    departureDate: get("departureDate"),
    arrivalTime: get("arrivalTime"),
    departureTime: get("departureTime"),
    coordinatorId: get("coordinatorId"),
    availabilityNotes: get("availabilityNotes"),
    // Forms submit line breaks as CRLF.
    treatment: get("treatment").replace(/\r\n/g, "\n"),
    // Left out when not sent, so an update keeps the saved notes.
    ...(form.has(`${prefix}.treatmentNotes`) && {
      treatmentNotes: get("treatmentNotes").replace(/\r\n/g, "\n"),
    }),
    accommodation: checked("needsAccommodation")
      ? {
          apartmentType: get("apartmentType"),
          isFree: checked("freeAccommodation"),
          freeDays: checked("freeAccommodation") ? get("freeDays") : 0,
        }
      : undefined,
    transfer: checked("needsTransfer")
      ? {
          isFree: checked("freeTransfer"),
          direction: get("transferDirection"),
          oneWayLeg:
            get("transferDirection") === "one_way"
              ? get("oneWayLeg")
              : "arrival",
        }
      : undefined,
  };
}

// A companion being added, on a new registration or on an existing one.
export function readCompanion(form: FormData) {
  if (form.get("hasCompanion") !== "on") return undefined;
  const companion = {
    firstName: String(form.get("companion.firstName") ?? ""),
    lastName: String(form.get("companion.lastName") ?? ""),
  };
  return {
    ...companion,
    visit:
      form.get("companionTreatment") === "on"
        ? { ...readVisit(form, "companion.visit"), ...companion }
        : undefined,
  };
}

function companionsComplete(form: FormData) {
  const saved = [...form.keys()].filter((key) =>
    /^companions\..+\.(firstName|lastName)$/.test(key),
  );
  const added = readCompanion(form);
  return (
    (saved.length > 0 || !!added) &&
    saved.every((key) => String(form.get(key)).trim()) &&
    companionSchema.safeParse(added).success
  );
}

// The form tabs that are filled in, by the same rules a save checks.
// Optional sections only count once they are asked for.
export function completedTabs(form: FormData) {
  const visit = readVisit(form, "patient");
  const invalid = (visitSchema.safeParse(visit).error?.issues ?? []).map(
    (issue) => String(issue.path[0]),
  );
  const ownSection = ["treatment", "accommodation", "transfer"];
  const tabs: string[] = [];
  if (
    invalid.every((field) => ownSection.includes(field)) &&
    departsAfterArrival(visit)
  )
    tabs.push("overview");
  if (!invalid.includes("treatment")) tabs.push("treatment");
  if (visit.accommodation && !invalid.includes("accommodation"))
    tabs.push("accommodation");
  if (visit.transfer && !invalid.includes("transfer")) tabs.push("transfer");
  if (companionsComplete(form)) tabs.push("companions");
  return tabs;
}
