import assert from "node:assert/strict";
import test from "node:test";
import { browserLocale } from "../lib/i18n/config";

test("browser language respects quality, regional variants and supported fallbacks", () => {
  assert.equal(browserLocale("en-GB,en;q=0.9,ro;q=0.8"), "en");
  assert.equal(browserLocale("ro-MD,en;q=0.9"), "ro");
  assert.equal(browserLocale("fr-FR,ro;q=0.5,en;q=0.9"), "en");
  assert.equal(browserLocale("ro;q=0,en;q=0.8"), "en");
  assert.equal(browserLocale("de-DE,fr;q=0.5"), "ro");
  assert.equal(browserLocale(null), "ro");
});
