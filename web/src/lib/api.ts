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
  displayName: string;
  avatarUrl: string | null;
  githubLogin: string | null; // null when the owner has not connected GitHub
  slug: string;
  cvDownload: boolean; // the owner lets visitors download the CV (off by default)
  projects: {
    title: string;
    description: string | null;
    url: string;
    stars: number;
    languagesJson: string;
    skills: string[]; // confirmed only
  }[];
  skills: { name: string; category: string; projects: string[] }[]; // the matrix: skill -> projects, most used first
  // email/location are null unless the owner opted in (or when empty)
  profile: {
    fullName: string; headline: string; summary: string;
    location: string | null; email: string | null; website: string | null;
  } | null;
  experience: { company: string; title: string; startDate: string; endDate: string | null; description: string }[];
  education: { institution: string; degree: string; startDate: string | null; endDate: string | null }[];
  languages: {
    name: string; isMotherTongue: boolean;
    listening: number | null; reading: number | null; spokenInteraction: number | null;
    spokenProduction: number | null; writing: number | null;
  }[];
  certifications: { name: string; issuer: string; issueDate: string | null; url: string | null }[];
}

export interface ProfileData {
  fullName: string; headline: string; summary: string; location: string; email: string; website: string;
  showEmailPublicly: boolean; showLocationPublicly: boolean;
}
export interface ExperienceItem {
  id: string; company: string; title: string; startDate: string; endDate: string | null; description: string;
}
export interface EducationItem {
  id: string; institution: string; degree: string; startDate: string | null; endDate: string | null;
}

export interface LanguageItem {
  id: string; name: string; isoCode: string | null; isMotherTongue: boolean;
  listening: number | null; reading: number | null; spokenInteraction: number | null;
  spokenProduction: number | null; writing: number | null; // CEFR 1 = A1 ... 6 = C2
}
export interface CertificationItem {
  id: string; name: string; issuer: string; issueDate: string | null; url: string | null;
}

export function topLanguages(json: string, n = 3): string[] {
  try {
    const map = JSON.parse(json) as Record<string, number>;
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  } catch {
    return [];
  }
}

/** The signed-in account, from GET /api/me. */
export interface Me {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  slug: string;
  isPublished: boolean;
  /** The GitHub account repos sync from; null when GitHub is not connected. */
  github: { login: string; lastSyncedAt: string | null } | null;
}
