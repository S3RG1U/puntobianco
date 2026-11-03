"use client";

import {
  BedDoubleIcon,
  BriefcaseIcon,
  CarIcon,
  CheckCheckIcon,
  HistoryIcon,
  PencilIcon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n/client";
import { intlLocales } from "@/lib/i18n/config";
import type { VisitEventView } from "@/lib/patients/visit-events";

const icons: Record<VisitEventView["type"], LucideIcon> = {
  registered: UserPlusIcon,
  patient_updated: PencilIcon,
  case_started: BriefcaseIcon,
  case_completed: CheckCheckIcon,
  apartment_assigned: BedDoubleIcon,
  apartment_released: BedDoubleIcon,
  transfer_picked_up: CarIcon,
};

export function VisitTimeline({ events }: { events: VisitEventView[] }) {
  const { locale, t } = useI18n();
  if (!events.length)
    return <p className="text-sm text-muted-foreground">{t.timeline.empty}</p>;
  const when = new Intl.DateTimeFormat(intlLocales[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Chisinau",
  });
  return (
    <ol className="flex flex-col">
      {events.map((event, index) => {
        const Icon = icons[event.type];
        const detail = [
          event.leg && t.transfers.legs[event.leg],
          event.apartmentName,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                <Icon aria-hidden className="size-4" />
              </span>
              {index < events.length - 1 && (
                <span aria-hidden className="w-px flex-1 bg-border" />
              )}
            </div>
            <div className="min-w-0 pb-5">
              <p className="text-sm font-medium">
                {t.timeline.events[event.type]}
                {detail && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {detail}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                <time dateTime={event.occurredAt.toISOString()}>
                  {when.format(event.occurredAt)}
                </time>
                {event.actorName && ` · ${t.timeline.by(event.actorName)}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function VisitTimelineSheet({
  menuItem = false,
  patientName,
  events,
}: {
  menuItem?: boolean;
  patientName: string;
  events: VisitEventView[];
}) {
  const { t } = useI18n();
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={menuItem ? "w-full justify-start" : undefined}
          />
        }
        aria-label={t.timeline.openFor(patientName)}
      >
        <HistoryIcon data-icon="inline-start" />
        {t.timeline.open}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t.timeline.title}</SheetTitle>
          <SheetDescription>{patientName}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <VisitTimeline events={events} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
