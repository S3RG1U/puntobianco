import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { patientVisits, patients, users } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { intlLocales } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/team/status-badge";
import { CaseAction } from "@/components/team/case-action";
import { VisitTimelineSheet } from "@/components/patients/visit-timeline";
import { listVisitEvents } from "@/lib/patients/visit-events";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.backOffice.title };
}
async function Content({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireSession();
  const { locale, t } = await getI18n();
  const roles = parseRoles(user.role);
  if (!can(roles, "backOfficeCase", "read")) redirect("/dashboard");
  const params = await searchParams;
  const completed = params.status === "completed";
  const page = Math.floor(
    Math.max(1, Math.min(100000, Number(params.page) || 1)),
  );
  const rows = await db
    .select({
      visit: patientVisits,
      firstName: patients.firstName,
      lastName: patients.lastName,
      assignee: users.name,
    })
    .from(patientVisits)
    .innerJoin(patients, eq(patients.id, patientVisits.patientId))
    .leftJoin(users, eq(users.id, patientVisits.backOfficeAssigneeId))
    .where(
      completed
        ? eq(patientVisits.backOfficeStatus, "completed")
        : ne(patientVisits.backOfficeStatus, "completed"),
    )
    .orderBy(asc(patientVisits.arrivalAt), asc(patientVisits.id))
    .limit(51)
    .offset((page - 1) * 50);
  const timelines = await listVisitEvents(
    rows.slice(0, 50).map(({ visit }) => visit.id),
    roles,
  );
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold">{t.backOffice.title}</h2>
        <p className="text-sm text-muted-foreground">
          {t.backOffice.subtitle}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          nativeButton={false}
          variant={completed ? "outline" : "default"}
          render={<Link href="?status=open" />}
        >
          {t.backOffice.active}
        </Button>
        <Button
          nativeButton={false}
          variant={completed ? "default" : "outline"}
          render={<Link href="?status=completed" />}
        >
          {t.backOffice.completed}
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.patient}</TableHead>
              <TableHead>{t.common.arrival}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead>{t.backOffice.assignee}</TableHead>
              <TableHead>{t.backOffice.action}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows
              .slice(0, 50)
              .map(({ visit, firstName, lastName, assignee }) => (
                <TableRow key={visit.id}>
                  <TableCell>
                    <Link
                      className="hover:underline"
                      href={`/patients/${visit.id}`}
                    >
                      {firstName} {lastName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {new Intl.DateTimeFormat(intlLocales[locale], {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/Chisinau",
                    }).format(visit.arrivalAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={visit.backOfficeStatus} />
                  </TableCell>
                  <TableCell>{assignee ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {can(roles, "backOfficeCase", "update") &&
                        (visit.backOfficeStatus === "pending" ? (
                          <CaseAction id={visit.id} action="start" />
                        ) : visit.backOfficeStatus === "in_progress" &&
                          (visit.backOfficeAssigneeId === user.id ||
                            roles.includes("admin")) ? (
                          <CaseAction id={visit.id} action="complete" />
                        ) : null)}
                      <VisitTimelineSheet
                        patientName={`${firstName} ${lastName}`}
                        events={timelines.get(visit.id) ?? []}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            {!rows.length && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t.backOffice.empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <nav className="flex justify-end gap-3" aria-label={t.backOffice.pagesLabel}>
        <span>{t.common.page(page)}</span>
        {page > 1 && (
          <Button
            nativeButton={false}
            variant="outline"
            render={
              <Link
                href={`?status=${completed ? "completed" : "open"}&page=${page - 1}`}
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
                href={`?status=${completed ? "completed" : "open"}&page=${page + 1}`}
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
export default function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <SiteHeader title="backOffice" />
      <div className="p-4 lg:p-6">
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <Content {...props} />
        </Suspense>
      </div>
    </>
  );
}
