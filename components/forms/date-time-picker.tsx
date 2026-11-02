"use client";
import { useState } from "react";
import { format, parse } from "date-fns";
import { enGB, ro } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

export const dateLocales = { ro, en: enGB } satisfies Record<Locale, unknown>;

const pad = (value: number) => String(value).padStart(2, "0");
const hours = Array.from({ length: 24 }, (_, hour) => pad(hour));
const minutes = Array.from({ length: 12 }, (_, step) => pad(step * 5));

function TimePart({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger aria-label={label} className="tabular-nums">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

// 24-hour selects: a native time input follows the browser's language and clock.
export function TimeSelect({
  name,
  defaultValue,
  onChange,
}: {
  name?: string;
  defaultValue: string;
  onChange?: (value: string) => void;
}) {
  const { t } = useI18n();
  const [time, setTime] = useState(defaultValue);
  const [hour, minute] = time.split(":");
  function change(next: string) {
    setTime(next);
    onChange?.(next);
  }
  return (
    <div className="flex items-center gap-1">
      {name && <input type="hidden" name={name} value={time} />}
      <TimePart
        label={t.common.hour}
        value={hour}
        options={hours}
        onChange={(next) => change(`${next}:${minute}`)}
      />
      <span aria-hidden="true">:</span>
      <TimePart
        label={t.common.minute}
        value={minute}
        // Keeps a saved time that isn't on the 5-minute grid selectable.
        options={minutes.includes(minute) ? minutes : [minute, ...minutes]}
        onChange={(next) => change(`${hour}:${next}`)}
      />
    </div>
  );
}

// The value is "2026-11-18T09:00", or empty until a date is chosen.
export function DateTimePicker({
  id,
  name,
  defaultValue = "",
  defaultTime,
  invalid,
  describedBy,
  onChange,
}: {
  id?: string;
  name?: string;
  defaultValue?: string;
  defaultTime: string;
  invalid?: boolean;
  describedBy?: string;
  onChange?: (value: string) => void;
}) {
  const { locale, t } = useI18n();
  const [day, setDay] = useState(defaultValue.slice(0, 10));
  const [time, setTime] = useState(defaultValue.slice(11, 16) || defaultTime);
  const [open, setOpen] = useState(false);
  const date = day ? parse(day, "yyyy-MM-dd", new Date()) : undefined;
  const value = day && `${day}T${time}`;
  return (
    // Keys stay inside: inside a questionnaire, arrows would change the question.
    <div
      className="flex flex-wrap items-center gap-2"
      onKeyDown={(event) => event.stopPropagation()}
    >
      {name && <input type="hidden" name={name} value={value} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              id={id}
              className="min-w-48 flex-1 justify-start sm:flex-none"
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {date
            ? format(date, "d MMMM yyyy", { locale: dateLocales[locale] })
            : t.registration.chooseDate}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={dateLocales[locale]}
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown"
            startMonth={new Date(2020, 0)}
            endMonth={new Date(2040, 11)}
            onSelect={(next) => {
              const nextDay = next ? format(next, "yyyy-MM-dd") : "";
              setDay(nextDay);
              onChange?.(nextDay && `${nextDay}T${time}`);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <TimeSelect
        defaultValue={time}
        onChange={(next) => {
          setTime(next);
          onChange?.(day && `${day}T${next}`);
        }}
      />
    </div>
  );
}
