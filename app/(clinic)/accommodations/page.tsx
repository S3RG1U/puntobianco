import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { SiteHeader } from "@/components/site-header";
import {
  CreateApartmentDialog,
  ManageAccommodationDialog,
} from "@/components/accommodations/accommodation-dialogs";
import { StatusBadge } from "@/components/team/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const params = await searchParams;
  const page = Math.floor(
    Math.max(1, Math.min(100000, Number(params.page) || 1)),
  );
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
      )
      .limit(51)
      .offset((page - 1) * 50),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{labels.title}</h2>
          <p className="text-sm text-muted-foreground">
            {labels.subtitle}
          </p>
        </div>
        {can(roles, "accommodation", "create") && <CreateApartmentDialog />}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{labels.requests}</CardTitle>
          <CardDescription>
            {labels.requestsHelp}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.patient}</TableHead>
                <TableHead>{labels.stay}</TableHead>
                <TableHead>{t.common.type}</TableHead>
                <TableHead>{t.common.apartment}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead>{t.common.terms}</TableHead>
                <TableHead>
                  <span className="sr-only">{t.common.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests
                .slice(0, 50)
                .map(({ request, firstName, lastName, arrival, departure }) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {firstName} {lastName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(arrival, locale)} — {formatDate(departure, locale)}
                    </TableCell>
                    <TableCell>
                      {t.apartmentTypes[request.apartmentType]}
                    </TableCell>
                    <TableCell>
                      {apartments.find((a) => a.id === request.accommodationId)
                        ?.name ?? <Badge variant="secondary">{labels.unassigned}</Badge>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell>
                      {request.isFree
                        ? labels.freeTerms(request.freeDays)
                        : labels.paid}
                    </TableCell>
                    <TableCell>
                      {can(roles, "accommodation", "update") && (
                        <ManageAccommodationDialog
                          request={request}
                          apartments={apartments}
                          patientName={`${firstName} ${lastName}`}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              {!requests.length && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-28 text-center text-muted-foreground"
                  >
                    {labels.empty}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <nav
            aria-label={labels.pagesLabel}
            className="mt-4 flex items-center justify-end gap-3"
          >
            <span className="text-sm text-muted-foreground">{t.common.page(page)}</span>
            {page > 1 && (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`?page=${page - 1}`} />}
              >
                {t.common.previous}
              </Button>
            )}
            {requests.length > 50 && (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`?page=${page + 1}`} />}
              >
                {t.common.next}
              </Button>
            )}
          </nav>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.apartment}</TableHead>
                <TableHead>{t.common.type}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apartments.map((apartment) => (
                <TableRow key={apartment.id}>
                  <TableCell>{apartment.name}</TableCell>
                  <TableCell>
                    {t.apartmentTypes[apartment.apartmentType]}
                  </TableCell>
                </TableRow>
              ))}
              {!apartments.length && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {labels.noApartments}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getI18n();
  return (
    <>
      <SiteHeader title={t.accommodations.title} />
      <div className="p-4 lg:p-6">
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
