import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth/session";

// Every screen inside this group needs a signed-in, approved user. Pages check again.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  // The sidebar remembers whether it was collapsed on desktop (shadcn's own cookie).
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="font-semibold">ImobOS</span>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
