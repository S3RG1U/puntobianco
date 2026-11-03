import "server-only";

import type { DataTableTab } from "@/components/data-table";
import type { SectionCard } from "@/components/section-cards";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { intlLocales, type Locale } from "@/lib/i18n/config";
import {
  addDays,
  clinicDay,
  countTransfersByWeek,
  startOfWeek,
} from "@/lib/transfers/calendar";
import { listTransferEvents } from "@/lib/transfers/queries";

const WEEKS_AHEAD = 6;

// Real transfers for the dashboard: this week's count against last week's, and
// everything from the start of this week onwards.
export async function getTransferSection(
  t: Dictionary,
  locale: Locale,
): Promise<{ card: SectionCard; tab: DataTableTab }> {
  const now = new Date();
  const today = clinicDay(now);
  const monday = startOfWeek(today);
  // A day of margin on both sides covers the clinic's UTC offset.
  const events = await listTransferEvents(
    new Date(`${addDays(monday, -8)}T00:00:00Z`),
    new Date(`${addDays(monday, WEEKS_AHEAD * 7 + 1)}T00:00:00Z`),
  );
  const { thisWeek, lastWeek } = countTransfersByWeek(events, today);
  const difference = thisWeek - lastWeek;
  const labels = t.dashboard.transfers;
  const pickup = new Intl.DateTimeFormat(intlLocales[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Chisinau",
  });

  return {
    card: {
      title: labels.title,
      value: String(thisWeek),
      change: difference > 0 ? `+${difference}` : String(difference),
      isUp: difference >= 0,
      summary: labels.summary(difference),
      note: labels.note,
    },
    tab: {
      value: "transfers",
      label: t.nav.transfers,
      columns: [
        { key: "passenger", header: labels.passenger },
        { key: "leg", header: labels.direction },
        { key: "pickup", header: labels.pickup, sortKey: "start" },
        { key: "status", header: t.common.status, isStatus: true },
      ],
      rows: events
        .filter(({ start }) => {
          const day = clinicDay(new Date(start));
          return day >= monday && day < addDays(monday, WEEKS_AHEAD * 7);
        })
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((event) => ({
          passenger: event.names.join(", "),
          leg: t.transfers.legs[event.leg],
          pickup: pickup.format(new Date(event.start)),
          start: event.start,
          status: event.completedAt
            ? t.transfers.details.completed
            : event.pickedUp
              ? t.transfers.pickedUp
              : new Date(event.start) < now
                ? labels.past
                : labels.scheduled,
        })),
    },
  };
}
