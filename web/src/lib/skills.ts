import type { DashboardSkill, LinkStatus, SkillLinkKey, SkillSummary } from "@/lib/api";
import { SKILL_CATEGORY_ORDER } from "@/lib/portfolio";

export const SUGGESTED = 0, CONFIRMED = 1, REJECTED = 2;

/**
 * Splits a project's skill links for the dashboard. Rejected links are not shown:
 * the API keeps them so a dismissed suggestion is never proposed again.
 */
export function splitSkills(skills: DashboardSkill[]) {
  return {
    confirmed: skills.filter((s) => s.status === CONFIRMED),
    suggested: skills.filter((s) => s.status === SUGGESTED),
  };
}

export function projectsLabel(count: number): string {
  return count === 1 ? "1 project" : `${count} projects`;
}

export interface Suggestion {
  skillId: string;
  name: string;
  category: string;
  /** The projects it was found in and still waits for a decision on. */
  projects: { projectId: string; title: string }[];
  /** Already confirmed on other projects: confirming here only adds projects. */
  alreadyConfirmed: boolean;
}

export interface ConfirmedSkill {
  skillId: string;
  name: string;
  /** Visible projects with the skill confirmed: exactly what the public page counts. */
  onPage: string[];
  /** Pending or hidden projects with the skill confirmed: kept, but not shown on the page. */
  offPage: string[];
  /** Every confirmed link, to remove the skill from all its projects at once. */
  links: SkillLinkKey[];
}

export interface RejectedSkill {
  skillId: string;
  name: string;
  projects: { projectId: string; title: string }[];
}

export interface SkillBoard {
  suggestions: Suggestion[];
  /** Grouped by category in the public page's order; inside a group, most projects on the page first. */
  confirmed: { category: string; skills: ConfirmedSkill[] }[];
  rejected: RejectedSkill[];
}

/** Splits my skills into the three parts of the Skills page. Input order (A to Z) is kept where nothing else decides. */
export function skillBoard(skills: SkillSummary[]): SkillBoard {
  const suggestions: Suggestion[] = [];
  const rejected: RejectedSkill[] = [];
  const groups = new Map<string, ConfirmedSkill[]>();

  for (const s of skills) {
    const byStatus = (status: number) => s.projects.filter((p) => p.status === status);
    const suggested = byStatus(SUGGESTED);
    const confirmed = byStatus(CONFIRMED);
    const declined = byStatus(REJECTED);

    if (suggested.length > 0) {
      suggestions.push({
        skillId: s.skillId, name: s.name, category: s.category, alreadyConfirmed: confirmed.length > 0,
        projects: suggested.map((p) => ({ projectId: p.projectId, title: p.projectTitle })),
      });
    }
    if (confirmed.length > 0) {
      const list = groups.get(s.category) ?? [];
      list.push({
        skillId: s.skillId, name: s.name,
        onPage: confirmed.filter((p) => p.projectStatus === 1).map((p) => p.projectTitle),
        offPage: confirmed.filter((p) => p.projectStatus !== 1).map((p) => p.projectTitle),
        links: confirmed.map((p) => ({ projectId: p.projectId, skillId: s.skillId })),
      });
      groups.set(s.category, list);
    }
    // Rejected everywhere it was found: nothing else to decide, so it can only be restored.
    if (declined.length > 0 && suggested.length === 0 && confirmed.length === 0) {
      rejected.push({ skillId: s.skillId, name: s.name, projects: declined.map((p) => ({ projectId: p.projectId, title: p.projectTitle })) });
    }
  }

  const rank = (c: string) => {
    const i = SKILL_CATEGORY_ORDER.indexOf(c);
    return i === -1 ? SKILL_CATEGORY_ORDER.length : i;
  };
  const confirmed = [...groups.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([category, list]) => ({ category, skills: [...list].sort((a, b) => b.onPage.length - a.onPage.length) }));
  return { suggestions, confirmed, rejected };
}

/** Projects that have suggestions waiting, with how many: for "Confirm all from this project". Most first. */
export function suggestionsByProject(suggestions: Suggestion[]): { projectId: string; title: string; links: SkillLinkKey[] }[] {
  const map = new Map<string, { projectId: string; title: string; links: SkillLinkKey[] }>();
  for (const s of suggestions) {
    for (const p of s.projects) {
      const entry = map.get(p.projectId) ?? { projectId: p.projectId, title: p.title, links: [] };
      entry.links.push({ projectId: p.projectId, skillId: s.skillId });
      map.set(p.projectId, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.links.length - a.links.length || a.title.localeCompare(b.title));
}

/** The links a decision on one suggestion changes: the skill on every project it waits on. */
export const linksOf = (s: Pick<Suggestion, "skillId" | "projects">): SkillLinkKey[] =>
  s.projects.map((p) => ({ projectId: p.projectId, skillId: s.skillId }));

export const linkKey = (l: SkillLinkKey) => `${l.projectId}:${l.skillId}`;

/** The current status of each of these links (key -> status), to put them back later. */
export function statusesOf(skills: SkillSummary[], links: SkillLinkKey[]): Map<string, LinkStatus> {
  const wanted = new Set(links.map(linkKey));
  const found = new Map<string, LinkStatus>();
  for (const s of skills)
    for (const p of s.projects) {
      const key = linkKey({ projectId: p.projectId, skillId: s.skillId });
      if (wanted.has(key)) found.set(key, p.status);
    }
  return found;
}

/** The skills with some links changed (key -> new status): what the page shows before the API answers. */
export function withLinkStatuses(skills: SkillSummary[], changes: Map<string, LinkStatus>): SkillSummary[] {
  return skills.map((s) => ({
    ...s,
    projects: s.projects.map((p) => {
      const next = changes.get(linkKey({ projectId: p.projectId, skillId: s.skillId }));
      return next === undefined ? p : { ...p, status: next };
    }),
  }));
}

/** Splits key -> status back into one list of links per status, one request each. */
export function groupByStatus(changes: Map<string, LinkStatus>): [LinkStatus, SkillLinkKey[]][] {
  const groups = new Map<LinkStatus, SkillLinkKey[]>();
  for (const [key, status] of changes) {
    const [projectId, skillId] = key.split(":");
    groups.set(status, [...(groups.get(status) ?? []), { projectId, skillId }]);
  }
  return [...groups];
}
