"use client";

import { useActionState, useState } from "react";
import { format, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { dateLocales } from "@/components/forms/date-time-picker";
import { useI18n } from "@/lib/i18n/client";
import { intlLocales } from "@/lib/i18n/config";
import { initialFormState } from "@/lib/patients/form-schema";
import { updateApartmentAddress } from "@/app/(clinic)/accommodations/actions";

export type Reservation = {
  id: string;
  arrival: string;
  departure: string;
  firstDay: string;
  lastDay: string;
};
export function ApartmentAvailability({
  reservations,
  today,
}: {
  reservations: Reservation[];
  today: string;
}) {
  const { locale, t } = useI18n();
  const labels = t.accommodations;
  const [date, setDate] = useState<Date | undefined>(() => parseISO(today));
  const key = date ? format(date, "yyyy-MM-dd") : "";
  const bookings = reservations.filter(
    (booking) => booking.firstDay <= key && booking.lastDay >= key,
  );
  const time = (value: string) =>
    new Intl.DateTimeFormat(intlLocales[locale], {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Chisinau",
    }).format(new Date(value));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.availability}</CardTitle>
        <CardDescription>{labels.availabilityHelp}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-start gap-6">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          defaultMonth={parseISO(today)}
          today={parseISO(today)}
          locale={dateLocales[locale]}
          modifiers={{
            occupied: (day) => {
              const value = format(day, "yyyy-MM-dd");
              return reservations.some(
                (booking) =>
                  booking.firstDay <= value && booking.lastDay >= value,
              );
            },
          }}
          modifiersClassNames={{
            occupied: "bg-destructive/15 text-destructive rounded-md",
          }}
        />
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Badge variant="outline">{labels.available}</Badge>
            <Badge variant="destructive">{labels.occupied}</Badge>
          </div>
          {date && (
            <>
              <p>{format(date, "PPP", { locale: dateLocales[locale] })}</p>
              <Badge variant={bookings.length ? "destructive" : "secondary"}>
                {bookings.length ? labels.occupied : labels.available}
              </Badge>
              {bookings.map((booking) => (
                <p key={booking.id} className="text-sm">
                  {time(booking.arrival)} — {time(booking.departure)}
                </p>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ApartmentAddressForm({
  id,
  address,
}: {
  id: string;
  address: string;
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(
    updateApartmentAddress,
    initialFormState,
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <FieldGroup>
        <Field data-invalid={!!state.errors?.address}>
          <FieldLabel htmlFor="address">{t.accommodations.address}</FieldLabel>
          <Input
            id="address"
            name="address"
            defaultValue={address}
            required
            maxLength={500}
            aria-invalid={!!state.errors?.address}
            placeholder={t.accommodations.addressHelp}
          />
          {state.errors?.address && (
            <FieldError>{state.errors.address}</FieldError>
          )}
        </Field>
      </FieldGroup>
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      {state.status === "success" && (
        <p role="status">{t.accommodations.addressSaved}</p>
      )}
      <Button disabled={pending} className="self-start">
        {t.accommodations.saveAddress}
      </Button>
    </form>
  );
}
