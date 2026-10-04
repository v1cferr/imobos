import { MessagesSquare } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireUser } from "@/lib/auth/session";

export default async function ConversationsPage() {
  await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Conversas</h1>
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessagesSquare aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Nenhuma conversa ainda</EmptyTitle>
          <EmptyDescription>
            As conversas do WhatsApp e do Instagram vão aparecer aqui, num lugar só.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
