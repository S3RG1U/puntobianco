"use client";

import { useState } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useI18n } from "@/lib/i18n/client";
import { bookingWebSearch } from "@/lib/booking/search";
import { intlLocales } from "@/lib/i18n/config";

export function BookingSearchDialog({
  arrival,
  departure,
  apartmentType,
  today,
}: {
  arrival: string;
  departure: string;
  apartmentType: string;
  today: string;
}) {
  const { locale, t } = useI18n();
  const labels = t.accommodations.booking;
  const [adults, setAdults] = useState("1");
  const numberOfAdults = Number(adults);
  const datesValid = arrival >= today && departure > arrival;
  const guestsValid =
    Number.isInteger(numberOfAdults) &&
    numberOfAdults >= 1 &&
    numberOfAdults <= 30;
  const displayDate = (day: string) =>
    new Intl.DateTimeFormat(intlLocales[locale], {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(`${day}T00:00:00Z`));
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="w-full justify-start" />
        }
      >
        {labels.search}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.search}</DialogTitle>
          <DialogDescription>{labels.help}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt>{t.common.arrival}</dt>
          <dd>{displayDate(arrival)}</dd>
          <dt>{t.common.departure}</dt>
          <dd>{displayDate(departure)}</dd>
          <dt>{t.common.type}</dt>
          <dd>{apartmentType}</dd>
        </dl>
        <FieldGroup>
          <Field data-invalid={!guestsValid}>
            <FieldLabel htmlFor={`booking-adults-${arrival}-${departure}`}>
              {labels.adults}
            </FieldLabel>
            <Input
              id={`booking-adults-${arrival}-${departure}`}
              type="number"
              min={1}
              max={30}
              value={adults}
              onChange={(event) => setAdults(event.target.value)}
              aria-invalid={!guestsValid}
            />
          </Field>
        </FieldGroup>
        <p className="text-sm text-muted-foreground">{labels.layoutHelp}</p>
        {!datesValid && (
          <Alert>
            <AlertDescription>{labels.datesInvalid}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          {datesValid && guestsValid ? (
            <Button
              nativeButton={false}
              render={
                <a
                  href={bookingWebSearch(arrival, departure, numberOfAdults)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              {labels.open}
              <ExternalLinkIcon data-icon="inline-end" />
            </Button>
          ) : (
            <Button disabled>{labels.open}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
