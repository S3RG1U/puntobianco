import { Card, CardContent } from "@/components/ui/card";
import { ResourceTable } from "@/components/data-table";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { PlusIcon } from "lucide-react";
import { PageContent } from "@/components/page-content";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { patients, patientVisits, users } from "@/lib/db/schema";
import { intlLocales, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.patients.title };
}
const formatDate = (date: Date, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocales[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Chisinau",
  }).format(date);
async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireSession();
  const { locale, t } = await getI18n();
  const roles = parseRoles(user.role);
  const canEdit = can(roles, "patient", "update");
  if (!can(roles, "patient", "read")) redirect("/dashboard");
  await searchParams;
  const rows = await db
    .select({
      id: patientVisits.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      arrival: patientVisits.arrivalAt,
      departure: patientVisits.departureAt,
      coordinator: users.name,
    })
    .from(patientVisits)
    .innerJoin(patients, eq(patients.id, patientVisits.patientId))
    .innerJoin(users, eq(users.id, patientVisits.coordinatorId))
    .orderBy(desc(patientVisits.createdAt), asc(patientVisits.id));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{t.patients.title}</h2>
          <p className="text-sm text-muted-foreground">{t.patients.subtitle}</p>
        </div>
        {can(roles, "patient", "create") && (
          <Button nativeButton={false} render={<Link href="/patients/new" />}>
            <PlusIcon data-icon="inline-start" />
            {t.patients.register}
          </Button>
        )}
      </div>
      <Card>
        <CardContent>
          <ResourceTable
            tab={{
              value: "patients",
              label: t.patients.title,
              columns: [
                { key: "name", header: t.common.patient },
                {
                  key: "arrival",
                  header: t.common.arrival,
                  sortKey: "arrivalSort",
                },
                {
                  key: "departure",
                  header: t.common.departure,
                  sortKey: "departureSort",
                },
                { key: "coordinator", header: t.common.coordinator },
                { key: "actions", header: t.common.actions },
              ],
              rows: rows.map((row) => ({
                _id: row.id,
                arrivalSort: row.arrival.toISOString(),
                departureSort: row.departure.toISOString(),
                name: `${row.firstName} ${row.lastName}`,
                arrival: formatDate(row.arrival, locale),
                departure: formatDate(row.departure, locale),
                coordinator: row.coordinator,
              })),
              cellContent: Object.fromEntries(
                rows.map((row) => [
                  row.id,
                  {
                    name: (
                      <Link href={`/patients/${row.id}`}>
                        {row.firstName} {row.lastName}
                      </Link>
                    ),
                    actions: (
                      <>
                        <Button
                          nativeButton={false}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          render={<Link href={`/patients/${row.id}`} />}
                        >
                          {t.patients.manage}
                        </Button>
                        {canEdit && (
                          <Button
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            render={<Link href={`/patients/${row.id}/edit`} />}
                          >
                            {t.patients.edit}
                          </Button>
                        )}
                      </>
                    ),
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
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <SiteHeader title="patients" />
      <PageContent>
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Content searchParams={searchParams} />
        </Suspense>
      </PageContent>
    </>
  );
}
