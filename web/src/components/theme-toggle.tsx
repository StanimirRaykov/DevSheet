"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyThemePreference, readThemePreference, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

/** Three-way switch: light, dark, or follow the system. A radio group, so arrow keys work. */
export function ThemeToggle() {
  // Starts as "system" on the server; the real value is read after mount (the page is already themed by the head script).
  const [preference, setPreference] = useState<ThemePreference>("system");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPreference(readThemePreference()), []);

  // While on "system", follow the operating system when it switches.
  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemePreference("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  function choose(value: ThemePreference) {
    setPreference(value);
    applyThemePreference(value);
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-control border border-rule bg-sheet p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => {
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
