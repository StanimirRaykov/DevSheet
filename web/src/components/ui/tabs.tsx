"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

export interface TabItem {
  value: string;
  label: ReactNode;
  /** Optional count shown next to the label (e.g. Pending 4). */
  count?: number;
  content: ReactNode;
}

/** Underlined tabs. Arrow keys move between tabs (Radix roving focus). */
export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  label,
}: {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible name of the tab list. */
  label: string;
}) {
  return (
    <RadixTabs.Root value={value} defaultValue={defaultValue ?? items[0]?.value} onValueChange={onValueChange}>
      <RadixTabs.List aria-label={label} className="flex gap-6 border-b border-rule">
        {items.map((t) => (
          <RadixTabs.Trigger
            key={t.value}
            value={t.value}
            className="-mb-px flex h-10 items-center gap-2 border-b-2 border-transparent text-sm text-graphite transition-colors duration-150 hover:text-ink data-[state=active]:border-accent data-[state=active]:text-ink"
          >
            {t.label}
            {t.count !== undefined && <span className="text-xs tabular-nums text-graphite">{t.count}</span>}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((t) => (
        <RadixTabs.Content key={t.value} value={t.value} className="pt-5 focus-visible:outline-none">
          {t.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
