import { LogOut } from "lucide-react";

import { logout } from "@/app/(app)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/auth/session";

export function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts.at(-1)![0]}` : source.slice(0, 2);
  return letters.toUpperCase();
}

/** Who is signed in, and the way out. Shown in the sidebar and in the mobile drawer. */
export function UserPanel({ user }: { user: CurrentUser }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        {user.image && <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" />}
        <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
        {user.role === "admin" && <p className="text-xs text-muted-foreground">Administrador</p>}
      </div>
      <form action={logout}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Sair" title="Sair">
          <LogOut aria-hidden />
        </Button>
      </form>
    </div>
  );
}
