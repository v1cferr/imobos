import { Users } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireUser } from "@/lib/auth/session";

export default async function LeadsPage() {
  await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Nenhum lead por aqui ainda</EmptyTitle>
          <EmptyDescription>
            Quando o HubSpot for conectado, seus leads aparecem aqui, com quem precisa de atenção
            primeiro.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
