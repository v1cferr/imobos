import { MessagesSquare } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth/session";

export default async function ConversationsPage() {
  await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Conversas</h1>
      <EmptyState
        icon={MessagesSquare}
        title="Nenhuma conversa ainda"
        description="As conversas do WhatsApp e do Instagram vão aparecer aqui, num lugar só."
      />
    </div>
  );
}
