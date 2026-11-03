export const CLINIC_TIME_ZONE = "Europe/Chisinau";
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLINIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: CLINIC_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
// Calendar days are clinic-local "YYYY-MM-DD" strings, so navigation never
// depends on the browser's time zone or on daylight saving changes.
export const clinicDay = (date: Date) => dayFormat.format(date);
export const clinicTime = (date: Date) => timeFormat.format(date);
export const addDays = (day: string, amount: number) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};
export const startOfWeek = (day: string) =>
  addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));

export function countTransfersByWeek(
  events: Pick<TransferEvent, "start">[],
  today: string,
) {
  const monday = startOfWeek(today);
  const days = events.map(({ start }) => clinicDay(new Date(start)));
  const between = (from: string, to: string) =>
    days.filter((day) => day >= from && day < to).length;
  return {
    thisWeek: between(monday, addDays(monday, 7)),
    lastWeek: between(addDays(monday, -7), monday),
  };
}

export const transferLegApplies = (
  booking: { direction: "one_way" | "round_trip"; oneWayLeg: TransferLeg },
  leg: TransferLeg,
) => booking.direction === "round_trip" || booking.oneWayLeg === leg;

export type TransferLeg = "arrival" | "departure";
export type TransferBooking = {
  id: string;
  visitId: string;
  firstName: string;
  lastName: string;
  arrival: Date;
  departure: Date;
  direction: "one_way" | "round_trip";
  oneWayLeg: "arrival" | "departure";
};
export type TransferEvent = {
  id: string;
  visitId: string;
  pickedUp: boolean;
  title: string;
  start: string;
  leg: "arrival" | "departure";
  names: string[];
  memberVisitIds?: string[];
  revision?: number;
  completedAt?: string | null;
  pickup?: string | null;
  dropoff?: string | null;
  apartment?: { name: string; address: string } | null;
  otherApartments?: { name: string; address: string }[];
  history?: {
    id: string;
    action: string;
    previousAt: string;
    scheduledAt: string;
    reason: string;
    actor: string | null;
    occurredAt: string;
  }[];
};
export function transferCalendarEvents(
  bookings: TransferBooking[],
  companions: {
    visitId: string;
    firstName: string;
    lastName: string;
    treatmentVisitId?: string | null;
    arrival?: Date | null;
    departure?: Date | null;
  }[],
  start: Date,
  end: Date,
): TransferEvent[] {
  const clock = new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Chisinau",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return bookings.flatMap((booking) =>
    (["arrival", "departure"] as const).flatMap((leg) => {
      if (!transferLegApplies(booking, leg)) return [];
      const date = leg === "arrival" ? booking.arrival : booking.departure;
      if (date < start || date >= end) return [];
      // A treated companion travelling at the same time shares the parent's
      // calendar event; a different leg/time remains its own transfer.
      const sharedParent = companions.find(
        (c) =>
          c.treatmentVisitId === booking.visitId &&
          bookings.some(
            (parent) =>
              parent.visitId === c.visitId &&
              (parent.direction === "round_trip" || parent.oneWayLeg === leg) &&
              parent[leg].getTime() === date.getTime(),
          ),
      );
      if (sharedParent) return [];
      const sharedCompanions = companions.filter(
        (companion) =>
          companion.visitId === booking.visitId &&
          (!companion.treatmentVisitId ||
            (companion[leg]?.getTime() === date.getTime() &&
              bookings.some(
                (child) =>
                  child.visitId === companion.treatmentVisitId &&
                  transferLegApplies(child, leg),
              ))),
      );
      const names = [
        `${booking.firstName} ${booking.lastName}`,
        ...sharedCompanions.map((c) => `${c.firstName} ${c.lastName}`),
      ];
      return [
        {
          id: `${booking.id}-${leg}`,
          visitId: booking.visitId,
          pickedUp: false,
          memberVisitIds: [
            booking.visitId,
            ...sharedCompanions
              .filter((c) => c.treatmentVisitId)
              .map((c) => c.treatmentVisitId!),
          ],
          title: `${leg === "arrival" ? "Sosire" : "Plecare"} ${clock.format(date)} – ${names.join(", ")}`,
          start: date.toISOString(),
          leg,
          names,
        },
      ];
    }),
  );
}
