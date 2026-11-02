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
    if (
      `${data.departureDate}T${data.departureTime}` <=
      `${data.arrivalDate}T${data.arrivalTime}`
    ) {
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
export const registrationSchema = z.object({
  patient: visitSchema,
  companion: z
    .object({ firstName: name, lastName: name, visit: visitSchema.optional() })
    .optional(),
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
    treatment: get("treatment"),
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
