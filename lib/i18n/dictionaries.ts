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
