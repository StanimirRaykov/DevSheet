import type { ReactNode } from "react";

/** An empty list is an invitation to act: say what goes here and offer the action that fills it. */
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-panel border border-dashed border-rule-strong px-6 py-8">
      {icon && <div className="text-graphite">{icon}</div>}
      <div className="flex flex-col gap-1">
        <p className="font-medium text-ink">{title}</p>
        {description && <p className="max-w-prose text-sm text-graphite">{description}</p>}
      </div>
      {action}
    </div>
  );
}
