import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { PlusIcon } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
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
import { patients, patientVisits, users } from "@/lib/db/schema";
export const metadata = { title: "Patients" };
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
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
  const roles = parseRoles(user.role);
  if (!can(roles, "patient", "read")) redirect("/dashboard");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const page = Math.max(1, Math.min(100000, Number(params.page) || 1));
  const filter = q
    ? or(
        ilike(patients.firstName, `%${q}%`),
        ilike(patients.lastName, `%${q}%`),
        ilike(
          sql`${patients.firstName} || ' ' || ${patients.lastName}`,
          `%${q}%`,
        ),
      )
    : undefined;
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
    .where(and(filter))
    .orderBy(desc(patientVisits.createdAt), asc(patientVisits.id))
    .limit(51)
    .offset((Math.floor(page) - 1) * 50);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Patients</h2>
          <p className="text-sm text-muted-foreground">
            Registrations and upcoming stays. Times shown in clinic time.
          </p>
        </div>
        {can(roles, "patient", "create") && (
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/patients/new" />}
          >
            <PlusIcon data-icon="inline-start" />
            Register patient
          </Button>
        )}
      </div>
      <form className="flex items-end gap-2">
        <Field className="max-w-sm">
          <FieldLabel htmlFor="patient-search">Search patients</FieldLabel>
          <Input
            id="patient-search"
            name="q"
            defaultValue={q}
            placeholder="First or last name"
          />
        </Field>
        <Button variant="outline">Search</Button>
      </form>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Arrival</TableHead>
              <TableHead>Departure</TableHead>
              <TableHead>Coordinator</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 50).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <Link
                    className="underline-offset-4 hover:underline focus-visible:underline"
                    href={`/dashboard/patients/${row.id}`}
                  >
                    {row.firstName} {row.lastName}
                  </Link>
                </TableCell>
                <TableCell>{formatDate(row.arrival)}</TableCell>
                <TableCell>{formatDate(row.departure)}</TableCell>
                <TableCell>{row.coordinator}</TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-28 text-center text-muted-foreground"
                >
                  {q
                    ? "No patients match your search."
                    : "No registrations yet. Register your first patient to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <nav
        aria-label="Patient pages"
        className="flex items-center justify-end gap-3"
      >
        <span className="text-sm text-muted-foreground">
          Page {Math.floor(page)}
        </span>
        {page > 1 && (
          <Button
            nativeButton={false}
            variant="outline"
            render={
              <Link
                href={`?q=${encodeURIComponent(q)}&page=${Math.floor(page) - 1}`}
              />
            }
          >
            Previous
          </Button>
        )}
        {rows.length > 50 && (
          <Button
            nativeButton={false}
            variant="outline"
            render={
              <Link
                href={`?q=${encodeURIComponent(q)}&page=${Math.floor(page) + 1}`}
              />
            }
          >
            Next
          </Button>
        )}
      </nav>
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
      <SiteHeader title="Patients" />
      <div className="p-4 lg:p-6">
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
