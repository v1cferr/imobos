"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { CurrentUser } from "@/lib/auth/session";

import { ADMIN_NAV, MAIN_NAV, type NavItem } from "./nav-items";
import { NavUser } from "./nav-user";

function NavGroup({ items, label }: { items: readonly NavItem[]; label?: string }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ href, label: text, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                isActive={pathname === href || pathname.startsWith(`${href}/`)}
                tooltip={text}
                // On phones the menu is a drawer; close it once a screen is chosen.
                render={<Link href={href} onClick={() => isMobile && setOpenMobile(false)} />}
              >
                <Icon aria-hidden />
                <span>{text}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({ user }: { user: CurrentUser }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/today" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <House aria-hidden className="size-4" />
              </div>
              <span className="text-base font-semibold">ImobOS</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup items={MAIN_NAV} />
        {user.role === "admin" && <NavGroup items={ADMIN_NAV} label="Administração" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
