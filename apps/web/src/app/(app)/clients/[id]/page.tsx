import { MessageCircle, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DealCard } from "@/components/crm/deal-card";
import { MessageComposer } from "@/components/crm/message-composer";
import { History } from "@/components/crm/history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { type ClientDetail, getClient, listTemplates, type Pipeline } from "@/lib/api/crm";
import { requireUser } from "@/lib/auth/session";
import { fillTemplate } from "@/lib/crm/messages";
import { BRL, formatPhone, MANUAL_KINDS, PIPELINES, PURPOSES, SOURCES, stageLabel } from "@/lib/crm/labels";

import { addActivityAction, deleteClientAction, openDealAction } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const yesNo = (v: boolean | null) => (v === null ? null : v ? "sim" : "não");

/** What the client wants, as a short list of only what she already asked. */
function Wants({ client }: { client: ClientDetail }) {
  const items: [string, string | null][] = [
    ["Finalidade", client.purpose ? PURPOSES[client.purpose] : null],
    ["Orçamento até", client.budget_max ? BRL.format(Number(client.budget_max)) : null],
    ["Região", client.region],
    ["Tipo", client.property_type],
    ["Metragem", client.min_area_m2 !== null ? `${client.min_area_m2} m²` : null],
    ["Quartos", client.bedrooms !== null ? String(client.bedrooms) : null],
    ["Vagas", client.parking !== null ? String(client.parking) : null],
    ["Financiamento", yesNo(client.financing)],
    ["Pets", yesNo(client.pets)],
  ];
  const known = items.filter((i): i is [string, string] => i[1] !== null);
  if (known.length === 0 && !client.need) {
    return <p className="text-sm text-muted-foreground">Nada anotado ainda. Use &quot;Editar&quot; para completar.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {known.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          {known.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {client.need && <p className="text-sm whitespace-pre-line">{client.need}</p>}
    </div>
  );
}

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const [client, templates] = await Promise.all([UUID.test(id) ? getClient(id) : null, listTemplates()]);
  if (!client) notFound();

  const open = client.deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const closed = client.deals.filter((d) => !open.includes(d));
  const free = (Object.keys(PIPELINES) as Pipeline[]).filter((p) => !open.some((d) => d.pipeline === p));
  const wa = client.phone ? `https://wa.me/${client.phone.slice(1)}` : null;
  // The open deal the message is most likely about: the one with a next action, else the newest.
  const focus = open.find((d) => d.next_action) ?? open[open.length - 1] ?? null;
  const filled = templates.map((t) => ({
    title: t.title,
    text: fillTemplate(t.body, { client, deal: focus, broker: user.name }),
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{client.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {client.phone && <span>{formatPhone(client.phone)}</span>}
          {client.email && <span>{client.email}</span>}
          <Badge variant="outline">{SOURCES[client.source]}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {wa && (
            <Button size="sm" render={<a href={wa} target="_blank" rel="noreferrer" />} nativeButton={false}>
              <MessageCircle aria-hidden />
              WhatsApp
            </Button>
          )}
          <Button size="sm" variant="outline" render={<Link href={`/clients/${client.id}/edit`} />} nativeButton={false}>
            <Pencil aria-hidden />
            Editar
          </Button>
        </div>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>O que procura</CardTitle>
        </CardHeader>
        <CardContent>
          <Wants client={client} />
        </CardContent>
      </Card>

      <section aria-labelledby="deals" className="flex flex-col gap-3">
        <h2 id="deals" className="text-xl font-semibold">
          Negócios
        </h2>
        {open.map((d) => (
          <DealCard key={d.id} deal={d} />
        ))}
        {free.length > 0 && (
          <form action={openDealAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="client_id" value={client.id} />
            <Field className="w-auto">
              <FieldLabel htmlFor="open-pipeline">Colocar no funil</FieldLabel>
              <NativeSelect id="open-pipeline" name="pipeline">
                {free.map((p) => (
                  <NativeSelectOption key={p} value={p}>
                    {PIPELINES[p]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Button type="submit" variant="outline">
              Abrir negócio
            </Button>
          </form>
        )}
        {closed.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {closed.map((d) => (
              <li key={d.id}>
                {PIPELINES[d.pipeline]}: {stageLabel(d.stage, d.pipeline)}
                {d.property ? ` · ${d.property}` : ""}
                {d.lost_reason ? ` · ${d.lost_reason}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="mensagem-title" id="mensagem" className="flex flex-col gap-3 scroll-mt-20">
        <h2 id="mensagem-title" className="text-xl font-semibold">
          Mensagem pronta
        </h2>
        {client.phone ? (
          <MessageComposer clientId={client.id} phone={client.phone} dealId={focus?.id ?? null} templates={filled} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Cadastre o WhatsApp do cliente em <Link className="underline" href={`/clients/${client.id}/edit`}>Editar</Link> para
            mandar mensagens prontas.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          <Link className="underline" href="/settings/messages">
            Editar as mensagens prontas
          </Link>
        </p>
      </section>

      <section aria-labelledby="record" className="flex flex-col gap-3">
        <h2 id="record" className="text-xl font-semibold">
          Registrar
        </h2>
        <form action={addActivityAction} className="flex flex-col gap-3">
          <input type="hidden" name="client_id" value={client.id} />
          <NativeSelect name="kind" aria-label="Tipo" defaultValue="note">
            {Object.entries(MANUAL_KINDS).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Textarea name="body" rows={3} required aria-label="O que aconteceu" placeholder="Gostou da planta, achou a vaga pequena" />
          <Button type="submit" variant="outline" className="self-start">
            Registrar
          </Button>
        </form>
      </section>

      <section aria-labelledby="history" className="flex flex-col gap-3">
        <h2 id="history" className="text-xl font-semibold">
          Histórico
        </h2>
        <History activities={client.activities} deals={client.deals} />
      </section>

      {client.notes && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-line">{client.notes}</CardContent>
        </Card>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Apagar cliente</summary>
        <form action={deleteClientAction} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="client_id" value={client.id} />
          <p>Apaga o cliente, os negócios e todo o histórico. Não dá para desfazer.</p>
          <Field className="w-auto">
            <FieldLabel htmlFor="confirm">Digite o nome para confirmar</FieldLabel>
            <Input id="confirm" required pattern={client.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} />
          </Field>
          <Button type="submit" variant="destructive" className="self-start">
            Apagar de vez
          </Button>
        </form>
      </details>
    </div>
  );
}
