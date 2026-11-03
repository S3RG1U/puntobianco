"use client";
import { useState } from "react";
import { format, parse } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { dateLocales, TimeSelect } from "@/components/forms/date-time-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/lib/i18n/client";
export function StayDateRange({
  prefix,
  errors = {},
  defaults,
}: {
  prefix: string;
  errors?: Record<string, string>;
  defaults?: {
    arrivalDate: string;
    departureDate: string;
    arrivalTime: string;
    departureTime: string;
  };
}) {
  const { locale, t } = useI18n();
  const dateLocale = dateLocales[locale];
  const isMobile = useIsMobile();
  const [range, setRange] = useState<DateRange | undefined>(() =>
    defaults?.arrivalDate
      ? {
          from: parse(defaults.arrivalDate, "yyyy-MM-dd", new Date()),
          to: parse(defaults.departureDate, "yyyy-MM-dd", new Date()),
        }
      : undefined,
  );
  const [open, setOpen] = useState(false);
  const dateValue = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : "");
  const dateError =
    errors[`${prefix}.arrivalDate`] || errors[`${prefix}.departureDate`];
  return (
    <FieldGroup>
      <Field data-invalid={!!dateError}>
        <FieldLabel htmlFor={`${prefix}-dates`}>
          {t.registration.dates}
        </FieldLabel>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                id={`${prefix}-dates`}
                className="w-full justify-start"
                aria-invalid={!!dateError}
                aria-describedby={`${prefix}-date-help${dateError ? ` ${prefix}-date-error` : ""}`}
              />
            }
          >
            <CalendarIcon data-icon="inline-start" />
            {range?.from
              ? `${format(range.from, "dd MMM yyyy", { locale: dateLocale })} — ${range.to ? format(range.to, "dd MMM yyyy", { locale: dateLocale }) : t.registration.chooseDeparture}`
              : t.registration.chooseDates}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={isMobile ? 1 : 2}
              defaultMonth={range?.from}
              locale={dateLocale}
              selected={range}
              onSelect={setRange}
              captionLayout="dropdown"
              startMonth={new Date(2020, 0)}
              endMonth={new Date(2040, 11)}
            />
            <div className="flex justify-end border-t p-2">
              <Button
                type="button"
                size="sm"
                disabled={!range?.from || !range?.to}
                onClick={() => setOpen(false)}
              >
                {t.registration.done}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <input
          type="hidden"
          name={`${prefix}.arrivalDate`}
          value={dateValue(range?.from)}
        />
        <input
          type="hidden"
          name={`${prefix}.departureDate`}
          value={dateValue(range?.to)}
        />
        <FieldDescription id={`${prefix}-date-help`}>
          {t.registration.datesHelp}
        </FieldDescription>
        {dateError && (
          <FieldError id={`${prefix}-date-error`}>{dateError}</FieldError>
        )}
      </Field>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        {(
          [
            [
              "arrivalTime",
              t.registration.arrivalTime,
              defaults?.arrivalTime || "09:00",
            ],
            [
              "departureTime",
              t.registration.departureTime,
              defaults?.departureTime || "18:00",
            ],
          ] as const
        ).map(([key, label, value]) => (
          <Field key={key} data-invalid={!!errors[`${prefix}.${key}`]}>
            <FieldLabel>{label}</FieldLabel>
            <TimeSelect name={`${prefix}.${key}`} defaultValue={value} />
            {errors[`${prefix}.${key}`] && (
              <FieldError>
                {errors[`${prefix}.${key}`]}
              </FieldError>
            )}
          </Field>
        ))}
      </FieldGroup>
    </FieldGroup>
  );
}
