import type { Locale } from "./config";
import { en } from "./en";
import { ro, type Dictionary } from "./ro";

export type { Dictionary };
export const dictionaries = { ro, en };

// Schemas are shared between client, server and tests, so their messages are
// dictionary keys. Zod's own default messages fall back to a generic one.
export function validationMessage(t: Dictionary, key: string) {
  return (
    (t.validation as Record<string, string>)[key] ?? t.validation.invalid
  );
}

// Notifications are saved in Romanian, which Telegram messages also use. Each
// " · " part is translated for display, so older notifications work as well.
const notificationText: Record<string, string> = {
  "Pacient înregistrat": "Patient registered",
  "Pacient actualizat": "Patient updated",
  "Pacient preluat": "Patient picked up",
  "Caz nou": "New case",
  "Caz început": "Case started",
  "Caz finalizat": "Case completed",
  "Cerere cazare": "Accommodation request",
  Cazare: "Accommodation",
  Actualizată: "Updated",
  Neprelucrat: "Unprocessed",
  Rezervat: "Reserved",
  "Transfer nou": "New transfer",
  "Transfer actualizat": "Transfer updated",
  "Sosire și plecare": "Arrival and departure",
  Sosire: "Arrival",
  Plecare: "Departure",
  "Cererea de cazare a fost actualizată.": "The accommodation request was updated.",
};
export function localizeNotification(locale: Locale, text: string) {
  if (locale === "ro") return text;
  return text
    .split(" · ")
    .map(
      (part) =>
        notificationText[part] ??
        part.replace(/^Sosire /, "Arrival ").replace(/^Plecare /, "Departure "),
    )
    .join(" · ");
}

// Field errors for a form, keyed by the field's name.
export function fieldErrors(
  t: Dictionary,
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  prefix = "",
) {
  return Object.fromEntries(
    issues.map((issue) => [
      `${prefix}${issue.path.map(String).join(".")}`,
      validationMessage(t, issue.message),
    ]),
  );
}
