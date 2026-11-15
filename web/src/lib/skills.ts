import { DashboardSkill } from "@/lib/api";

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
