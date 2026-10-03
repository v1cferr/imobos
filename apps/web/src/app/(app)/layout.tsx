import { AppShell } from "@/components/app-shell/app-shell";
import { requireUser } from "@/lib/auth/session";

// Every screen inside this group needs a signed-in, allowlisted user. Pages check again.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
