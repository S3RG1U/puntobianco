"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type NavKey = {
  [K in keyof Dictionary["nav"]]: K;
}[keyof Dictionary["nav"]];

export function NavText({ name }: { name: NavKey }) {
  return useI18n().t.nav[name];
}

type NavLinkProps = { href: string; title: NavKey; icon: ReactNode };

function NavLinkButton({
  href,
  title,
  icon,
  isActive,
}: NavLinkProps & { isActive: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = useI18n();

  return (
    <SidebarMenuButton
      isActive={isActive}
      tooltip={t.nav[title]}
      render={
        <Link href={href} onClick={() => isMobile && setOpenMobile(false)} />
      }
    >
      {icon}
      <span>{t.nav[title]}</span>
    </SidebarMenuButton>
  );
}

function ActiveNavLink(props: NavLinkProps) {
  const pathname = usePathname();
  const { href } = props;

  return (
    <NavLinkButton
      {...props}
      isActive={
        pathname === href ||
        (href !== "/dashboard" && pathname.startsWith(`${href}/`))
      }
    />
  );
}

// The URL is only known at request time, so the highlight sits behind Suspense
// and the link itself stays part of the static shell.
export function NavLink(props: NavLinkProps) {
  return (
    <Suspense fallback={<NavLinkButton {...props} isActive={false} />}>
      <ActiveNavLink {...props} />
    </Suspense>
  );
}
