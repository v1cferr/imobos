import { CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth/session";

export default async function CalendarPage() {
  await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Agenda</h1>
      <EmptyState
        icon={CalendarDays}
        title="Agenda vazia"
        description="Suas visitas e compromissos vão aparecer aqui quando a agenda for conectada."
      />
    </div>
  );
}
