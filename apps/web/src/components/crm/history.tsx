import type { Activity, Deal } from "@/lib/api/crm";
import { FIELD_LABELS, kindLabel, PIPELINES, stageLabel, WHEN } from "@/lib/crm/labels";

function detail(activity: Activity, deals: Deal[]): string | null {
  const data = activity.data ?? {};
  const deal = deals.find((d) => d.id === activity.deal_id);
  const pipeline = deal?.pipeline ?? (data.pipeline as Deal["pipeline"] | undefined);
  switch (activity.kind) {
    case "stage_changed":
      return pipeline
        ? `${stageLabel(data.from as Deal["stage"], pipeline)} → ${stageLabel(data.to as Deal["stage"], pipeline)}`
        : null;
    case "deal_opened":
      return pipeline ? PIPELINES[pipeline] : null;
    case "updated":
      return (data.fields as string[] | undefined)?.map((f) => FIELD_LABELS[f] ?? f).join(", ") ?? null;
    case "next_action": {
      const due = typeof data.due === "string" ? ` (${WHEN.format(new Date(data.due))})` : "";
      return activity.body ? `${activity.body}${due}` : "Sem próxima ação";
    }
    default:
      return activity.body;
  }
}

/** Newest first, stamped by the server: also her record of who served this client and when. */
export function History({ activities, deals }: { activities: Activity[]; deals: Deal[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {activities.map((a) => (
        <li key={a.id} className="border-l-2 pl-3">
          <p className="text-sm font-medium">{kindLabel(a.kind)}</p>
          {detail(a, deals) && <p className="text-sm whitespace-pre-line">{detail(a, deals)}</p>}
          <p className="text-xs text-muted-foreground">
            {WHEN.format(new Date(a.occurred_at))} · {a.actor}
          </p>
        </li>
      ))}
    </ol>
  );
}
