import type { MeSummary } from "./api";

/**
 * Profile completeness, 0 to 100 %. Each item is done or not; the weights add up to 100:
 *
 * | item                     | weight |
 * |--------------------------|--------|
 * | headline                 | 10     |
 * | summary                  | 10     |
 * | at least one job         | 15     |
 * | at least one education   | 10     |
 * | at least one language    | 10     |
 * | 3 skills on the page     | 15     |
 * | 3 visible projects       | 15     |
 * | GitHub connected         | 5      |
 * | page published           | 10     |
 *
 * Projects, skills and work experience weigh most: they are what a reader of a developer's page looks for.
 */
export interface CompletenessItem {
  key: string;
  weight: number;
  done: boolean;
  /** What to do, said as the link text: "Add a headline". */
  todo: string;
  /** Progress for the counted items, e.g. "2 of 3". */
  progress?: string;
  href: string;
}

export const SKILLS_NEEDED = 3;
export const PROJECTS_NEEDED = 3;

const counted = (n: number, needed: number) => (n > 0 && n < needed ? `${n} of ${needed}` : undefined);

export function completenessItems(s: MeSummary): CompletenessItem[] {
  return [
    { key: "headline", weight: 10, done: s.hasHeadline, todo: "Add a headline", href: "/dashboard/profile" },
    { key: "summary", weight: 10, done: s.hasSummary, todo: "Write a short summary", href: "/dashboard/profile" },
    { key: "experience", weight: 15, done: s.experience > 0, todo: "Add your work experience", href: "/dashboard/profile?tab=experience" },
    { key: "education", weight: 10, done: s.education > 0, todo: "Add your education", href: "/dashboard/profile?tab=education" },
    { key: "language", weight: 10, done: s.languages > 0, todo: "Add the languages you speak", href: "/dashboard/profile?tab=languages" },
    {
      key: "skills", weight: 15, done: s.confirmedSkills >= SKILLS_NEEDED,
      todo: `Confirm ${SKILLS_NEEDED} skills on visible projects`, progress: counted(s.confirmedSkills, SKILLS_NEEDED), href: "/dashboard/skills",
    },
    {
      key: "projects", weight: 15, done: s.projects.visible >= PROJECTS_NEEDED,
      todo: `Show ${PROJECTS_NEEDED} projects on your page`, progress: counted(s.projects.visible, PROJECTS_NEEDED), href: "/dashboard/projects",
    },
    { key: "github", weight: 5, done: s.github !== null, todo: "Connect GitHub", href: "/settings?tab=sign-in" },
    { key: "published", weight: 10, done: s.isPublished, todo: "Publish your page", href: "/settings?tab=public-page" },
  ];
}

/** The sum of the weights of the items that are done. */
export function completeness(items: CompletenessItem[]): number {
  return items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
}
