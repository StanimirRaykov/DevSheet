import type { DashboardProject, ProjectStatus } from "@/lib/api";

export type ProjectTab = "pending" | "visible" | "hidden";
export type ProjectSort = "updated" | "stars" | "name";

export const TAB_STATUS: Record<ProjectTab, ProjectStatus> = { pending: 0, visible: 1, hidden: 2 };
export const PROJECT_TABS: ProjectTab[] = ["pending", "visible", "hidden"];

/** How many projects each tab holds. */
export function countByTab(projects: Pick<DashboardProject, "status">[]): Record<ProjectTab, number> {
  const counts: Record<ProjectTab, number> = { pending: 0, visible: 0, hidden: 0 };
  for (const p of projects) counts[PROJECT_TABS[p.status]]++;
  return counts;
}

/** Pending when something waits for a decision; otherwise Visible. */
export function defaultTab(projects: Pick<DashboardProject, "status">[]): ProjectTab {
  return projects.some((p) => p.status === 0) ? "pending" : "visible";
}

/**
 * The projects in one tab that match the search, in the chosen order. The search matches the name and the
 * description, ignoring case and accents; every word typed must appear.
 */
export function visibleProjects<T extends Pick<DashboardProject, "status" | "title" | "description" | "stars" | "pushedAt">>(
  projects: T[],
  { tab, query, sort }: { tab: ProjectTab; query: string; sort: ProjectSort },
): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const matches = projects.filter((p) => {
    if (p.status !== TAB_STATUS[tab]) return false;
    const text = fold(`${p.title} ${p.description ?? ""}`);
    return words.every((w) => text.includes(w));
  });
  return sortProjects(matches, sort);
}

const byName = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title, "en", { sensitivity: "base" });

/** Most stars first, most recently pushed first, or A to Z. Ties fall back to the name, so the order is stable. */
export function sortProjects<T extends Pick<DashboardProject, "title" | "stars" | "pushedAt">>(projects: T[], sort: ProjectSort): T[] {
  const list = [...projects];
  if (sort === "name") return list.sort(byName);
  if (sort === "stars") return list.sort((a, b) => b.stars - a.stars || byName(a, b));
  // Never pushed (null) goes last.
  const time = (p: T) => (p.pushedAt ? Date.parse(p.pushedAt) : -Infinity);
  return list.sort((a, b) => time(b) - time(a) || byName(a, b));
}

/** The list with these projects moved to a status: what the page shows before the API answers. */
export function withStatus<T extends Pick<DashboardProject, "id" | "status">>(projects: T[], ids: Iterable<string>, status: ProjectStatus): T[] {
  const set = new Set(ids);
  return projects.map((p) => (set.has(p.id) ? { ...p, status } : p));
}

/** The list with each project put back to the status it had in `previous` (id -> status). */
export function withPrevious<T extends Pick<DashboardProject, "id" | "status">>(projects: T[], previous: Map<string, ProjectStatus>): T[] {
  return projects.map((p) => (previous.has(p.id) ? { ...p, status: previous.get(p.id)! } : p));
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
