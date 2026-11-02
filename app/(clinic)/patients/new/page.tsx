import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { RegistrationForm } from "@/components/patients/patient-questionnaire";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { getI18n } from "@/lib/i18n/server";
import { listTreatmentCoordinators } from "@/lib/patients/coordinators";
import { listTreatmentOptions } from "@/lib/patients/treatment-options";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.patients.register };
}
async function Content() {
  const { user } = await requireSession();
  if (!can(parseRoles(user.role), "patient", "create"))
    redirect("/patients");
  const [coordinators, treatments] = await Promise.all([
    listTreatmentCoordinators(),
    listTreatmentOptions(),
  ]);
  return <RegistrationForm coordinators={coordinators} treatments={treatments} />;
}
export default function Page() {
  return (
    <>
      <SiteHeader title="registerPatient" />
      <div className="mx-auto w-full max-w-4xl p-4 lg:p-6">
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Content />
        </Suspense>
      </div>
    </>
  );
}
