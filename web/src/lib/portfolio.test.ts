import { describe, expect, it } from "vitest";
import { displayUrl, languageShares, skillMatrix } from "./portfolio";

describe("skillMatrix", () => {
  const projects = [{ title: "ledger-api" }, { title: "trail-maps" }].map((p) => ({ ...p, description: null, url: "", stars: 0, languagesJson: "{}", skills: [] }));

  it("groups skills by category in page order and lines the dots up with the projects", () => {
    const groups = skillMatrix({
      projects,
      skills: [
        { name: "Docker", category: "Tools", projects: ["ledger-api"] },
        { name: "C#", category: "Languages", projects: ["ledger-api"] },
        { name: "TypeScript", category: "Languages", projects: ["trail-maps"] },
        { name: "Terraform", category: "Other", projects: ["ledger-api", "trail-maps"] },
      ],
    });

    expect(groups.map((g) => g.category)).toEqual(["Languages", "Tools", "Other"]);
    expect(groups[0].rows.map((r) => [r.name, r.used])).toEqual([["C#", [true, false]], ["TypeScript", [false, true]]]);
    expect(groups[2].rows[0].used).toEqual([true, true]);
  });
});

describe("languageShares", () => {
  it("gives percentages, largest first, folding the rest into Other", () => {
    expect(languageShares('{"CSS":10,"TypeScript":70,"HTML":10,"Shell":5,"Dockerfile":5}')).toEqual([
      { name: "TypeScript", percent: 70 },
      { name: "CSS", percent: 10 },
      { name: "HTML", percent: 10 },
      { name: "Other", percent: 10 },
    ]);
  });

  it("never shows a language as 0%", () => {
    expect(languageShares('{"C#":99900,"PLpgSQL":100}')[1]).toEqual({ name: "PLpgSQL", percent: 1 });
  });

  it("is empty for no data or bad JSON", () => {
    expect(languageShares("{}")).toEqual([]);
    expect(languageShares("not json")).toEqual([]);
  });
});

describe("displayUrl", () => {
  it("drops the scheme, www and a trailing slash", () => {
    expect(displayUrl("https://www.ana.dev/blog/")).toBe("ana.dev/blog");
  });
});
