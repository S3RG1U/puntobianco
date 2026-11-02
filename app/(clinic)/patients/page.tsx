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
          <h2 className="text-2xl font-semibold">{t.patients.title}</h2>
          <p className="text-sm text-muted-foreground">
            {t.patients.subtitle}
          </p>
        </div>
        {can(roles, "patient", "create") && (
          <Button
            nativeButton={false}
            render={<Link href="/patients/new" />}
          >
            <PlusIcon data-icon="inline-start" />
            {t.patients.register}
          </Button>
        )}
      </div>
      <form className="flex items-end gap-2">
        <Field className="max-w-sm">
          <FieldLabel htmlFor="patient-search">{t.patients.search}</FieldLabel>
          <Input
            id="patient-search"
            name="q"
            defaultValue={q}
            placeholder={t.patients.searchPlaceholder}
          />
        </Field>
        <Button variant="outline">{t.patients.searchButton}</Button>
      </form>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.patient}</TableHead>
              <TableHead>{t.common.arrival}</TableHead>
              <TableHead>{t.common.departure}</TableHead>
              <TableHead>{t.common.coordinator}</TableHead>
              {canEdit && (
                <TableHead>
                  <span className="sr-only">{t.common.actions}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 50).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <Link
                    className="underline-offset-4 hover:underline focus-visible:underline"
                    href={`/patients/${row.id}`}
                  >
                    {row.firstName} {row.lastName}
                  </Link>
                </TableCell>
                <TableCell>{formatDate(row.arrival, locale)}</TableCell>
                <TableCell>{formatDate(row.departure, locale)}</TableCell>
                <TableCell>{row.coordinator}</TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <Button
                      nativeButton={false}
                      variant="outline"
                      size="sm"
                      aria-label={t.patients.editFor(
                        `${row.firstName} ${row.lastName}`,
                      )}
                      render={<Link href={`/patients/${row.id}/edit`} />}
                    >
                      {t.patients.edit}
                    </Button>
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
                  {q ? t.patients.noMatch : t.patients.empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <nav
        aria-label={t.patients.pagesLabel}
        className="flex items-center justify-end gap-3"
      >
        <span className="text-sm text-muted-foreground">
          {t.common.page(Math.floor(page))}
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
            {t.common.previous}
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
            {t.common.next}
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
      <SiteHeader title="patients" />
      <div className="p-4 lg:p-6">
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
