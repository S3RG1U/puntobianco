import {
  BedDoubleIcon,
  CarIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { Suspense, type ComponentProps } from "react";

import { BrandMark } from "@/components/brand-mark";
import { NavLink } from "@/components/nav-link";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { can, parseRoles, type Resource } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

// Modules without a page yet. Each only shows to roles that can read it.
const upcomingModules: {
  title: string;
  icon: typeof UsersIcon;
  resource: Resource;
}[] = [
  { title: "Patients", icon: UsersIcon, resource: "patient" },
  { title: "Treatments", icon: StethoscopeIcon, resource: "treatment" },
  { title: "Accommodation", icon: BedDoubleIcon, resource: "accommodation" },
  { title: "Transfers", icon: CarIcon, resource: "transfer" },
  { title: "Payments", icon: WalletIcon, resource: "payment" },
];

async function RoleNav() {
  const { user } = await requireSession();
  const userRoles = parseRoles(user.role);
  const modules = upcomingModules.filter(({ resource }) =>
    can(userRoles, resource, "read"),
  );

  return (
    <>
      {can(userRoles, "user", "list") && (
        <SidebarMenuItem>
          <NavLink
            href="/dashboard/staff"
            title="Staff accounts"
            icon={<ShieldCheckIcon />}
          />
        </SidebarMenuItem>
      )}
      {modules.map(({ title, icon: Icon }) => (
        <SidebarMenuItem key={title}>
          <SidebarMenuButton disabled>
            <Icon />
            <span>{title}</span>
          </SidebarMenuButton>
          <SidebarMenuBadge>Soon</SidebarMenuBadge>
        </SidebarMenuItem>
      ))}
    </>
  );
}

async function CurrentUser() {
  const { user } = await requireSession();

  return <NavUser name={user.name} email={user.email} />;
}

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <BrandMark />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Punto Bianco</span>
                <span className="truncate text-xs">Dental clinic</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Clinic</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <NavLink
                href="/dashboard"
                title="Dashboard"
                icon={<LayoutDashboardIcon />}
              />
            </SidebarMenuItem>
            <Suspense fallback={null}>
              <RoleNav />
            </Suspense>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Suspense fallback={<Skeleton className="h-12 w-full" />}>
          <CurrentUser />
        </Suspense>
      </SidebarFooter>
    </Sidebar>
  );
}
