"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

export function NavLink({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: ReactNode;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuButton
      isActive={pathname === href}
      tooltip={title}
      render={
        <Link href={href} onClick={() => isMobile && setOpenMobile(false)} />
      }
    >
      {icon}
      <span>{title}</span>
    </SidebarMenuButton>
  );
}
