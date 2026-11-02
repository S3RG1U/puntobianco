import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SiteHeader } from "@/components/site-header";
import { CreateStaffDialog } from "@/components/staff/create-staff-dialog";
import { EditRolesDialog } from "@/components/staff/edit-roles-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { can, parseRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.staff.title };
}

const pageSize = 50;

async function StaffContent({
  searchParams,
}: Pick<PageProps<"/staff">, "searchParams">) {
  const { user } = await requireSession();
  const { t } = await getI18n();
  if (!can(parseRoles(user.role), "user", "list")) redirect("/dashboard");

  const params = await searchParams;
  const requestedPage = Number(params.page ?? 1);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) redirect("/staff");

  const { users, total } = await auth.api.listUsers({
    query: {
      limit: pageSize,
      offset,
      sortBy: "createdAt",
      sortDirection: "asc",
    },
    headers: await headers(),
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (page > pageCount) redirect(`/staff?page=${pageCount}`);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {t.staff.subtitle}
        </p>
        <CreateStaffDialog />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>{t.staff.member}</TableHead>
              <TableHead>{t.staff.roles}</TableHead>
              <TableHead>
                <span className="sr-only">{t.common.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((staffMember) => {
              const staffRoles = parseRoles(staffMember.role);

              return (
                <TableRow key={staffMember.id}>
                  <TableCell>
                    <div className="font-medium">
                      {staffMember.name}
                      {staffMember.id === user.id && (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          {t.staff.you}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {staffMember.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {staffRoles.length > 0 ? (
                        staffRoles.map((role) => (
                          <Badge key={role} variant="secondary">
                            {t.roles[role].label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">{t.staff.noRole}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <EditRolesDialog
                      userId={staffMember.id}
                      userName={staffMember.name}
                      currentRoles={staffRoles}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <nav
        aria-label={t.staff.pagesLabel}
        className="flex items-center justify-end gap-4"
      >
        <span className="text-sm text-muted-foreground">
          {t.staff.pageSummary(page, pageCount, total)}
        </span>
        {page > 1 && (
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/staff?page=${page - 1}`} />}
          >
            {t.common.previous}
          </Button>
        )}
        {page < pageCount && (
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/staff?page=${page + 1}`} />}
          >
            {t.common.next}
          </Button>
        )}
      </nav>
    </>
  );
}

export default function StaffPage({
  searchParams,
}: PageProps<"/staff">) {
  return (
    <>
      <SiteHeader title="staff" />
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <StaffContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
