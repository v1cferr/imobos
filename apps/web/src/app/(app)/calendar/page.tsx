import { CalendarEvents } from "@/components/crm/calendar-events";
import { type CalendarEvent, getAgenda } from "@/lib/api/crm";
import { requireUser } from "@/lib/auth/session";

const DAY_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
const DAY_NAME = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** All-day events carry a bare date; timed ones an instant to read in São Paulo time. */
function dayOf(event: CalendarEvent): string {
  return event.all_day ? event.start.slice(0, 10) : DAY_KEY.format(new Date(event.start));
}

export default async function CalendarPage() {
  await requireUser();
  const agenda = await getAgenda(7);
  const now = new Date(agenda.now);
  const days = Array.from({ length: 7 }, (_, i) => DAY_KEY.format(new Date(now.getTime() + i * 86_400_000)));
  const label = (key: string, i: number) =>
    i === 0 ? "Hoje" : i === 1 ? "Amanhã" : DAY_NAME.format(new Date(`${key}T12:00:00-03:00`));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-muted-foreground">Os próximos 7 dias da sua Google Agenda.</p>
      </div>
      {agenda.calendar !== "ok" ? (
        <CalendarEvents calendar={agenda.calendar} events={[]} empty="" />
      ) : (
        days.map((key, i) => (
          <section key={key} aria-labelledby={`d-${key}`} className="flex flex-col gap-3">
            <h2 id={`d-${key}`} className="text-lg font-semibold first-letter:uppercase">
              {label(key, i)}
            </h2>
            <CalendarEvents calendar="ok" events={agenda.events.filter((e) => dayOf(e) === key)} empty="Nada marcado." />
          </section>
        ))
      )}
    </div>
  );
}
