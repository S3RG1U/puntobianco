import type { Metadata } from "next";
import { Suspense } from "react";

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { parseRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard/sample-data";

export const metadata: Metadata = {
  title: "Dashboard",
};

async function DashboardContent() {
  const { user } = await requireSession();
  const { cards, tabs, showArrivals } = getDashboardData(parseRoles(user.role));

  if (tabs.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Alert>
          <AlertDescription>
            Your account has no role yet. Ask an administrator to assign one.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <SectionCards cards={cards} />
      {showArrivals && (
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
      )}
      <DataTable tabs={tabs} />
    </>
  );
}

export default function DashboardPage() {
  return (
    <>
      <SiteHeader title="Dashboard">
        <Badge variant="secondary">Sample data</Badge>
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
