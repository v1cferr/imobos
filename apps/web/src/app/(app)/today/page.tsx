import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { greeting } from "@/lib/greeting";
import { TODAY_FIXTURE } from "@/lib/mock/today";

export default async function TodayPage() {
  const user = await requireUser();
  const firstName = user.name?.split(" ")[0];
  const today = TODAY_FIXTURE;

  const summary = [
    { value: today.needReply, label: "clientes precisam de retorno" },
    { value: today.overdueFollowUps, label: "follow-ups atrasados" },
    { value: today.upcomingVisits, label: "visita próxima" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">O que preciso fazer hoje?</h1>
      </div>

      <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        Estes são <strong>dados de exemplo</strong>. Seus clientes de verdade aparecem aqui quando o
        HubSpot for conectado.
      </p>

      <section aria-label="Resumo do dia" className="grid gap-3 sm:grid-cols-3">
        {summary.map(({ value, label }) => (
          <Card key={label} size="sm">
            <CardContent>
              <p className="text-3xl font-semibold">{value}</p>
              <p className="text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-labelledby="priorities" className="flex flex-col gap-3">
        <h2 id="priorities" className="text-xl font-semibold">
          Prioridades
        </h2>
        {today.priorities.map((priority) => (
          <Card key={priority.id} size="sm">
            <CardHeader>
              <CardTitle>{priority.name}</CardTitle>
              <CardDescription>{priority.detail}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <Badge variant="secondary">{priority.reason}</Badge>
              <Button variant="outline" size="sm" disabled>
                Ver cliente
                <ChevronRight aria-hidden />
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
