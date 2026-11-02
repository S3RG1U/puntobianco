import { Suspense } from "react";

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { can, parseRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard/sample-data";
import { getTransferSection } from "@/lib/dashboard/transfers";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.dashboard };
}

async function DashboardContent() {
  const { user } = await requireSession();
  const { locale, t } = await getI18n();
  const roles = parseRoles(user.role);
  const sample = getDashboardData(roles, t);
  const transfers = can(roles, "transfer", "read")
    ? await getTransferSection(t, locale)
    : null;
  const cards = transfers ? [...sample.cards, transfers.card] : sample.cards;
  const tabs = transfers ? [...sample.tabs, transfers.tab] : sample.tabs;

  if (tabs.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Alert>
          <AlertDescription>
            {t.dashboard.noRole}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <SectionCards cards={cards} />
      {sample.showArrivals && (
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
      )}
      <DataTable tabs={tabs} />
    </>
  );
}

export default async function DashboardPage() {
  const { user } = await requireSession();
  const { t } = await getI18n();
  const { hasSampleData } = getDashboardData(parseRoles(user.role), t);
  return (
    <>
      <SiteHeader title={t.nav.dashboard}>
        {hasSampleData && (
          <Badge variant="secondary">{t.dashboard.sampleData}</Badge>
        )}
      </SiteHeader>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <Suspense
              fallback={
                <div className="px-4 lg:px-6">
                  <Skeleton className="h-64 w-full rounded-xl" />
                </div>
              }
            >
              <DashboardContent />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
