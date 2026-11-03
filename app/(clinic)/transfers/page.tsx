import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageContent } from "@/components/page-content";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TransferCalendar } from "@/components/team/transfer-calendar";
import { requireSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { getI18n } from "@/lib/i18n/server";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.transfers.metadataTitle };
}
async function Content() {
  const { user } = await requireSession();
  const { t } = await getI18n();
  const roles = parseRoles(user.role);
  if (!can(roles, "transfer", "read")) redirect("/dashboard");
  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">{t.transfers.title}</h2>
        <p className="text-sm text-muted-foreground">{t.transfers.subtitle}</p>
      </div>
      <TransferCalendar canMarkPickup={can(roles, "transfer", "update")} />
    </>
  );
}
export default function Page() {
  return (
    <>
      <SiteHeader title="transfers" />
      <PageContent className="gap-5">
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Content />
        </Suspense>
      </PageContent>
    </>
  );
}
