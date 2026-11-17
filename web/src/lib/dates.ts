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
