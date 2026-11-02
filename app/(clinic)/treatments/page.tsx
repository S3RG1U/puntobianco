import { Suspense } from "react";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { SiteHeader } from "@/components/site-header";
import {
  CreateTreatmentDialog,
  EditTreatmentDialog,
} from "@/components/treatments/treatment-dialogs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>{t.treatments.name}</TableHead>
              <TableHead>{t.treatments.category}</TableHead>
              <TableHead>{t.treatments.description}</TableHead>
              <TableHead className="text-right">
                {t.treatments.duration}
              </TableHead>
              {canEdit && (
                <TableHead>
                  <span className="sr-only">{t.common.actions}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((treatment) => (
              <TableRow key={treatment.id}>
                <TableCell className="font-medium">{treatment.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {t.treatments.categories[treatment.category]}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-64 whitespace-normal text-muted-foreground">
                  {treatment.description}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.treatments.minutes(treatment.durationMinutes)}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <EditTreatmentDialog treatment={treatment} />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell
                  colSpan={canEdit ? 5 : 4}
                  className="h-28 text-center text-muted-foreground"
                >
                  {t.treatments.empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <SiteHeader title={t.treatments.title} />
      <div className="p-4 lg:p-6">
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Content />
        </Suspense>
      </div>
    </>
  );
}
