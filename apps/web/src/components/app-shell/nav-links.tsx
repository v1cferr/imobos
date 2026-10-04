"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { ADMIN_NAV, MAIN_NAV, SECONDARY_NAV } from "./nav-items";

// Icons are components, which cannot cross from a Server to a Client Component as props, so the
// lists are imported here and callers only name the group.
const GROUPS = { main: MAIN_NAV, secondary: SECONDARY_NAV, admin: ADMIN_NAV } as const;

type NavLinksProps = {
  group: keyof typeof GROUPS;
  /** Lets the mobile drawer close itself after a tap. */
  onNavigate?: () => void;
};

export function NavLinks({ group, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const items = GROUPS[group];
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
