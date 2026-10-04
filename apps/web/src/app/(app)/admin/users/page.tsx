import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listUsers, type ManagedUser } from "@/lib/api/internal";
import { requireAdmin } from "@/lib/auth/session";

import { approve, disable, enable, reject, setRole } from "./actions";

const DATE = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function Who({ user }: { user: ManagedUser }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{user.name ?? user.email}</p>
      <p className="truncate text-muted-foreground">{user.email}</p>
      <p className="text-xs text-muted-foreground">Pedido em {DATE.format(new Date(user.created_at))}</p>
    </div>
  );
}

function Action({
  action,
  id,
  label,
  variant = "outline",
  extra,
}: {
  action: (form: FormData) => Promise<void>;
  id: string;
  label: string;
  variant?: "default" | "outline" | "destructive";
  extra?: { name: string; value: string };
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {extra && <input type="hidden" name={extra.name} value={extra.value} />}
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children.length > 0 ? children : <p className="text-muted-foreground">{empty}</p>}
    </section>
  );
}

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listUsers();
  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status === "approved");
  const disabled = users.filter((u) => u.status === "disabled");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">Quem pediu acesso e quem pode entrar no ImobOS.</p>
      </div>

      <Section title="Aguardando aprovação" empty="Nenhum pedido no momento.">
        {pending.map((u) => (
          <Card key={u.id} size="sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <Who user={u} />
              <div className="flex gap-2">
                <Action action={approve} id={u.id} label="Aprovar" variant="default" />
                <Action action={reject} id={u.id} label="Recusar" variant="destructive" />
              </div>
            </CardContent>
          </Card>
        ))}
      </Section>

      <Section title="Com acesso" empty="Ninguém além dos administradores principais.">
        {active.map((u) => (
          <Card key={u.id} size="sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <Who user={u} />
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                  {u.role === "admin" ? "Administrador" : "Usuária"}
                </Badge>
                {u.protected ? (
                  <Badge variant="outline">Principal</Badge>
                ) : (
                  <>
                    <Action
                      action={setRole}
                      id={u.id}
                      label={u.role === "admin" ? "Tornar usuária" : "Tornar admin"}
                      extra={{ name: "role", value: u.role === "admin" ? "user" : "admin" }}
                    />
                    <Action action={disable} id={u.id} label="Desativar" variant="destructive" />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </Section>

      <Section title="Desativados" empty="Ninguém desativado.">
        {disabled.map((u) => (
          <Card key={u.id} size="sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <Who user={u} />
              <Action action={enable} id={u.id} label="Reativar" />
            </CardContent>
          </Card>
        ))}
      </Section>
    </div>
  );
}
