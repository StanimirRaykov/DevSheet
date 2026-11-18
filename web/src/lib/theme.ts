export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "devsheet-theme";

/** Anything stored that is not a known preference (missing, old value, tampered) counts as "system". */
export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/**
 * Inline script for <head>: sets data-theme before the first paint so there is no flash of the wrong theme.
 * Must stay self-contained (no imports); it runs before React. Storage can throw (private mode), so it is guarded.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");}catch(e){}
if(p!=="light"&&p!=="dark")p=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
document.documentElement.dataset.theme=p;})();`;

/** Saves the preference and applies it to <html>. Returns the theme that is now shown. */
export function applyThemePreference(preference: ThemePreference, root: HTMLElement = document.documentElement): ResolvedTheme {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage unavailable (private mode): the theme still applies for this page.
  }
  const resolved = resolveTheme(preference, window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = resolved;
  return resolved;
}

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}
