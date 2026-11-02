"use client";
import { useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
export function StayDateRange({
  prefix,
  errors = {},
}: {
  prefix: string;
  errors?: Record<string, string>;
}) {
  const [range, setRange] = useState<DateRange>();
  const [open, setOpen] = useState(false);
  const dateValue = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : "");
  const dateError =
    errors[`${prefix}.arrivalDate`] || errors[`${prefix}.departureDate`];
  return (
    <FieldGroup>
      <Field data-invalid={!!dateError}>
        <FieldLabel htmlFor={`${prefix}-dates`}>
          Arrival and departure dates
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
              ? `${format(range.from, "dd MMM yyyy")} — ${range.to ? format(range.to, "dd MMM yyyy") : "Choose departure"}`
              : "Choose stay dates"}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
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
                Done
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
          All dates and times use clinic time (Europe/Chisinau). Same-day visits
          are supported.
        </FieldDescription>
        {dateError && (
          <FieldError id={`${prefix}-date-error`}>{dateError}</FieldError>
        )}
      </Field>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["arrivalTime", "Arrival time", "09:00"],
            ["departureTime", "Departure time", "18:00"],
          ] as const
        ).map(([key, label, value]) => (
          <Field key={key} data-invalid={!!errors[`${prefix}.${key}`]}>
            <FieldLabel htmlFor={`${prefix}.${key}`}>{label}</FieldLabel>
            <Input
              id={`${prefix}.${key}`}
              name={`${prefix}.${key}`}
              type="time"
              defaultValue={value}
              required
              aria-invalid={!!errors[`${prefix}.${key}`]}
              aria-describedby={
                errors[`${prefix}.${key}`]
                  ? `${prefix}.${key}-error`
                  : undefined
              }
            />
            {errors[`${prefix}.${key}`] && (
              <FieldError id={`${prefix}.${key}-error`}>
                {errors[`${prefix}.${key}`]}
              </FieldError>
            )}
          </Field>
        ))}
      </FieldGroup>
    </FieldGroup>
  );
}
