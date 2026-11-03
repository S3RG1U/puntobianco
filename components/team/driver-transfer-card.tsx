"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CheckIcon,
  MapPinIcon,
  ClockIcon,
  PencilIcon,
  ArrowDownIcon,
} from "lucide-react";
import { toast } from "sonner";
import { updateTransferPlan } from "@/app/(clinic)/transfers/plan-actions";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n/client";
import { intlLocales } from "@/lib/i18n/config";
import {
  clinicDay,
  clinicTime,
  type TransferEvent,
} from "@/lib/transfers/calendar";

export function TransferRoute({ event }: { event: TransferEvent }) {
  const { t } = useI18n();
  const labels = t.transfers.details;
  return (
    <dl className="flex min-w-0 flex-col gap-3">
      {(
        [
          [labels.pickup, event.pickup],
          [labels.dropoff, event.dropoff],
        ] as const
      ).map(([label, location], index) => (
        <div key={label} className="flex gap-3">
          <div className="flex w-5 shrink-0 flex-col items-center gap-1 pt-0.5">
            {index === 0 ? (
              <MapPinIcon className="size-4 text-muted-foreground" />
            ) : (
              <ArrowDownIcon className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm">{location ?? labels.notSet}</dd>
          </div>
        </div>
      ))}
      {!!event.otherApartments?.length && (
        <div className="pl-8">
          <dt className="text-xs text-muted-foreground">{labels.otherStops}</dt>
          {event.otherApartments.map((a) => (
            <dd key={`${a.name}-${a.address}`} className="break-words text-sm">
              {a.name}
              {a.address && ` · ${a.address}`}
            </dd>
          ))}
        </div>
      )}
    </dl>
  );
}

export function DriverTransferCard({
  event: liveEvent,
  canManage,
  onChanged,
}: {
  event: TransferEvent;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [snapshot, setSnapshot] = useState(liveEvent);
  const [open, setOpen] = useState(false);
  const event = open ? snapshot : liveEvent;
  const { locale, t } = useI18n();
  const labels = t.transfers.details;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [editing, setEditing] = useState(false);
  const [moment, setMoment] = useState(
    `${clinicDay(new Date(event.start))}T${clinicTime(new Date(event.start))}`,
  );
  const [reason, setReason] = useState("");
  const [pickup, setPickup] = useState(event.pickup ?? "");
  const [dropoff, setDropoff] = useState(event.dropoff ?? "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const when = (value: string) =>
    new Intl.DateTimeFormat(intlLocales[locale], {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Chisinau",
    }).format(new Date(value));
  const clock = clinicTime(new Date(event.start));
  function save(intent: "reschedule" | "complete" | "reopen") {
    if (intent === "reschedule" && (!moment || !reason.trim())) {
      setError(labels.checkFields);
      return;
    }
    setError(undefined);
    start(async () => {
      try {
        const result = await updateTransferPlan({
          visitId: event.visitId,
          leg: event.leg,
          expectedStart: event.start,
          revision: event.revision ?? 0,
          intent,
          moment,
          reason,
          pickup: pickup === (event.pickup ?? "") ? undefined : pickup,
          dropoff: dropoff === (event.dropoff ?? "") ? undefined : dropoff,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        toast.success(
          intent === "complete" ? labels.completeSaved : labels.saved,
        );
        setEditing(false);
        setOpen(false);
        onChanged();
      } catch {
        setError(labels.failed);
      }
    });
  }
  const status = event.completedAt
    ? labels.completed
    : event.pickedUp
      ? t.transfers.pickedUp
      : labels.scheduled;
  return (
    <li className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold tabular-nums">
          <ClockIcon className="size-4" />
          {clock}
          <span className="text-sm font-normal text-muted-foreground">
            {t.transfers.legs[event.leg]}
          </span>
        </p>
        <Badge variant={event.completedAt ? "success" : "outline"}>
          {status}
        </Badge>
      </div>
      <p className="break-words font-medium">{event.names.join(", ")}</p>
      <TransferRoute event={event} />
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!pending) {
            if (next) {
              setSnapshot(liveEvent);
              setEditing(false);
              setReason("");
              setError(undefined);
              setMoment(
                `${clinicDay(new Date(liveEvent.start))}T${clinicTime(new Date(liveEvent.start))}`,
              );
              setPickup(liveEvent.pickup ?? "");
              setDropoff(liveEvent.dropoff ?? "");
            }
            setOpen(next);
          }
        }}
      >
        <SheetTrigger
          render={<Button variant="outline" className="min-h-11 w-full" />}
        >
          {labels.open}
        </SheetTrigger>
        <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b pr-12">
            <SheetTitle>{labels.title}</SheetTitle>
            <SheetDescription>
              {t.transfers.legs[event.leg]} · {event.names.join(", ")}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{when(event.start)}</p>
              <Badge variant={event.completedAt ? "success" : "outline"}>
                {status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{labels.timeZone}</p>
            <TransferRoute event={event} />
            {event.apartment && (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  {labels.apartment}
                </p>
                <p>{event.apartment.name}</p>
                <p className="text-sm break-words">{event.apartment.address}</p>
                {event.apartment.address && (
                  <Button
                    nativeButton={false}
                    variant="link"
                    className="h-auto justify-start px-0"
                    render={
                      <a
                        href={`https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: event.apartment.address })}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    {labels.navigate}
                  </Button>
                )}
              </div>
            )}
            {event.apartment && !event.apartment.address && (
              <Alert>
                <AlertDescription>{labels.addressMissing}</AlertDescription>
              </Alert>
            )}
            {event.memberVisitIds && event.memberVisitIds.length > 1 && (
              <p className="text-xs text-muted-foreground">{labels.shared}</p>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription role="alert">{error}</AlertDescription>
              </Alert>
            )}
            {editing ? (
              <form
                id={`transfer-edit-${event.id}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  save("reschedule");
                }}
                className="flex flex-col gap-4"
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`moment-${event.id}`}>
                      {labels.newMoment}
                    </FieldLabel>
                    <DateTimePicker
                      id={`moment-${event.id}`}
                      defaultValue={moment}
                      defaultTime="09:00"
                      onChange={setMoment}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`pickup-${event.id}`}>
                      {labels.pickup}
                    </FieldLabel>
                    <Input
                      id={`pickup-${event.id}`}
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      maxLength={500}
                      placeholder={labels.notSet}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`dropoff-${event.id}`}>
                      {labels.dropoff}
                    </FieldLabel>
                    <Input
                      id={`dropoff-${event.id}`}
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      maxLength={500}
                      placeholder={labels.notSet}
                    />
                  </Field>
                  <Field data-invalid={!!error && !reason.trim()}>
                    <FieldLabel htmlFor={`reason-${event.id}`}>
                      {labels.reason}
                    </FieldLabel>
                    <Textarea
                      id={`reason-${event.id}`}
                      required
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={labels.reasonPlaceholder}
                      aria-invalid={!!error && !reason.trim()}
                    />
                    {error && !reason.trim() && (
                      <FieldError>{labels.checkFields}</FieldError>
                    )}
                  </Field>
                </FieldGroup>
              </form>
            ) : (
              canManage &&
              !event.completedAt && (
                <Button
                  variant="outline"
                  className="min-h-11 w-full"
                  onClick={() => setEditing(true)}
                >
                  <PencilIcon data-icon="inline-start" />
                  {labels.edit}
                </Button>
              )
            )}
            <Separator />
            <section className="flex flex-col gap-3">
              <h3 className="font-medium">{labels.history}</h3>
              {!event.history?.length && (
                <p className="text-sm text-muted-foreground">
                  {labels.noHistory}
                </p>
              )}
              <ol className="flex flex-col gap-4">
                {[...(event.history ?? [])].reverse().map((entry) => (
                  <li key={entry.id} className="border-l-2 pl-3">
                    <p className="text-sm font-medium">
                      {entry.action === "reschedule"
                        ? labels.reschedule
                        : entry.action === "complete"
                          ? labels.completed
                          : labels.reopened}
                    </p>
                    {entry.action === "reschedule" && (
                      <p className="text-sm">
                        {when(entry.previousAt)} → {when(entry.scheduledAt)}
                      </p>
                    )}
                    {entry.reason && (
                      <p className="mt-1 break-words text-sm">{entry.reason}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {when(entry.occurredAt)}
                      {entry.actor && ` · ${entry.actor}`}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
          {canManage && (
            <SheetFooter className="shrink-0 border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
              {editing ? (
                <>
                  <Button
                    className="min-h-11 w-full"
                    form={`transfer-edit-${event.id}`}
                    type="submit"
                    disabled={pending}
                  >
                    {pending && <Spinner data-icon="inline-start" />}
                    {labels.save}
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-11 w-full"
                    disabled={pending}
                    onClick={() => {
                      setEditing(false);
                      setError(undefined);
                    }}
                  >
                    {labels.cancel}
                  </Button>
                </>
              ) : (
                <Button
                  className="min-h-11 w-full"
                  variant={event.completedAt ? "outline" : "default"}
                  disabled={
                    pending ||
                    (!event.completedAt &&
                      new Date(event.start).getTime() > now)
                  }
                  onClick={() =>
                    save(event.completedAt ? "reopen" : "complete")
                  }
                >
                  {pending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <CheckIcon data-icon="inline-start" />
                  )}
                  {event.completedAt ? labels.reopen : labels.complete}
                </Button>
              )}
              {!editing &&
                !event.completedAt &&
                new Date(event.start).getTime() > now && (
                  <p className="text-center text-xs text-muted-foreground">
                    {labels.tooEarly}
                  </p>
                )}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </li>
  );
}
