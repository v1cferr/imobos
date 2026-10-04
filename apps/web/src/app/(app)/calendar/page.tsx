import { CalendarDays } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireUser } from "@/lib/auth/session";

export default async function CalendarPage() {
  await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Agenda</h1>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Agenda vazia</EmptyTitle>
          <EmptyDescription>
            Suas visitas e compromissos vão aparecer aqui quando a agenda for conectada.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
