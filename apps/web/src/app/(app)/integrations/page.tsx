import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

// Display only: connecting any of these is V1C-85, with its own consent flows. No button here
// starts an OAuth flow.
const SERVICES = [
  { name: "HubSpot", description: "Seus clientes, negócios e tarefas" },
  { name: "WhatsApp Business", description: "Conversas com clientes" },
  { name: "Instagram", description: "Mensagens diretas" },
  { name: "Gmail", description: "E-mails com clientes" },
  { name: "Google Agenda", description: "Visitas e compromissos" },
  { name: "Facebook", description: "Mensagens da página" },
] as const;

export default async function IntegrationsPage() {
  await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground">
          Os serviços que o ImobOS vai acompanhar por você. A conexão chega em breve.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {SERVICES.map((service) => (
          <li key={service.name}>
            <Card size="sm">
              <CardContent className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-muted-foreground">{service.description}</p>
                </div>
                <Badge variant="outline">Em breve</Badge>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
