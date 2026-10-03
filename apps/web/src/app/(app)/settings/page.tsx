import { LogOut } from "lucide-react";

import { initials } from "@/components/app-shell/user-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

import { logout } from "../actions";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Configurações</h1>
      <Card>
        <CardHeader>
          <CardTitle>Sua conta</CardTitle>
          <CardDescription>Você entra no ImobOS com a sua conta Google.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              {user.image && <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" />}
              <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              {user.name && <p className="truncate font-medium">{user.name}</p>}
              <p className="truncate text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Por segurança, depois de 7 dias sem usar o ImobOS será preciso entrar de novo.
          </p>
          <form action={logout}>
            <Button type="submit" variant="outline">
              <LogOut aria-hidden />
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
