import type { LucideIcon } from "lucide-react";

type EmptyStateProps = { icon: LucideIcon; title: string; description: string };

/** A calm placeholder for screens whose data arrives with a later integration. */
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <Icon aria-hidden className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-muted-foreground">{description}</p>
    </div>
  );
}
