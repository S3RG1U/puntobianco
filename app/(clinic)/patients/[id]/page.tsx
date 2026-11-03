import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { VisitTimeline } from "@/components/patients/visit-timeline";
import { PageContent } from "@/components/page-content";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db";
import {
  patients,
  patientVisits,
  patientCompanions,
  patientTransfers,
  patientAccommodations,
  accommodations,
  users,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { listVisitEvents } from "@/lib/patients/visit-events";
import { can, parseRoles } from "@/lib/auth/permissions";
import { intlLocales, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.patientDetail.title };
}
const formatDate = (date: Date, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocales[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Chisinau",
  }).format(date);
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSession();
  const { locale, t } = await getI18n();
  const labels = t.patientDetail;
  const roles = parseRoles(user.role);
  if (!can(roles, "patient", "read")) redirect("/dashboard");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [registration] = await db
    .select({
      visit: patientVisits,
      firstName: patients.firstName,
      lastName: patients.lastName,
      coordinator: users.name,
    })
    .from(patientVisits)
    .innerJoin(patients, eq(patients.id, patientVisits.patientId))
    .innerJoin(users, eq(users.id, patientVisits.coordinatorId))
    .where(eq(patientVisits.id, id));
  if (!registration) notFound();
  const [companions, accommodationRows, transferRows, accompanying] =
    await Promise.all([
      db
        .select({
          id: patientCompanions.id,
          visitId: patientCompanions.treatmentVisitId,
          firstName: patients.firstName,
          lastName: patients.lastName,
        })
        .from(patientCompanions)
        .innerJoin(patients, eq(patients.id, patientCompanions.patientId))
        .where(eq(patientCompanions.visitId, id)),
      can(roles, "accommodation", "read")
        ? db
            .select({
              request: patientAccommodations,
              apartment: accommodations.name,
            })
            .from(patientAccommodations)
            .leftJoin(
              accommodations,
              eq(accommodations.id, patientAccommodations.accommodationId),
            )
            .where(eq(patientAccommodations.visitId, id))
        : [],
      can(roles, "transfer", "read")
        ? db
            .select()
            .from(patientTransfers)
            .where(eq(patientTransfers.visitId, id))
        : [],
      db
        .select({
          visitId: patientCompanions.visitId,
          firstName: patients.firstName,
          lastName: patients.lastName,
        })
        .from(patientCompanions)
        .innerJoin(
          patientVisits,
          eq(patientVisits.id, patientCompanions.visitId),
        )
        .innerJoin(patients, eq(patients.id, patientVisits.patientId))
        .where(eq(patientCompanions.treatmentVisitId, id)),
    ]);
  const timeline = await listVisitEvents([id], roles);
  const accommodation = accommodationRows[0];
  const transfer = transferRows[0];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            {registration.firstName} {registration.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {labels.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/patients" />}
          >
            {labels.back}
          </Button>
          {can(roles, "patient", "update") && (
            <Button
              nativeButton={false}
              render={<Link href={`/patients/${id}/edit`} />}
            >
              {labels.edit}
            </Button>
          )}
        </div>
      </div>
      <Tabs defaultValue="overview" className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="overview">{labels.tabs.overview}</TabsTrigger>
          {can(roles, "treatment", "read") && (
            <TabsTrigger value="treatment">{labels.tabs.treatment}</TabsTrigger>
          )}
          {can(roles, "accommodation", "read") && (
            <TabsTrigger value="accommodation">
              {labels.tabs.accommodation}
            </TabsTrigger>
          )}
          {can(roles, "transfer", "read") && (
            <TabsTrigger value="transfer">{labels.tabs.transfer}</TabsTrigger>
          )}
          <TabsTrigger value="companions">{labels.tabs.companions}</TabsTrigger>
          <TabsTrigger value="history">{labels.tabs.history}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
      <Card>
        <CardHeader>
          <CardTitle>{labels.stay}</CardTitle>
          <CardDescription>
            {labels.responsible(registration.coordinator)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">{t.common.arrival}</dt>
              <dd>{formatDate(registration.visit.arrivalAt, locale)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t.common.departure}</dt>
              <dd>{formatDate(registration.visit.departureAt, locale)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">
                {labels.availability}
              </dt>
              <dd className="whitespace-pre-wrap break-words">
                {registration.visit.availabilityNotes ||
                  labels.noAvailability}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
        </TabsContent>
        {can(roles, "treatment", "read") && (
          <TabsContent value="treatment"><Card>
          <CardHeader>
            <CardTitle>{labels.plannedTreatment}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="whitespace-pre-wrap break-words">
              {registration.visit.treatment}
            </p>
            {registration.visit.treatmentNotes && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.registration.treatmentNotes}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  {registration.visit.treatmentNotes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        )}
        {can(roles, "accommodation", "read") && (
          <TabsContent value="accommodation"><Card>
            <CardHeader>
              <CardTitle>{labels.accommodation}</CardTitle>
            </CardHeader>
            <CardContent>
              {accommodation ? (
                <dl className="flex flex-col gap-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      {labels.requestedType}
                    </dt>
                    <dd>
                      {t.apartmentTypes[accommodation.request.apartmentType]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      {labels.assignedApartment}
                    </dt>
                    <dd>{accommodation.apartment || labels.notAssigned}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">{t.common.terms}</dt>
                    <dd>
                      {accommodation.request.isFree
                        ? labels.freeTerms(accommodation.request.freeDays)
                        : labels.paidAccommodation}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {labels.noAccommodation}
                </p>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        )}
        {can(roles, "transfer", "read") && (
          <TabsContent value="transfer"><Card>
            <CardHeader>
              <CardTitle>{labels.transfer}</CardTitle>
            </CardHeader>
            <CardContent>
              {transfer ? (
                <dl className="flex flex-col gap-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">{labels.journey}</dt>
                    <dd>
                      {transfer.direction === "round_trip"
                        ? labels.roundTrip
                        : transfer.oneWayLeg === "departure"
                          ? labels.oneWayDeparture
                          : labels.oneWayArrival}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">{t.common.terms}</dt>
                    <dd>
                      {transfer.isFree
                        ? labels.freeTransfer
                        : labels.paidTransfer}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {labels.noTransfer}
                </p>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        )}
        <TabsContent value="companions">
      <Card>
        <CardHeader>
          <CardTitle>{labels.companions}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {!companions.length && !accompanying.length && (
              <p className="text-sm text-muted-foreground">
                {labels.noCompanions}
              </p>
            )}
            {companions.map((companion) => (
              <div
                key={companion.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <p>
                  {companion.firstName} {companion.lastName}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {companion.visitId
                      ? labels.alsoTreated
                      : labels.accompanyingOnly}
                  </span>
                </p>
                {companion.visitId && (
                  <Link
                    className="text-sm underline underline-offset-4"
                    href={`/patients/${companion.visitId}`}
                  >
                    {labels.viewTreatment}
                  </Link>
                )}
              </div>
            ))}
            {accompanying.map((parent) => (
              <p key={parent.visitId}>
                {labels.accompanying}{" "}
                <Link
                  className="underline underline-offset-4"
                  href={`/patients/${parent.visitId}`}
                >
                  {parent.firstName} {parent.lastName}
                </Link>
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
        </TabsContent>
        <TabsContent value="history">
      <Card>
        <CardHeader>
          <CardTitle>{t.timeline.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitTimeline events={timeline.get(id) ?? []} />
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <>
      <SiteHeader title="patientDetail" />
      <PageContent>
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Content params={params} />
        </Suspense>
      </PageContent>
    </>
  );
}
