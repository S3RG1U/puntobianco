import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
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
import { can, parseRoles } from "@/lib/auth/permissions";
import { apartmentLabels } from "@/lib/patients/form-schema";

export const metadata = { title: "Patient registration" };
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Chisinau",
  }).format(date);
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSession();
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
  const accommodation = accommodationRows[0];
  const transfer = transferRows[0];
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            {registration.firstName} {registration.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Patient registration · clinic time (Europe/Chisinau)
          </p>
        </div>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/dashboard/patients" />}
        >
          Back to patients
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Stay details</CardTitle>
          <CardDescription>
            Responsible coordinator: {registration.coordinator}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Arrival</dt>
              <dd>{formatDate(registration.visit.arrivalAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Departure</dt>
              <dd>{formatDate(registration.visit.departureAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">
                Availability during the stay
              </dt>
              <dd className="whitespace-pre-wrap break-words">
                {registration.visit.availabilityNotes ||
                  "No availability notes provided."}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      {can(roles, "treatment", "read") && (
        <Card>
          <CardHeader>
            <CardTitle>Planned treatment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap break-words">
              {registration.visit.treatment}
            </p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Companions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {!companions.length && !accompanying.length && (
              <p className="text-sm text-muted-foreground">
                No companion registered for this visit.
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
                      ? "Also receiving treatment"
                      : "Accompanying only"}
                  </span>
                </p>
                {companion.visitId && (
                  <Link
                    className="text-sm underline underline-offset-4"
                    href={`/dashboard/patients/${companion.visitId}`}
                  >
                    View treatment registration
                  </Link>
                )}
              </div>
            ))}
            {accompanying.map((parent) => (
              <p key={parent.visitId}>
                Accompanying{" "}
                <Link
                  className="underline underline-offset-4"
                  href={`/dashboard/patients/${parent.visitId}`}
                >
                  {parent.firstName} {parent.lastName}
                </Link>
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 sm:grid-cols-2">
        {can(roles, "accommodation", "read") && (
          <Card>
            <CardHeader>
              <CardTitle>Accommodation</CardTitle>
            </CardHeader>
            <CardContent>
              {accommodation ? (
                <dl className="flex flex-col gap-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Requested type
                    </dt>
                    <dd>
                      {apartmentLabels[accommodation.request.apartmentType]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Assigned apartment
                    </dt>
                    <dd>{accommodation.apartment || "Not yet assigned"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Terms</dt>
                    <dd>
                      {accommodation.request.isFree
                        ? `${accommodation.request.freeDays} complimentary days; remaining days paid`
                        : "Paid accommodation"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No accommodation requested.
                </p>
              )}
            </CardContent>
          </Card>
        )}
        {can(roles, "transfer", "read") && (
          <Card>
            <CardHeader>
              <CardTitle>Transfer</CardTitle>
            </CardHeader>
            <CardContent>
              {transfer ? (
                <dl className="flex flex-col gap-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">Journey</dt>
                    <dd>
                      {transfer.direction === "round_trip"
                        ? "Round trip"
                        : "One way"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Terms</dt>
                    <dd>
                      {transfer.isFree
                        ? "Complimentary transfer"
                        : "Paid transfer"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No transfer requested.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <SiteHeader title="Patient registration" />
      <div className="p-4 lg:p-6">
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Content params={params} />
        </Suspense>
      </div>
    </>
  );
}
