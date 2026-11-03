import { Suspense } from "react";
import { AccountSettings } from "@/components/account/account-settings";
import { PageContent } from "@/components/page-content";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.account.title };
}
async function Content() {
  const { user } = await requireSession();
  return <AccountSettings name={user.name} email={user.email} />;
}
export default function Page() {
  return (
    <>
      <SiteHeader title="account" />
      <PageContent>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Content />
        </Suspense>
      </PageContent>
    </>
  );
}
