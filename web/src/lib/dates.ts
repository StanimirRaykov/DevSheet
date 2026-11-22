const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2024-03-01" -> "Mar 2024". Parsed by hand to avoid timezone shifts. Unparseable input is returned as is. */
export function formatMonth(iso: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const idx = Number(m[2]) - 1;
  return idx >= 0 && idx <= 11 ? `${MONTHS[idx]} ${m[1]}` : iso;
}

/** "Jan 2023 – Present". A missing end date means the role/study is ongoing. */
export function formatRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  if (!start) return formatMonth(end!);
  return `${formatMonth(start)} – ${end ? formatMonth(end) : "Present"}`;
}

/**
 * "just now", "5 minutes ago", "3 hours ago", "yesterday", "4 days ago", then the date ("12 Mar 2026").
 * For times in the past, such as the last GitHub sync. `now` is a parameter so tests can fix it.
 */
export function formatTimeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (Number.isNaN(seconds)) return iso;
  if (seconds < 60) return "just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, "day");
  return `${then.getUTCDate()} ${MONTHS[then.getUTCMonth()]} ${then.getUTCFullYear()}`;
}
