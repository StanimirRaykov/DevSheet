"use client";

import { useEffect, useState } from "react";
import { applyThemePreference, readThemePreference, type ThemePreference } from "@/lib/theme";

/**
 * The saved theme choice and a setter that applies it. Shared by the theme switch and the user menu.
 * While on "system", the page follows the operating system when it switches.
 */
export function useThemePreference(): [ThemePreference, (value: ThemePreference) => void] {
  // Starts as "system" on the server; the real value is read after mount (the page is already themed by the head script).
  const [preference, setPreference] = useState<ThemePreference>("system");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPreference(readThemePreference()), []);

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

  return [preference, choose];
}
