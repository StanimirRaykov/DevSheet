import { describe, expect, it } from "vitest";
import type { MeSummary } from "./api";
import { cvGaps, cvIncluded, cvUrl } from "./cv";

const summary: MeSummary = {
  isPublished: true, slug: "ana", hasHeadline: true, hasSummary: false, experience: 2, education: 0, languages: 1,
  certifications: 0, projects: { pending: 3, visible: 4, hidden: 1 }, confirmedSkills: 7, suggestedSkills: 1,
  github: null,
};
const row = (key: string, s = summary) => cvIncluded(s).find((r) => r.key === key)!;

describe("cvIncluded", () => {
  it("counts what the CV contains: visible projects and the skills confirmed on them", () => {
    expect(row("projects").count).toBe(4);
    expect(row("skills").count).toBe(7);
    expect(row("experience").count).toBe(2);
  });

  it("says what else could be included", () => {
    expect(row("projects").note).toBe("4 more are pending or hidden");
    expect(row("skills").note).toBe("1 suggestion waits for you");
    expect(row("about").note).toBe("The summary is missing");
    expect(row("projects", { ...summary, projects: { pending: 1, visible: 0, hidden: 0 } }).note).toBe("1 more is pending or hidden");
  });

  it("points out the empty parts with links to fix them, but not the optional ones", () => {
    const gaps = cvGaps(cvIncluded(summary));
    expect(gaps.map((g) => [g.empty, g.href])).toEqual([["No education yet", "/dashboard/profile?tab=education"]]);
    expect(row("certifications").optional).toBe(true);
  });

  it("finds no gaps when everything is there", () => {
    const full = { ...summary, hasSummary: true, education: 1 };
    expect(cvGaps(cvIncluded(full))).toEqual([]);
    expect(row("about", full).note).toBeUndefined();
  });
});

describe("cvUrl", () => {
  it("adds inline=true for the preview only", () => {
    expect(cvUrl("europass")).toMatch(/\/api\/me\/cv\.pdf\?template=europass$/);
    expect(cvUrl("modern", { preview: true })).toMatch(/\/api\/me\/cv\.pdf\?template=modern&inline=true$/);
  });
});
