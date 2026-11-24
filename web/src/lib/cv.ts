import { PUBLIC_API, type MeSummary } from "./api";

export type CvTemplateId = "modern" | "europass";

export interface CvTemplate {
  id: CvTemplateId;
  name: string;
  format: string;
  description: string;
}

export const CV_TEMPLATES: CvTemplate[] = [
  { id: "modern", name: "Modern", format: "PDF", description: "One clean column with your projects up front. For most job applications." },
  { id: "europass", name: "Europass-style", format: "PDF", description: "The European layout with the language grid. A look-alike: for the official format, use the Europass export." },
];

/** The download link (the browser saves the PDF) or, with preview, the same PDF shown in the browser. */
export function cvUrl(template: CvTemplateId, { preview = false } = {}): string {
  return `${PUBLIC_API}/api/me/cv.pdf?template=${template}${preview ? "&inline=true" : ""}`;
}

/** The same CV as Europass XML, for the official Europass online editor. */
export function europassXmlUrl(): string {
  return `${PUBLIC_API}/api/me/cv.xml`;
}

/** Where the person imports the XML: the Europass CV editor (sign-in at Europass needed). */
export const EUROPASS_EDITOR = "https://europa.eu/europass/eportfolio/screen/cv-editor";

export interface IncludedRow {
  key: string;
  label: string;
  count: number;
  /** Optional parts are not gaps when empty (not everyone has certifications). */
  optional: boolean;
  /** Said when nothing is included: "No education yet". */
  empty: string;
  /** Where to add or fix it. */
  href: string;
  /** More that could be included, e.g. "4 more wait for approval". */
  note?: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * What the CV will contain, part by part, from the overview summary. Counts follow the CV's own rules: only
 * visible projects and the skills confirmed on them.
 */
export function cvIncluded(s: MeSummary): IncludedRow[] {
  const waiting = s.projects.pending + s.projects.hidden;
  return [
    {
      key: "about", label: "Headline and summary", count: Number(s.hasHeadline) + Number(s.hasSummary), optional: false,
      empty: "No headline or summary yet", href: "/dashboard/profile",
      note: s.hasHeadline !== s.hasSummary ? (s.hasHeadline ? "The summary is missing" : "The headline is missing") : undefined,
    },
    {
      key: "projects", label: "Projects", count: s.projects.visible, optional: false, empty: "No visible projects yet", href: "/dashboard/projects",
      note: waiting > 0 ? `${plural(waiting, "more is", "more are")} pending or hidden` : undefined,
    },
    {
      key: "skills", label: "Skills", count: s.confirmedSkills, optional: false, empty: "No confirmed skills yet", href: "/dashboard/skills",
      note: s.suggestedSkills > 0 ? `${plural(s.suggestedSkills, "suggestion waits", "suggestions wait")} for you` : undefined,
    },
    { key: "experience", label: "Work experience", count: s.experience, optional: false, empty: "No work experience yet", href: "/dashboard/profile?tab=experience" },
    { key: "education", label: "Education", count: s.education, optional: false, empty: "No education yet", href: "/dashboard/profile?tab=education" },
    { key: "languages", label: "Languages", count: s.languages, optional: false, empty: "No languages yet", href: "/dashboard/profile?tab=languages" },
    { key: "certifications", label: "Certifications", count: s.certifications, optional: true, empty: "No certifications (optional)", href: "/dashboard/profile?tab=certifications" },
  ];
}

/** The parts that are empty and expected: the gaps to point out. */
export function cvGaps(rows: IncludedRow[]): IncludedRow[] {
  return rows.filter((r) => r.count === 0 && !r.optional);
}
