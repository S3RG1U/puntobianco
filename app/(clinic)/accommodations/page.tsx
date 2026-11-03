import { BookingSearchDialog } from "@/components/accommodations/booking-search-dialog";
import { clinicDay } from "@/lib/transfers/calendar";
import { ResourceTable } from "@/components/data-table";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { PageContent } from "@/components/page-content";
import { SiteHeader } from "@/components/site-header";
import {
  CreateApartmentDialog,
  ManageAccommodationDialog,
} from "@/components/accommodations/accommodation-dialogs";
import { StatusBadge } from "@/components/team/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import {
  accommodations,
  patientAccommodations,
  patientVisits,
  patients,
} from "@/lib/db/schema";
import { intlLocales, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.accommodations.title };
}
const formatDate = (date: Date, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocales[locale], {
    dateStyle: "medium",
    timeZone: "Europe/Chisinau",
  }).format(date);
async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireSession();
  const { locale, t } = await getI18n();
  const labels = t.accommodations;
  const roles = parseRoles(user.role);
  if (!can(roles, "accommodation", "read")) redirect("/dashboard");
  await searchParams;
  const [apartments, requests] = await Promise.all([
    db.select().from(accommodations).orderBy(asc(accommodations.name)),
    db
      .select({
        request: patientAccommodations,
        firstName: patients.firstName,
        lastName: patients.lastName,
        arrival: patientVisits.arrivalAt,
        departure: patientVisits.departureAt,
      })
      .from(patientAccommodations)
      .innerJoin(
        patientVisits,
        eq(patientVisits.id, patientAccommodations.visitId),
      )
      .innerJoin(patients, eq(patients.id, patientVisits.patientId))
      .orderBy(
        asc(patientAccommodations.status),
        asc(patientVisits.arrivalAt),
        asc(patientAccommodations.id),
      ),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{labels.title}</h2>
          <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
        </div>
        {can(roles, "accommodation", "create") && <CreateApartmentDialog />}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{labels.requests}</CardTitle>
          <CardDescription>{labels.requestsHelp}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceTable
            tab={{
              value: "requests",
              label: labels.requests,
              columns: [
                { key: "name", header: t.common.patient },
                { key: "stay", header: labels.stay },
                { key: "type", header: t.common.type },
                { key: "apartment", header: t.common.apartment },
                { key: "status", header: t.common.status },
                { key: "terms", header: t.common.terms },
                { key: "actions", header: t.common.actions },
              ],
              rows: requests.map(
                ({ request, firstName, lastName, arrival, departure }) => ({
                  _id: request.id,
                  name: `${firstName} ${lastName}`,
                  stay: `${formatDate(arrival, locale)} — ${formatDate(departure, locale)}`,
                  type: t.apartmentTypes[request.apartmentType],
                  apartment:
                    apartments.find((a) => a.id === request.accommodationId)
                      ?.name ?? labels.unassigned,
                  status: t.status[request.status],
                  terms: request.isFree
                    ? labels.freeTerms(request.freeDays)
                    : labels.paid,
                }),
              ),
              cellContent: Object.fromEntries(
                requests.map(
                  ({ request, firstName, lastName, arrival, departure }) => [
                    request.id,
                    {
                      status: <StatusBadge status={request.status} />,
                      actions: can(roles, "accommodation", "update") ? (
                        <>
                          <ManageAccommodationDialog
                            menuItem
                            request={request}
                            apartments={apartments}
                            patientName={`${firstName} ${lastName}`}
                          />
                          <BookingSearchDialog
                            arrival={clinicDay(arrival)}
                            departure={clinicDay(departure)}
                            apartmentType={
                              t.apartmentTypes[request.apartmentType]
                            }
                            today={clinicDay(new Date())}
                          />
                        </>
                      ) : null,
                    },
                  ],
                ),
              ),
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{labels.inventory}</CardTitle>
          <CardDescription>
            {labels.inventoryHelp(apartments.length)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceTable
            tab={{
              value: "apartments",
              label: labels.inventory,
              columns: [
                { key: "name", header: t.common.apartment },
                { key: "type", header: t.common.type },
                { key: "address", header: labels.address },
                { key: "actions", header: t.common.actions },
              ],
              rows: apartments.map((a) => ({
                _id: a.id,
                name: a.name,
                type: t.apartmentTypes[a.apartmentType],
                address: a.address,
              })),
              cellContent: Object.fromEntries(
                apartments.map((a) => [
                  a.id,
                  {
                    name: (
                      <Link href={`/accommodations/${a.id}`}>{a.name}</Link>
                    ),
                    actions: (
                      <Button
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        render={<Link href={`/accommodations/${a.id}`} />}
                      >
                        {labels.availability} / {labels.location}
                      </Button>
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
      <SiteHeader title="accommodations" />
      <PageContent>
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Content searchParams={searchParams} />
        </Suspense>
      </PageContent>
    </>
  );
}
