import { Suspense } from "react";
import { redirect } from "next/navigation";
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
  if (!can(parseRoles(user.role), "transfer", "read")) redirect("/dashboard");
  return <TransferCalendar />;
}
export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <SiteHeader title={t.transfers.headerTitle} />
      <div className="flex flex-col gap-5 p-4 lg:p-6">
        <div>
          <h2 className="text-2xl font-semibold">{t.transfers.title}</h2>
          <p className="text-sm text-muted-foreground">
            {t.transfers.subtitle}
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Content />
        </Suspense>
      </div>
    </>
  );
}
