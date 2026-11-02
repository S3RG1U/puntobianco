"use client";

import type { ReactNode } from "react";

import { NotificationBell } from "@/components/team/team-updates";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Titles are looked up here so pages can stay static: the language comes from
// context on the client, and reading the cookie on the server would block them.
const titles = {
  dashboard: (t: Dictionary) => t.nav.dashboard,
  patients: (t: Dictionary) => t.patients.title,
  registerPatient: (t: Dictionary) => t.patients.register,
  editPatient: (t: Dictionary) => t.patients.editTitle,
  patientDetail: (t: Dictionary) => t.patientDetail.title,
  treatments: (t: Dictionary) => t.treatments.title,
  accommodations: (t: Dictionary) => t.accommodations.title,
  transfers: (t: Dictionary) => t.transfers.headerTitle,
  backOffice: (t: Dictionary) => t.backOffice.title,
  staff: (t: Dictionary) => t.staff.title,
  account: (t: Dictionary) => t.account.title,
};

export function SiteHeader({
  title,
  children,
}: {
  title: keyof typeof titles;
  children?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{titles[title](t)}</h1>
        <div className="ml-auto flex items-center gap-2">
          {children}
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
