import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type ConnectionInfo, listConnections } from "@/lib/api/internal";
import { requireUser } from "@/lib/auth/session";

import { check, connectGoogleCalendar, disconnect } from "./actions";

const DATE = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

// A connection's lasting problem, from the api's short, token-free code.
const ERRORS: Record<string, string> = {
  invalid_grant: "O Google recusou a autorização. Conecte de novo.",
  no_refresh_token: "O Google não liberou o acesso contínuo. Conecte de novo.",
  http_401: "O Google não aceita mais a autorização. Desconecte e conecte de novo.",
  http_403: "O Google negou o acesso à agenda. Desconecte e conecte de novo.",
};
const GENERIC = "Não foi possível conectar agora. Tente de novo em instantes.";

// Channels owned by Chatwoot (V1C-83): they are connected there, never directly by ImobOS.
const CHATWOOT_CHANNELS = [
  { name: "WhatsApp Business", description: "Conversas com clientes" },
  { name: "Instagram", description: "Mensagens diretas" },
  { name: "Facebook", description: "Mensagens da página" },
  { name: "Gmail", description: "E-mails com clientes" },
] as const;

function GoogleCalendarCard({ info }: { info: ConnectionInfo | undefined }) {
  const status = info?.status ?? null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Agenda</CardTitle>
        <CardDescription>Suas visitas e compromissos, só para leitura.</CardDescription>
        <CardAction>
          {status === "connected" && <Badge>Conectado</Badge>}
          {status === "error" && <Badge variant="destructive">Com problema</Badge>}
          {status === null && <Badge variant="outline">Desconectado</Badge>}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status !== null && info && (
          <div className="text-sm text-muted-foreground">
            {info.account && <p>Conta: {info.account}</p>}
            {info.last_checked_at && (
              <p>Última verificação: {DATE.format(new Date(info.last_checked_at))}</p>
            )}
          </div>
        )}
        {status === "error" && info?.last_error && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{ERRORS[info.last_error] ?? GENERIC}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          {status === null ? (
            <form action={connectGoogleCalendar}>
              <Button type="submit" disabled={!info?.available}>
                Conectar
              </Button>
            </form>
          ) : (
            <>
              <form action={check}>
                <input type="hidden" name="provider" value="google_calendar" />
                <Button type="submit" variant="outline">
                  Verificar
                </Button>
              </form>
              <form action={disconnect}>
                <input type="hidden" name="provider" value="google_calendar" />
                <Button type="submit" variant="outline">
                  Desconectar
                </Button>
              </form>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Outcomes of connect, verify and disconnect arrive as toasts (lib/flash.ts); this page only shows
// state that persists, such as a connection with a problem.
export default async function IntegrationsPage() {
  await requireUser();
  const connections = await listConnections();
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground">
          Os serviços que o ImobOS acompanha por você. Nenhuma senha é pedida: a autorização é
          feita na tela de cada serviço, e você pode desconectar quando quiser.
        </p>
      </div>

      <GoogleCalendarCard info={byProvider.get("google_calendar")} />

      <Card>
        <CardHeader>
          <CardTitle>HubSpot</CardTitle>
          <CardDescription>Seus clientes, negócios e tarefas.</CardDescription>
          <CardAction>
            <Badge variant="secondary">Em espera</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          O HubSpot é da construtora: a conexão depende da autorização do administrador de lá.
        </CardContent>
      </Card>

      <section aria-labelledby="channels" className="flex flex-col gap-3">
        <h2 id="channels" className="text-xl font-semibold">
          Canais de conversa
        </h2>
        {CHATWOOT_CHANNELS.map((channel) => (
          <Card key={channel.name} size="sm">
            <CardHeader>
              <CardTitle>{channel.name}</CardTitle>
              <CardDescription>{channel.description}</CardDescription>
              <CardAction>
                <Badge variant="outline">Em breve</Badge>
              </CardAction>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  );
}
