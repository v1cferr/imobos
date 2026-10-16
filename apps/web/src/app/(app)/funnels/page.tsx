import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type BoardItem, listBoard, type Pipeline, type Stage } from "@/lib/api/crm";
import { requireUser } from "@/lib/auth/session";
import { BRL, PIPELINES, STAGE_ORDER, stageLabel, WHEN } from "@/lib/crm/labels";

function DealTile({ deal }: { deal: BoardItem }) {
  const overdue = deal.next_action_due ? new Date(deal.next_action_due) < new Date() : false;
  return (
    <Link href={`/clients/${deal.client_id}`} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card size="sm" className="transition-colors hover:bg-muted/50">
        <CardContent className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{deal.client_name}</p>
          {deal.property && <p className="text-muted-foreground">{deal.property}</p>}
          {deal.value && <p className="text-muted-foreground">{BRL.format(Number(deal.value))}</p>}
          {deal.next_action && <p>{deal.next_action}</p>}
          {deal.next_action_due && (
            <p className={overdue ? "text-destructive" : "text-muted-foreground"}>{WHEN.format(new Date(deal.next_action_due))}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/** One column per stage. Stages change on the client page: a select is easier than dragging on a
 * phone, and every change lands in the history. */
export default async function FunnelsPage({ searchParams }: PageProps<"/funnels">) {
  await requireUser();
  const params = await searchParams;
  const pipeline: Pipeline = params.pipeline === "rental" ? "rental" : "sales";
  const deals = await listBoard(pipeline);
  const byStage = new Map<Stage, BoardItem[]>(STAGE_ORDER.map((s) => [s, []]));
  for (const d of deals) byStage.get(d.stage)?.push(d);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Funis</h1>
      <nav aria-label="Funil" className="flex gap-2">
        {(Object.keys(PIPELINES) as Pipeline[]).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === pipeline ? "default" : "outline"}
            render={<Link href={`/funnels?pipeline=${p}`} aria-current={p === pipeline ? "page" : undefined} />}
            nativeButton={false}
          >
            {PIPELINES[p]}
          </Button>
        ))}
      </nav>
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-3">
          {STAGE_ORDER.map((stage) => {
            const items = byStage.get(stage) ?? [];
            return (
              <section key={stage} aria-label={stageLabel(stage, pipeline)} className="flex w-64 shrink-0 flex-col gap-2">
                <h2 className="flex items-baseline justify-between text-sm font-semibold">
                  {stageLabel(stage, pipeline)}
                  <span className="text-muted-foreground">{items.length}</span>
                </h2>
                {items.map((d) => (
                  <DealTile key={d.id} deal={d} />
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
