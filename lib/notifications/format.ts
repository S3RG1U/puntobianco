import { format, parse } from "date-fns";
import { ro } from "date-fns/locale";
import { clinicDay, clinicTime } from "@/lib/transfers/calendar";

// Notifications are saved in Romanian, so their dates are too.
const toDate = (day: string) => parse(day, "yyyy-MM-dd", new Date());
const longDay = (day: string, pattern = "d MMMM yyyy") =>
  format(toDate(day), pattern, { locale: ro });

export const formatMoment = (day: string, time: string) =>
  `${longDay(day)}, ${time}`;

export const formatInstant = (date: Date) =>
  formatMoment(clinicDay(date), clinicTime(date));

export function formatStay(arrival: string, departure: string) {
  if (arrival === departure) return longDay(arrival);
  const sameYear = arrival.slice(0, 4) === departure.slice(0, 4);
  return `${longDay(arrival, sameYear ? "d MMMM" : "d MMMM yyyy")} – ${longDay(departure)}`;
}

export const formatFreeDays = (days: number) =>
  `Gratuit: ${days} ${days === 1 ? "zi" : "zile"}`;

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// A notification's message is "who · detail · detail": who it is about goes in
// bold under the title, and each detail gets its own line.
export function telegramMessage(
  event: { title: string; message: string },
  link = "",
) {
  const [subject, ...details] = event.message.split(" · ").map(escapeHtml);
  return [
    `<b>${escapeHtml(event.title)}</b>`,
    `<b>${subject}</b>`,
    ...details,
    ...(link
      ? ["", `<a href="${escapeHtml(link)}">Deschide în aplicație</a>`]
      : []),
  ].join("\n");
}
