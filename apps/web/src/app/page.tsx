import { CalendarCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

// Foundation shell only: the daily dashboard arrives with the HubSpot integration.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <CalendarCheck aria-hidden className="size-10 text-muted-foreground" />
      <h1 className="text-3xl font-semibold tracking-tight">O que preciso fazer hoje?</h1>
      <p className="max-w-md text-muted-foreground">
        O ImobOS está sendo preparado. Em breve, esta tela mostra quem precisa de atenção, por quê
        e qual deve ser a próxima ação.
      </p>
      <Button disabled>Em construção</Button>
    </main>
  );
}
