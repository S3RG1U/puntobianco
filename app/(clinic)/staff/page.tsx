import { Card, CardContent } from "@/components/ui/card";
import { ResourceTable } from "@/components/data-table";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageContent } from "@/components/page-content";
import { SiteHeader } from "@/components/site-header";
import { CreateStaffDialog } from "@/components/staff/create-staff-dialog";
import { EditRolesDialog } from "@/components/staff/edit-roles-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { users as staffUsers } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { can, parseRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.staff.title };
}

async function StaffContent({
  searchParams,
}: Pick<PageProps<"/staff">, "searchParams">) {
  const { user } = await requireSession();
  const { t } = await getI18n();
  if (!can(parseRoles(user.role), "user", "list")) redirect("/dashboard");

  await searchParams;
  const users = await db
    .select({
      id: staffUsers.id,
      name: staffUsers.name,
      email: staffUsers.email,
      role: staffUsers.role,
    })
    .from(staffUsers)
    .orderBy(asc(staffUsers.name));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{t.staff.subtitle}</p>
        <CreateStaffDialog />
      </div>
      <Card>
        <CardContent>
          <ResourceTable
            tab={{
              value: "staff",
              label: t.staff.title,
              columns: [
                { key: "name", header: t.staff.member },
                { key: "email", header: "Email" },
                { key: "roles", header: t.staff.roles },
                { key: "actions", header: t.common.actions },
              ],
              rows: users.map((member) => ({
                _id: member.id,
                name: member.name,
                email: member.email,
                roles: parseRoles(member.role)
                  .map((role) => t.roles[role].label)
                  .join(", "),
              })),
              cellContent: Object.fromEntries(
                users.map((member) => [
                  member.id,
                  {
                    actions: (
                      <EditRolesDialog
                        menuItem
                        userId={member.id}
                        userName={member.name}
                        currentRoles={parseRoles(member.role)}
                      />
                    ),
                  },
                ]),
              ),
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}

export default function StaffPage({ searchParams }: PageProps<"/staff">) {
  return (
    <>
      <SiteHeader title="staff" />
      <PageContent>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <StaffContent searchParams={searchParams} />
        </Suspense>
      </PageContent>
    </>
  );
}
