/** Joins class names, skipping empty values. Small on purpose: no class merging, so do not pass conflicting utilities. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
