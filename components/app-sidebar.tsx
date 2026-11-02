import {
  BedDoubleIcon,
  CarIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  UsersIcon,
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
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { can, parseRoles, type Resource } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

// Each link is shown only to roles that can read it; empty categories disappear.
const navGroups: {
  label: "clinic" | "operations";
  items: {
    title: "patients" | "treatments" | "backOffice" | "accommodation" | "transfers";
    icon: typeof UsersIcon;
    resource: Resource;
    href: string;
  }[];
}[] = [
  {
    label: "clinic",
    items: [
      { title: "patients", icon: UsersIcon, resource: "patient", href: "/patients" },
      {
        title: "treatments",
        icon: StethoscopeIcon,
        resource: "treatment",
        href: "/treatments",
      },
    ],
  },
  {
    label: "operations",
    items: [
      {
        title: "backOffice",
        icon: ClipboardListIcon,
        resource: "backOfficeCase",
        href: "/back-office",
      },
      {
        title: "accommodation",
        icon: BedDoubleIcon,
        resource: "accommodation",
        href: "/accommodations",
      },
      { title: "transfers", icon: CarIcon, resource: "transfer", href: "/transfers" },
    ],
  },
];

async function RoleNav() {
  const { user } = await requireSession();
  const { t } = await getI18n();
  const userRoles = parseRoles(user.role);

  return (
    <>
      {navGroups.map(({ label, items }) => {
        const visible = items.filter(({ resource }) =>
          can(userRoles, resource, "read"),
        );
        if (!visible.length) return null;

        return (
          <SidebarGroup key={label}>
            <SidebarGroupLabel>{t.nav[label]}</SidebarGroupLabel>
            <SidebarMenu>
              {visible.map(({ title, icon: Icon, href }) => (
                <SidebarMenuItem key={href}>
                  <NavLink href={href} title={t.nav[title]} icon={<Icon />} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        );
      })}
      {can(userRoles, "user", "list") && (
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>{t.nav.administration}</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <NavLink
                href="/staff"
                title={t.nav.staff}
                icon={<ShieldCheckIcon />}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      )}
    </>
  );
}

async function CurrentUser() {
  const { user } = await requireSession();

  return <NavUser name={user.name} email={user.email} />;
}

export async function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const { t } = await getI18n();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <BrandMark />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Punto Bianco</span>
                <span className="truncate text-xs">{t.nav.tagline}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <NavLink
                href="/dashboard"
                title={t.nav.dashboard}
                icon={<LayoutDashboardIcon />}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <Suspense fallback={null}>
          <RoleNav />
        </Suspense>
      </SidebarContent>
      <SidebarFooter>
        <Suspense fallback={<Skeleton className="h-12 w-full" />}>
          <CurrentUser />
        </Suspense>
      </SidebarFooter>
    </Sidebar>
  );
}
