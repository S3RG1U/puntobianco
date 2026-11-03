"use client";
import { useEffect, useMemo, useState } from "react";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlaneLandingIcon,
  PlaneTakeoffIcon,
} from "lucide-react";
import { cn } from "cn";
import {
  DriverTransferCard,
  TransferRoute,
} from "@/components/team/driver-transfer-card";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/lib/i18n/client";
import { intlLocales, type Locale } from "@/lib/i18n/config";
import {
  addDays,
  CLINIC_TIME_ZONE,
  clinicDay,
  startOfWeek,
  type TransferEvent,
} from "@/lib/transfers/calendar";

const MAX_PILLS = 3;
const views = ["month", "week", "day"] as const;
type View = (typeof views)[number];

const clock = new Intl.DateTimeFormat("ro-RO", {
  timeZone: CLINIC_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toDay = (date: Date) => date.toISOString().slice(0, 10);
const startOfMonth = (day: string) => `${day.slice(0, 7)}-01`;
const addMonths = (day: string, amount: number) => {
  const date = toDate(startOfMonth(day));
  date.setUTCMonth(date.getUTCMonth() + amount);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(Number(day.slice(8)), lastDay));
  return toDay(date);
};
const dayFormatter =
  (locale: Locale) => (day: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocales[locale], {
      ...options,
      timeZone: "UTC",
    }).format(toDate(day));
const dayRange = (first: string, count: number) =>
  Array.from({ length: count }, (_, index) => addDays(first, index));

function visibleDays(view: View, anchor: string) {
  if (view === "day") return [anchor];
  if (view === "week") return dayRange(startOfWeek(anchor), 7);
  const first = startOfWeek(startOfMonth(anchor));
  const nextMonth = startOfMonth(addMonths(anchor, 1));
  const weeks = Math.ceil(
    (toDate(nextMonth).getTime() - toDate(first).getTime()) / (7 * 86400000),
  );
  return dayRange(first, weeks * 7);
}

function periodTitle(
  view: View,
  anchor: string,
  days: string[],
  format: ReturnType<typeof dayFormatter>,
) {
  if (view === "month")
    return format(anchor, { month: "long", year: "numeric" });
  if (view === "day")
    return format(anchor, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const first = days[0];
  const last = days[days.length - 1];
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  return `${format(first, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" })} – ${format(last, { day: "numeric", month: sameMonth ? "long" : "short", year: "numeric" })}`;
}

const legStyles = {
  arrival: {
    Icon: PlaneLandingIcon,
    className: "border-status-info/30 bg-status-info/15 text-status-info",
    dot: "bg-status-info",
  },
  departure: {
    Icon: PlaneTakeoffIcon,
    className:
      "border-status-success/30 bg-status-success/15 text-status-success",
    dot: "bg-status-success",
  },
};

function EventPill({ event }: { event: TransferEvent }) {
  const { t } = useI18n();
  const { Icon, className } = legStyles[event.leg];
  return (
    <HoverCard>
      <HoverCardTrigger render={<span />}>
        <span
          className={cn(
            "flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs",
            className,
          )}
        >
          {event.completedAt || event.pickedUp ? (
            <CheckIcon
              role="img"
              aria-label={event.completedAt ? t.transfers.details.completed : t.transfers.pickedUp}
              className="size-3 shrink-0"
            />
          ) : (
            <Icon aria-hidden className="size-3 shrink-0" />
          )}
          <span className="shrink-0 font-medium tabular-nums">
            {clock.format(new Date(event.start))}
          </span>
          <span className="truncate text-foreground">
            {event.names.join(", ")}
          </span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 max-w-[calc(100vw-2rem)]" align="start">
        <p className="mb-1 font-semibold">{event.names.join(", ")}</p>
        <p className="mb-3 text-xs text-muted-foreground">
          {t.transfers.legs[event.leg]} · {clock.format(new Date(event.start))}
        </p>
        <TransferRoute event={event} />
      </HoverCardContent>
    </HoverCard>
  );
}

type PickupToggle = (event: TransferEvent) => void;

function EventCard({
  event,
  onTransferChanged,
}: {
  event: TransferEvent;
  onTransferChanged?: PickupToggle;
}) {
  return (
    <DriverTransferCard
      key={event.id}
      event={event}
      canManage={!!onTransferChanged}
      onChanged={() => onTransferChanged?.(event)}
    />
  );
}

function MonthGrid({
  days,
  anchor,
  today,
  eventsByDay,
  onOpenDay,
}: {
  days: string[];
  anchor: string;
  today: string;
  eventsByDay: Map<string, TransferEvent[]>;
  onOpenDay: (day: string) => void;
}) {
  const { locale, t } = useI18n();
  const format = dayFormatter(locale);
  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
      {days.slice(0, 7).map((day) => (
        <div
          key={day}
          className="bg-muted/50 py-2 text-center text-xs font-medium text-muted-foreground capitalize"
        >
          {format(day, { weekday: "short" })}
        </div>
      ))}
      {days.map((day) => {
        const events = eventsByDay.get(day) ?? [];
        const outside = day.slice(0, 7) !== anchor.slice(0, 7);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onOpenDay(day)}
            aria-label={`${format(day, { weekday: "long", day: "numeric", month: "long" })}, ${t.transfers.dayCount(events.length)}`}
            aria-current={day === today ? "date" : undefined}
            className={cn(
              "flex min-h-16 min-w-0 flex-col items-stretch gap-1 bg-card p-1.5 text-left transition-colors hover:bg-accent focus-visible:relative focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none @2xl:min-h-28",
              outside && "bg-muted/30 text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center self-center rounded-full text-xs tabular-nums @2xl:self-start",
                day === today &&
                  "bg-primary font-semibold text-primary-foreground",
              )}
            >
              {Number(day.slice(8))}
            </span>
            <span className="hidden min-w-0 flex-col gap-1 @2xl:flex">
              {events.slice(0, MAX_PILLS).map((event) => (
                <EventPill key={event.id} event={event} />
              ))}
              {events.length > MAX_PILLS && (
                <span className="px-1 text-xs text-muted-foreground">
                  {t.transfers.more(events.length - MAX_PILLS)}
                </span>
              )}
            </span>
            <span className="flex flex-wrap justify-center gap-0.5 @2xl:hidden">
              {events.slice(0, 6).map((event) => (
                <span
                  key={event.id}
                  className={cn(
                    "size-1.5 rounded-full",
                    legStyles[event.leg].dot,
                  )}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WeekColumns({
  days,
  today,
  eventsByDay,
  onOpenDay,
  onTransferChanged,
}: {
  days: string[];
  today: string;
  eventsByDay: Map<string, TransferEvent[]>;
  onOpenDay: (day: string) => void;
  onTransferChanged?: PickupToggle;
}) {
  const { locale, t } = useI18n();
  const format = dayFormatter(locale);
  return (
    <div className="grid gap-3 @4xl:grid-cols-7 @4xl:gap-2">
      {days.map((day) => {
        const events = eventsByDay.get(day) ?? [];
        return (
          <section key={day} className="flex min-w-0 flex-col gap-2">
            <button
              type="button"
              onClick={() => onOpenDay(day)}
              aria-current={day === today ? "date" : undefined}
              className={cn(
                "flex items-baseline gap-2 rounded-md border-b px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none @4xl:flex-col @4xl:gap-0",
                day === today && "border-primary bg-primary/5",
              )}
            >
              <span className="text-xs text-muted-foreground capitalize">
                {format(day, { weekday: "short" })}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {Number(day.slice(8))}
              </span>
            </button>
            {events.length ? (
              <ul className="flex flex-col gap-2">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onTransferChanged={onTransferChanged}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-2 pb-1 text-xs text-muted-foreground">
                {t.transfers.none}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function DayList({
  events,
  onTransferChanged,
}: {
  events: TransferEvent[];
  onTransferChanged?: PickupToggle;
}) {
  const { t } = useI18n();
  if (!events.length)
    return (
      <p className="rounded-lg border border-dashed py-14 text-center text-sm text-muted-foreground">
        {t.transfers.noneToday}
      </p>
    );
  return (
    <ul className="flex flex-col gap-2">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onTransferChanged={onTransferChanged}
        />
      ))}
    </ul>
  );
}

export function TransferCalendar({
  canMarkPickup,
}: {
  canMarkPickup: boolean;
}) {
  const { locale, t } = useI18n();
  const [today] = useState(() => clinicDay(new Date()));
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(today);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    query: string;
    events: TransferEvent[];
    failed: boolean;
  }>({ query: "", events: [], failed: false });
  const days = useMemo(() => visibleDays(view, anchor), [view, anchor]);
  // One extra day on each side covers the clinic's UTC offset; events are
  // placed on their clinic-local day below.
  const query = `start=${addDays(days[0], -1)}T00:00:00Z&end=${addDays(days[days.length - 1], 2)}T00:00:00Z`;
  const loading = result.query !== `${query}#${version}`;

  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);
    window.addEventListener("clinic:updated", refresh);
    return () => window.removeEventListener("clinic:updated", refresh);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const key = `${query}#${version}`;
    fetch(`/api/transfers?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Calendar unavailable");
        return response.json() as Promise<TransferEvent[]>;
      })
      .then((events) => setResult({ query: key, events, failed: false }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setResult((current) => ({ ...current, query: key, failed: true }));
      });
    return () => controller.abort();
  }, [query, version]);

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, TransferEvent[]>();
    for (const event of [...result.events].sort((a, b) =>
      a.start.localeCompare(b.start),
    )) {
      const day = clinicDay(new Date(event.start));
      grouped.set(day, [...(grouped.get(day) ?? []), event]);
    }
    return grouped;
  }, [result.events]);

  const move = (direction: 1 | -1) =>
    setAnchor((current) =>
      view === "month"
        ? addMonths(current, direction)
        : addDays(current, direction * (view === "week" ? 7 : 1)),
    );
  const onTransferChanged = canMarkPickup
    ? () => setVersion((current) => current + 1)
    : undefined;
  const openDay = (day: string) => {
    setAnchor(day);
    setView("day");
  };

  return (
    <div className="@container flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={t.transfers.previous}
            onClick={() => move(-1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t.transfers.next}
            onClick={() => move(1)}
          >
            <ChevronRightIcon />
          </Button>
          <Button variant="outline" onClick={() => setAnchor(today)}>
            {t.transfers.today}
          </Button>
        </div>
        <h3
          aria-live="polite"
          className="min-w-0 flex-1 basis-48 text-lg font-semibold first-letter:uppercase"
        >
          {periodTitle(view, anchor, days, dayFormatter(locale))}
        </h3>
        <ToggleGroup
          variant="outline"
          value={[view]}
          onValueChange={(value) => {
            if (value[0]) setView(value[0] as View);
          }}
        >
          {views.map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {t.transfers.views[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="info">
          <PlaneLandingIcon aria-hidden />
          {t.transfers.legs.arrival}
        </Badge>
        <Badge variant="success">
          <PlaneTakeoffIcon aria-hidden />
          {t.transfers.legs.departure}
        </Badge>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {t.transfers.clinicTime} · {CLINIC_TIME_ZONE} ·{" "}
          {loading ? t.transfers.updating : t.transfers.autoUpdate}
        </span>
      </div>
      {result.failed && !loading && (
        <Alert variant="destructive">
          <AlertDescription>
            {t.transfers.loadFailed}{" "}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setVersion((current) => current + 1)}
            >
              {t.transfers.retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div
        aria-busy={loading}
        className={cn("transition-opacity", loading && "opacity-60")}
      >
        {view === "month" && (
          <MonthGrid
            days={days}
            anchor={anchor}
            today={today}
            eventsByDay={eventsByDay}
            onOpenDay={openDay}
          />
        )}
        {view === "week" && (
          <WeekColumns
            days={days}
            today={today}
            eventsByDay={eventsByDay}
            onOpenDay={openDay}
            onTransferChanged={onTransferChanged}
          />
        )}
        {view === "day" && (
          <DayList
            events={eventsByDay.get(anchor) ?? []}
            onTransferChanged={onTransferChanged}
          />
        )}
      </div>
    </div>
  );
}
