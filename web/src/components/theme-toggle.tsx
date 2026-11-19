"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemePreference } from "@/lib/theme";
import { useThemePreference } from "./use-theme-preference";

export const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

/** Three-way switch: light, dark, or follow the system. A radio group, so arrow keys work. */
export function ThemeToggle() {
  const [preference, choose] = useThemePreference();

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-control border border-rule bg-sheet p-0.5">
      {THEME_OPTIONS.map(({ value, label, Icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => choose(value)}
            className={`grid size-7 place-items-center rounded-[4px] transition-colors duration-150 ${
              selected ? "bg-accent-soft text-accent" : "text-graphite hover:text-ink"
            }`}
          >
            <Icon aria-hidden size={15} strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}
