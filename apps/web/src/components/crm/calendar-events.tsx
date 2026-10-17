import Link from "next/link";

import type { CalendarEvent } from "@/lib/api/crm";

const TIME = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" });

function EventRow({ event }: { event: CalendarEvent }) {
  const when = event.all_day
    ? "Dia todo"
    : `${TIME.format(new Date(event.start))}${event.end ? `–${TIME.format(new Date(event.end))}` : ""}`;
  return (
    <li className="flex gap-3">
      <span className="w-24 shrink-0 text-sm text-muted-foreground tabular-nums">{when}</span>
      <div className="min-w-0">
        {event.link ? (
          <a href={event.link} target="_blank" rel="noreferrer" className="font-medium underline-offset-4 hover:underline">
            {event.title}
          </a>
        ) : (
          <p className="font-medium">{event.title}</p>
        )}
        {event.location && <p className="text-sm text-muted-foreground">{event.location}</p>}
        {event.client_id && (
          <Link href={`/clients/${event.client_id}`} className="text-sm underline underline-offset-4">
            {event.client_name}
          </Link>
        )}
      </div>
    </li>
  );
}

/** Events of one stretch of her calendar, or why there are none to show. */
export function CalendarEvents({
  calendar,
  events,
  empty,
}: {
  calendar: string;
  events: CalendarEvent[];
  empty: string;
}) {
  if (calendar === "not_connected") {
    return (
      <p className="text-sm text-muted-foreground">
        Conecte a Google Agenda em <Link className="underline" href="/integrations">Integrações</Link> para ver suas visitas aqui.
      </p>
    );
  }
  if (calendar !== "ok") {
    return (
      <p className="text-sm text-destructive">
        Não consegui ler a sua agenda agora. Veja em <Link className="underline" href="/integrations">Integrações</Link>.
      </p>
    );
  }
  if (events.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {events.map((e) => (
        <EventRow key={`${e.start}-${e.title}`} event={e} />
      ))}
    </ul>
  );
}

