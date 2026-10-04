"use client";

import { Menu } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { NavLinks } from "./nav-links";

/** The same navigation as the sidebar, in a drawer for small screens. */
export function MobileNav({ userPanel, isAdmin }: { userPanel: ReactNode; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" aria-label="Abrir menu" />}
      >
        <Menu aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col gap-0 p-4">
        <SheetTitle className="px-3 pb-4 text-lg font-semibold">ImobOS</SheetTitle>
        <nav aria-label="Principal" className="flex flex-1 flex-col">
          <NavLinks group="main" onNavigate={close} />
          <Separator className="my-4" />
          <NavLinks group="secondary" onNavigate={close} />
          {isAdmin && <NavLinks group="admin" onNavigate={close} />}
        </nav>
        <Separator className="my-4" />
        {userPanel}
      </SheetContent>
    </Sheet>
  );
}
