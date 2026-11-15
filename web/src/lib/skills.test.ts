import { describe, expect, it } from "vitest";
import { DashboardSkill } from "@/lib/api";
import { projectsLabel, splitSkills } from "@/lib/skills";

const skill = (name: string, status: 0 | 1 | 2): DashboardSkill => ({ skillId: name, name, status });

describe("splitSkills", () => {
  it("separates confirmed and suggested and hides rejected", () => {
    const { confirmed, suggested } = splitSkills([
      skill("C#", 1), skill("Docker", 0), skill("Python", 2), skill("Go", 1),
    ]);
    expect(confirmed.map((s) => s.name)).toEqual(["C#", "Go"]);
    expect(suggested.map((s) => s.name)).toEqual(["Docker"]);
  });

  it("handles no skills", () => {
    expect(splitSkills([])).toEqual({ confirmed: [], suggested: [] });
  });
});

describe("projectsLabel", () => {
  it("pluralizes", () => {
    expect(projectsLabel(1)).toBe("1 project");
    expect(projectsLabel(3)).toBe("3 projects");
  });
});
