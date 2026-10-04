import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import type { CurrentUser } from "@/lib/auth/session";

import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { UserPanel } from "./user-panel";

/** Mobile first: a top bar with a drawer; from md up, a fixed sidebar. */
export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const userPanel = <UserPanel user={user} />;
  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/30 p-4 md:flex">
        <p className="px-3 pb-6 text-lg font-semibold">ImobOS</p>
        <nav aria-label="Principal" className="flex flex-1 flex-col">
          <NavLinks group="main" />
          <Separator className="my-4" />
          <NavLinks group="secondary" />
          {user.role === "admin" && <NavLinks group="admin" />}
        </nav>
        <Separator className="my-4" />
        {userPanel}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-2 py-2 md:hidden">
          <MobileNav userPanel={userPanel} isAdmin={user.role === "admin"} />
          <span className="text-lg font-semibold">ImobOS</span>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
