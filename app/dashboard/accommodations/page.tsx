import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { SiteHeader } from "@/components/site-header";
import {
  CreateApartmentDialog,
  ManageAccommodationDialog,
} from "@/components/accommodations/accommodation-dialogs";
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
import { apartmentLabels } from "@/lib/patients/form-schema";
export const metadata = { title: "Accommodation" };
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/Chisinau",
  }).format(date);
async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireSession();
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
      .orderBy(desc(patientVisits.arrivalAt), asc(patientAccommodations.id))
      .limit(51)
      .offset((page - 1) * 50),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Accommodation</h2>
          <p className="text-sm text-muted-foreground">
            Manage patient stays and assign matching apartments.
          </p>
        </div>
        {can(roles, "accommodation", "create") && <CreateApartmentDialog />}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Patient requests</CardTitle>
          <CardDescription>
            Requests are created during patient registration. Apartment
            availability is checked on assignment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Stay</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Apartment</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
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
                      {formatDate(arrival)} — {formatDate(departure)}
                    </TableCell>
                    <TableCell>
                      {apartmentLabels[request.apartmentType]}
                    </TableCell>
                    <TableCell>
                      {apartments.find((a) => a.id === request.accommodationId)
                        ?.name ?? <Badge variant="secondary">Unassigned</Badge>}
                    </TableCell>
                    <TableCell>
                      {request.isFree
                        ? `${request.freeDays} complimentary days`
                        : "Paid"}
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
                    colSpan={6}
                    className="h-28 text-center text-muted-foreground"
                  >
                    No accommodation requests yet. Select “Accommodation needed”
                    when registering a patient.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <nav
            aria-label="Accommodation pages"
            className="mt-4 flex items-center justify-end gap-3"
          >
            <span className="text-sm text-muted-foreground">Page {page}</span>
            {page > 1 && (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`?page=${page - 1}`} />}
              >
                Previous
              </Button>
            )}
            {requests.length > 50 && (
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`?page=${page + 1}`} />}
              >
                Next
              </Button>
            )}
          </nav>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Apartment inventory</CardTitle>
          <CardDescription>
            {apartments.length} apartments available for assignment. An
            apartment may already be booked for a particular stay.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apartment</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apartments.map((apartment) => (
                <TableRow key={apartment.id}>
                  <TableCell>{apartment.name}</TableCell>
                  <TableCell>
                    {apartmentLabels[apartment.apartmentType]}
                  </TableCell>
                </TableRow>
              ))}
              {!apartments.length && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No apartments added yet.
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
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <SiteHeader title="Accommodation" />
      <div className="p-4 lg:p-6">
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
