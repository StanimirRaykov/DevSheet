import type { ReactNode } from "react";
import { cn } from "@/components/ui";

/**
 * One group of settings: what it is on the left (on top on phones), the controls on the right.
 * Groups are separated by a rule, not boxed, so the page reads as one list.
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-4 border-b border-rule py-6 first:pt-1 last:border-b-0 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-ink">{title}</h2>
        {description && <p className="text-sm text-graphite">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Shown while a tab loads its data. */
export function SettingsLoading() {
  return <p className="py-6 text-sm text-graphite" role="status">Loading…</p>;
}

/** Shown when a tab could not load its data. */
export function SettingsLoadError() {
  return (
    <p role="alert" className="py-6 text-sm text-ink">
      This part of your settings could not be loaded. Reload the page to try again.
    </p>
  );
}
