import { Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth/session";

export default async function LeadsPage() {
  await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
      <EmptyState
        icon={Users}
        title="Nenhum lead por aqui ainda"
        description="Quando o HubSpot for conectado, seus leads aparecem aqui, com quem precisa de atenção primeiro."
      />
    </div>
  );
}
