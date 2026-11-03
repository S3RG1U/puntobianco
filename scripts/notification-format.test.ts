import assert from "node:assert/strict";
import { test } from "node:test";
import { localizeNotification } from "../lib/i18n/dictionaries";
import {
  formatFreeDays,
  formatInstant,
  formatMoment,
  formatStay,
  telegramMessage,
} from "../lib/notifications/format";

test("dates read as words in Romanian", () => {
  assert.equal(formatMoment("2026-11-04", "09:00"), "4 noiembrie 2026, 09:00");
  assert.equal(
    formatInstant(new Date("2026-11-04T07:00:00Z")),
    "4 noiembrie 2026, 09:00",
  );
  assert.equal(
    formatStay("2026-11-04", "2026-11-13"),
    "4 noiembrie – 13 noiembrie 2026",
  );
  assert.equal(
    formatStay("2026-12-30", "2027-01-02"),
    "30 decembrie 2026 – 2 ianuarie 2027",
  );
  assert.equal(formatStay("2026-11-04", "2026-11-04"), "4 noiembrie 2026");
  assert.equal(formatFreeDays(1), "Gratuit: 1 zi");
  assert.equal(formatFreeDays(3), "Gratuit: 3 zile");
});

test("a Telegram message has a bold title and name, and one line per detail", () => {
  assert.equal(
    telegramMessage({
      title: "Caz nou · Back office",
      message: "Giovani Carlos · Sosire 4 noiembrie 2026, 09:00",
    }),
    "<b>Caz nou · Back office</b>\n<b>Giovani Carlos</b>\nSosire 4 noiembrie 2026, 09:00",
  );
});

test("a Telegram message links to the app when a link is given", () => {
  assert.equal(
    telegramMessage({ title: "T", message: "M" }, "https://app.test/a?b=1&c=2"),
    '<b>T</b>\n<b>M</b>\n\n<a href="https://app.test/a?b=1&amp;c=2">Deschide în aplicație</a>',
  );
});

test("text from people can't break Telegram's formatting", () => {
  assert.equal(
    telegramMessage({ title: "T", message: "Ana <b> & Co" }),
    "<b>T</b>\n<b>Ana &lt;b&gt; &amp; Co</b>",
  );
});

test("the new notification titles are translated in the bell", () => {
  assert.equal(localizeNotification("en", "Date modificate"), "Dates changed");
  assert.equal(
    localizeNotification("en", "Cazare · Anulată"),
    "Accommodation · Cancelled",
  );
  assert.equal(
    localizeNotification("en", "Ana · Apartament A1 · Fără apartament"),
    "Ana · Apartment A1 · No apartment",
  );
});
