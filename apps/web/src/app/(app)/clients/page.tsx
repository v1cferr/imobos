import { Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { type ClientListItem, listClients, type Pipeline } from "@/lib/api/crm";
import { requireUser } from "@/lib/auth/session";
import { formatPhone, PIPELINES, stageLabel, WHEN } from "@/lib/crm/labels";

const FILTERS: { label: string; pipeline?: Pipeline }[] = [
  { label: "Todos" },
  { label: PIPELINES.sales, pipeline: "sales" },
  { label: PIPELINES.rental, pipeline: "rental" },
];

function Row({ client }: { client: ClientListItem }) {
  const due = client.open_deals.map((d) => d.next_action_due).filter(Boolean).sort()[0];
  const overdue = due ? new Date(due) < new Date() : false;
  return (
    <Link href={`/clients/${client.id}`} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card size="sm" className="transition-colors hover:bg-muted/50">
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{client.name}</p>
            <div className="flex flex-wrap gap-1">
              {client.open_deals.map((d) => (
                <Badge key={d.id} variant="outline">
                  {PIPELINES[d.pipeline]}: {stageLabel(d.stage, d.pipeline)}
                </Badge>
              ))}
            </div>
          </div>
          {client.phone && <p className="text-sm text-muted-foreground">{formatPhone(client.phone)}</p>}
          {due && (
            <p className={overdue ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
              {overdue ? "Atrasado: " : "Próxima ação: "}
              {WHEN.format(new Date(due))}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  await requireUser();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : undefined;
  const pipeline = params.pipeline === "sales" || params.pipeline === "rental" ? params.pipeline : undefined;
  const clients = await listClients({ q, pipeline });
  const href = (p?: Pipeline) => {
    const s = new URLSearchParams();
    if (p) s.set("pipeline", p);
    if (q) s.set("q", q);
    return s.size ? `/clients?${s}` : "/clients";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
        <Button render={<Link href={pipeline ? `/clients/new?pipeline=${pipeline}` : "/clients/new"} />} nativeButton={false}>
          <Plus aria-hidden />
          Novo cliente
        </Button>
      </div>

      <form role="search" className="flex gap-2">
        {pipeline && <input type="hidden" name="pipeline" value={pipeline} />}
        <Input name="q" type="search" placeholder="Nome, telefone ou e-mail" defaultValue={q} aria-label="Buscar cliente" />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <nav aria-label="Funil" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.label}
            size="sm"
            variant={f.pipeline === pipeline ? "default" : "outline"}
            render={<Link href={href(f.pipeline)} aria-current={f.pipeline === pipeline ? "page" : undefined} />}
            nativeButton={false}
          >
            {f.label}
          </Button>
        ))}
      </nav>

      {clients.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{q ? "Ninguém encontrado" : "Nenhum cliente ainda"}</EmptyTitle>
            <EmptyDescription>
              {q ? "Tente outro nome ou só os últimos dígitos do telefone." : "Cadastre o primeiro em \"Novo cliente\"."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {clients.map((c) => (
            <Row key={c.id} client={c} />
          ))}
        </div>
      )}
    </div>
  );
}
