import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { RegistrationForm } from "@/components/patients/registration-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { getI18n } from "@/lib/i18n/server";
import { listTreatmentCoordinators } from "@/lib/patients/coordinators";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.patients.register };
}
async function Content() {
  const { user } = await requireSession();
  if (!can(parseRoles(user.role), "patient", "create"))
    redirect("/patients");
  return <RegistrationForm coordinators={await listTreatmentCoordinators()} />;
}
export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <SiteHeader title={t.patients.register} />
      <div className="mx-auto w-full max-w-4xl p-4 lg:p-6">
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Content />
        </Suspense>
      </div>
    </>
  );
}
