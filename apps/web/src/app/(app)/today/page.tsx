import { CalendarDays, Check, ChevronRight, Clock, Plus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { CalendarEvents } from "@/components/crm/calendar-events";
import { getToday, type TodayItem, type TodayReason } from "@/lib/api/crm";
import { requireUser } from "@/lib/auth/session";
import { PIPELINES, stageLabel } from "@/lib/crm/labels";
import { greeting } from "@/lib/greeting";

import { doneAction, postponeAction } from "./actions";

const TIME = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" });
const DAY = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

const SECTIONS: { reason: TodayReason; title: string; empty?: string }[] = [
  { reason: "overdue", title: "Atrasados" },
  { reason: "due_today", title: "Para hoje" },
  { reason: "new_lead", title: "Leads novos, ainda sem contato" },
  { reason: "no_next_action", title: "Sem próxima ação marcada" },
];

function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return Math.floor((now.getTime() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

/** Why this item is here, in one line she can act on. */
function why(item: TodayItem, now: Date): string {
  const { deal } = item;
  const due = deal.next_action_due ? new Date(deal.next_action_due) : null;
  switch (item.reason) {
    case "overdue":
      return `${deal.next_action ?? "Próxima ação"} · era para ${DAY.format(due!)} às ${TIME.format(due!)}`;
    case "due_today":
      return `${deal.next_action ?? "Próxima ação"} · às ${TIME.format(due!)}`;
    case "new_lead": {
      const waiting = daysSince(deal.created_at, now);
      return waiting ? `Chegou há ${waiting} dia${waiting > 1 ? "s" : ""}, ainda sem contato` : "Chegou hoje, ainda sem contato";
    }
    case "no_next_action": {
      const quiet = daysSince(item.last_contact_at, now);
      return quiet === null ? "Sem contato registrado" : quiet === 0 ? "Último contato hoje" : `Último contato há ${quiet} dia${quiet > 1 ? "s" : ""}`;
    }
  }
}

function ItemCard({ item, now }: { item: TodayItem; now: Date }) {
  const { deal } = item;
  const scheduled = item.reason === "overdue" || item.reason === "due_today";
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/clients/${deal.client_id}`} className="font-medium underline-offset-4 hover:underline">
              {deal.client_name}
            </Link>
            <p className={item.reason === "overdue" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
              {why(item, now)}
            </p>
            {deal.property && <p className="text-sm text-muted-foreground">{deal.property}</p>}
          </div>
          <Badge variant="outline">
            {PIPELINES[deal.pipeline]}: {stageLabel(deal.stage, deal.pipeline)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {scheduled && (
            <form action={doneAction}>
              <input type="hidden" name="deal_id" value={deal.id} />
              <Button type="submit" size="sm">
                <Check aria-hidden />
                Feito
              </Button>
            </form>
          )}
          <form action={postponeAction}>
            <input type="hidden" name="deal_id" value={deal.id} />
            <input type="hidden" name="due" value={deal.next_action_due ?? ""} />
            <Button type="submit" size="sm" variant="outline">
              <Clock aria-hidden />
              {scheduled ? "Amanhã" : "Lembrar amanhã"}
            </Button>
          </form>
          <Button size="sm" variant="ghost" render={<Link href={`/clients/${deal.client_id}`} />} nativeButton={false}>
            Abrir
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function TodayPage() {
  const user = await requireUser();
  const firstName = user.name?.split(" ")[0];
  const today = await getToday();
  const now = new Date(today.now);
  const count = (r: TodayReason) => today.items.filter((i) => i.reason === r).length;
  const summary = [
    { value: count("overdue"), label: "atrasados", alert: count("overdue") > 0 },
    { value: count("due_today"), label: "para hoje", alert: false },
    { value: count("new_lead"), label: "leads novos", alert: false },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <p className="text-muted-foreground">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">O que preciso fazer hoje?</h1>
      </div>

      <section aria-label="Resumo do dia" className="grid grid-cols-3 gap-3">
        {summary.map(({ value, label, alert }) => (
          <Card key={label} size="sm">
            <CardContent>
              <p className={alert ? "text-3xl font-semibold text-destructive" : "text-3xl font-semibold"}>{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-labelledby="agenda" className="flex flex-col gap-3">
        <h2 id="agenda" className="flex items-center gap-2 text-xl font-semibold">
          <CalendarDays aria-hidden className="size-5" />
          Agenda de hoje
        </h2>
        <CalendarEvents calendar={today.calendar} events={today.events} empty="Nada na agenda hoje." />
      </section>

      {today.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Tudo em dia</EmptyTitle>
            <EmptyDescription>Nenhum cliente esperando por você agora.</EmptyDescription>
          </EmptyHeader>
          <Button render={<Link href="/clients/new" />} nativeButton={false}>
            <Plus aria-hidden />
            Novo cliente
          </Button>
        </Empty>
      ) : (
        SECTIONS.map(({ reason, title }) => {
          const items = today.items.filter((i) => i.reason === reason);
          if (items.length === 0) return null;
          return (
            <section key={reason} aria-labelledby={`s-${reason}`} className="flex flex-col gap-3">
              <h2 id={`s-${reason}`} className="text-xl font-semibold">
                {title} <span className="text-muted-foreground">({items.length})</span>
              </h2>
              {items.map((i) => (
                <ItemCard key={i.deal.id} item={i} now={now} />
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
