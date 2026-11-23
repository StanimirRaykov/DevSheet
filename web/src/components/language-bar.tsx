import { cn } from "@/components/ui";
import type { LanguageShare } from "@/lib/portfolio";

/** Shades of the accent, largest share first; the last one is for "Other". */
const SHARE_COLOURS = ["bg-accent", "bg-accent/55", "bg-accent/30", "bg-rule-strong"];
const colour = (s: LanguageShare, i: number) => SHARE_COLOURS[s.name === "Other" ? 3 : i];

/**
 * A repository's languages as one bar plus a legend with percentages. The bar is decoration; the legend carries
 * the information, so colour is never the only signal. `compact` drops the legend to the top language only.
 */
export function LanguageBar({ shares, compact = false, className }: { shares: LanguageShare[]; compact?: boolean; className?: string }) {
  if (shares.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div aria-hidden className="flex h-1.5 overflow-hidden rounded-full bg-rule print:hidden">
        {shares.map((s, i) => (
          <span key={s.name} className={colour(s, i)} style={{ width: `${s.percent}%` }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-graphite">
        {(compact ? shares.slice(0, 1) : shares).map((s, i) => (
          <li key={s.name} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2 rounded-full print:hidden", colour(s, i))} />
            {s.name} {s.percent}%
          </li>
        ))}
      </ul>
    </div>
  );
}
