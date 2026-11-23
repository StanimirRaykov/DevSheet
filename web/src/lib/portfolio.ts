import type { PublicPortfolio } from "@/lib/api";

/** Category order on the public page; matches SkillCategories in the API. Unknown categories go last. */
export const SKILL_CATEGORY_ORDER = ["Languages", "Frameworks and platforms", "Databases", "Tools", "Other"];

export interface MatrixRow {
  name: string;
  /** One entry per project, in the page's project order: was the skill used there? */
  used: boolean[];
  projects: string[];
}

/**
 * The skills matrix, grouped by category. Each row lines up with the project list, so a column of dots is one
 * project. Rows keep the API's order inside a group (most used first).
 */
export function skillMatrix(data: Pick<PublicPortfolio, "skills" | "projects">): { category: string; rows: MatrixRow[] }[] {
  const titles = data.projects.map((p) => p.title);
  const groups = new Map<string, MatrixRow[]>();
  for (const skill of data.skills) {
    const rows = groups.get(skill.category) ?? [];
    rows.push({ name: skill.name, projects: skill.projects, used: titles.map((t) => skill.projects.includes(t)) });
    groups.set(skill.category, rows);
  }
  const rank = (c: string) => {
    const i = SKILL_CATEGORY_ORDER.indexOf(c);
    return i === -1 ? SKILL_CATEGORY_ORDER.length : i;
  };
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([category, rows]) => ({ category, rows }));
}

export interface LanguageShare {
  name: string;
  /** Whole percent, at least 1. */
  percent: number;
}

/**
 * A repository's languages by share of code, the largest first. Anything past `max` is folded into "Other".
 * Bad JSON gives an empty list.
 */
export function languageShares(json: string, max = 3): LanguageShare[] {
  let entries: [string, number][];
  try {
    entries = Object.entries(JSON.parse(json) as Record<string, number>).filter(([, bytes]) => bytes > 0);
  } catch {
    return [];
  }
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total === 0) return [];
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, max);
  const rest = entries.slice(max).reduce((sum, [, bytes]) => sum + bytes, 0);
  if (rest > 0) top.push(["Other", rest]);
  return top.map(([name, bytes]) => ({ name, percent: Math.max(1, Math.round((bytes / total) * 100)) }));
}

/** "https://www.ana.dev/blog/" -> "ana.dev/blog": how a link reads on the page. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}
