export const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5217";
export const SERVER_API = process.env.API_URL ?? PUBLIC_API;

export type ProjectStatus = 0 | 1 | 2; // Pending | Visible | Hidden

export type LinkStatus = 0 | 1 | 2; // Suggested | Confirmed | Rejected

export interface DashboardSkill {
  skillId: string;
  name: string;
  status: LinkStatus;
}

export interface DashboardProject {
  id: string;
  status: ProjectStatus;
  title: string;
  description: string | null;
  url: string;
  stars: number;
  languagesJson: string;
  sourceMissing: boolean;
  skills: DashboardSkill[];
}

export interface PublicPortfolio {
  githubLogin: string;
  slug: string;
  projects: {
    title: string;
    description: string | null;
    url: string;
    stars: number;
    languagesJson: string;
    skills: string[]; // confirmed only
  }[];
  skills: { name: string; projects: string[] }[]; // the matrix: skill -> projects
}

export function topLanguages(json: string, n = 3): string[] {
  try {
    const map = JSON.parse(json) as Record<string, number>;
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  } catch {
    return [];
  }
}
