import { describe, expect, it } from "vitest";
import type { MeSummary } from "./api";
import { completeness, completenessItems } from "./completeness";

const empty: MeSummary = {
  isPublished: false, slug: "ana", hasHeadline: false, hasSummary: false, experience: 0, education: 0, languages: 0,
  certifications: 0, projects: { pending: 0, visible: 0, hidden: 0 }, confirmedSkills: 0, suggestedSkills: 0, github: null,
};
const full: MeSummary = {
  ...empty, isPublished: true, hasHeadline: true, hasSummary: true, experience: 2, education: 1, languages: 2,
  projects: { pending: 0, visible: 3, hidden: 1 }, confirmedSkills: 3, github: { login: "ana", lastSyncedAt: null },
};
const score = (s: MeSummary) => completeness(completenessItems(s));

describe("completeness", () => {
  it("is 0 % for an empty profile and 100 % for a full one", () => {
    expect(score(empty)).toBe(0);
    expect(score(full)).toBe(100);
  });

  it("weighs each item as documented", () => {
    const weights = Object.fromEntries(completenessItems(empty).map((i) => [i.key, i.weight]));
    expect(weights).toEqual({ headline: 10, summary: 10, experience: 15, education: 10, language: 10, skills: 15, projects: 15, github: 5, published: 10 });
    expect(score({ ...empty, hasHeadline: true })).toBe(10);
    expect(score({ ...empty, experience: 1 })).toBe(15);
    expect(score({ ...empty, github: { login: "ana", lastSyncedAt: null } })).toBe(5);
    expect(score({ ...full, isPublished: false })).toBe(90);
  });

  it("needs 3 skills and 3 visible projects, and says how far along they are", () => {
    const partly = completenessItems({ ...empty, confirmedSkills: 2, projects: { pending: 5, visible: 1, hidden: 4 } });
    const skills = partly.find((i) => i.key === "skills")!;
    const projects = partly.find((i) => i.key === "projects")!;
    expect([skills.done, skills.progress]).toEqual([false, "2 of 3"]);
    expect([projects.done, projects.progress]).toEqual([false, "1 of 3"]);
    expect(completeness(partly)).toBe(0);
  });

  it("links every missing item to the page that fixes it", () => {
    const hrefs = completenessItems(empty).map((i) => i.href);
    expect(hrefs).toContain("/dashboard/profile?tab=experience");
    expect(hrefs).toContain("/dashboard/skills");
    expect(hrefs).toContain("/settings?tab=public-page");
  });
});
