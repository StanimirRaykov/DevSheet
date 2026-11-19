export const DEFAULT_NEXT = "/dashboard";

/**
 * "Come back here after login" must stay on this site: a local path that starts with "/" but not "//".
 * Anything else (another host, a scheme like javascript:, backslashes, control characters) falls back
 * to the dashboard. Same rules as LocalPath.IsSafe in the API.
 */
export function safeNext(value: string | null | undefined, fallback = DEFAULT_NEXT): string {
  if (!value || value.length > 2048) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

/** The login page URL that brings the user back to `path` afterwards. */
export function loginHref(path: string): string {
  const next = safeNext(path);
  return next === DEFAULT_NEXT ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
