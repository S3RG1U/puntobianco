import { Card, CardContent } from "@/components/ui/card";
import { ResourceTable } from "@/components/data-table";
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
    .orderBy(asc(patientVisits.arrivalAt), asc(patientVisits.id));
  const timelines = await listVisitEvents(
    rows.map(({ visit }) => visit.id),
    roles,
  );
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold">{t.backOffice.title}</h2>
        <p className="text-sm text-muted-foreground">{t.backOffice.subtitle}</p>
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
      <Card>
        <CardContent>
          <ResourceTable
            tab={{
              value: "cases",
              label: t.backOffice.title,
              columns: [
                { key: "name", header: t.common.patient },
                { key: "arrival", header: t.common.arrival },
                { key: "status", header: t.common.status },
                { key: "assignee", header: t.backOffice.assignee },
                { key: "actions", header: t.common.actions },
              ],
              rows: rows.map(({ visit, firstName, lastName, assignee }) => ({
                _id: visit.id,
                name: `${firstName} ${lastName}`,
                arrival: new Intl.DateTimeFormat(intlLocales[locale], {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Europe/Chisinau",
                }).format(visit.arrivalAt),
                status: t.status[visit.backOfficeStatus],
                assignee: assignee ?? "—",
              })),
              cellContent: Object.fromEntries(
                rows.map(({ visit, firstName, lastName }) => [
                  visit.id,
                  {
                    name: (
                      <Link href={`/patients/${visit.id}`}>
                        {firstName} {lastName}
                      </Link>
                    ),
                    status: <StatusBadge status={visit.backOfficeStatus} />,
                    actions: (
                      <>
                        {can(roles, "backOfficeCase", "update") &&
                          (visit.backOfficeStatus === "pending" ? (
                            <CaseAction menuItem id={visit.id} action="start" />
                          ) : visit.backOfficeStatus === "in_progress" &&
                            (visit.backOfficeAssigneeId === user.id ||
                              roles.includes("admin")) ? (
                            <CaseAction
                              menuItem
                              id={visit.id}
                              action="complete"
                            />
                          ) : null)}
                        <VisitTimelineSheet
                          menuItem
                          patientName={`${firstName} ${lastName}`}
                          events={timelines.get(visit.id) ?? []}
                        />
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
