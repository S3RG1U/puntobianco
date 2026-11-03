import { Card, CardContent } from "@/components/ui/card";
import { ResourceTable } from "@/components/data-table";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { PageContent } from "@/components/page-content";
import { SiteHeader } from "@/components/site-header";
import {
  CreateTreatmentDialog,
  EditTreatmentDialog,
} from "@/components/treatments/treatment-dialogs";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { treatments, treatmentCategoryValues } from "@/lib/db/schema";
import { getI18n } from "@/lib/i18n/server";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.treatments.title };
}
async function Content() {
  const { user } = await requireSession();
  const { t } = await getI18n();
  const roles = parseRoles(user.role);
  if (!can(roles, "treatment", "read")) redirect("/dashboard");
  const canEdit = can(roles, "treatment", "update");
  const rows = await db.select().from(treatments).orderBy(asc(treatments.name));
  const order = (category: (typeof rows)[number]["category"]) =>
    treatmentCategoryValues.indexOf(category);
  const sorted = rows.toSorted((a, b) => order(a.category) - order(b.category));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{t.treatments.title}</h2>
          <p className="text-sm text-muted-foreground">
            {t.treatments.subtitle}
          </p>
        </div>
        {can(roles, "treatment", "create") && <CreateTreatmentDialog />}
      </div>
      <Card>
        <CardContent>
          <ResourceTable
            tab={{
              value: "treatments",
              label: t.treatments.title,
              columns: [
                { key: "name", header: t.treatments.name },
                { key: "category", header: t.treatments.category },
                { key: "description", header: t.treatments.description },
                { key: "duration", header: t.treatments.duration },
                ...(canEdit
                  ? [{ key: "actions", header: t.common.actions }]
                  : []),
              ],
              rows: sorted.map((row) => ({
                _id: row.id,
                name: row.name,
                category: t.treatments.categories[row.category],
                description: row.description ?? "",
                duration: t.treatments.minutes(row.durationMinutes),
              })),
              cellContent: Object.fromEntries(
                sorted.map((row) => [
                  row.id,
                  {
                    actions: canEdit ? (
                      <EditTreatmentDialog menuItem treatment={row} />
                    ) : null,
                  },
                ]),
              ),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
export default function Page() {
  return (
    <>
      <SiteHeader title="treatments" />
      <PageContent>
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Content />
        </Suspense>
      </PageContent>
    </>
  );
}
