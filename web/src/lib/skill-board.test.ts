import { describe, expect, it } from "vitest";
import type { LinkStatus, ProjectStatus, SkillSummary } from "@/lib/api";
import { groupByStatus, linksOf, skillBoard, statusesOf, suggestionsByProject, withLinkStatuses } from "@/lib/skills";

const link = (projectId: string, status: LinkStatus, projectStatus: ProjectStatus = 1) =>
  ({ projectId, projectTitle: projectId, projectStatus, status });
const skill = (name: string, category: string, projects: ReturnType<typeof link>[]): SkillSummary =>
  ({ skillId: name, name, category, projects });

const skills = [
  skill("C#", "Languages", [link("api", 1), link("cli", 1), link("draft", 1, 0)]),
  skill("Docker", "Tools", [link("api", 0), link("cli", 0)]),
  skill("Go", "Languages", [link("cli", 2)]),
  skill("PostgreSQL", "Databases", [link("api", 1), link("old", 0, 2)]),
  skill("React", "Frameworks and platforms", [link("web", 1, 2)]),
  skill("Rust", "Languages", [link("api", 2), link("cli", 1)]),
];

describe("skillBoard", () => {
  const board = skillBoard(skills);

  it("queues skills with links still suggested, with only those projects", () => {
    expect(board.suggestions.map((s) => [s.name, s.projects.map((p) => p.title), s.alreadyConfirmed])).toEqual([
      ["Docker", ["api", "cli"], false],
      ["PostgreSQL", ["old"], true],
    ]);
  });

  it("groups confirmed skills by category in page order, most projects on the page first", () => {
    expect(board.confirmed.map((g) => [g.category, g.skills.map((s) => s.name)])).toEqual([
      ["Languages", ["C#", "Rust"]],
      ["Frameworks and platforms", ["React"]],
      ["Databases", ["PostgreSQL"]],
    ]);
  });

  it("counts only visible projects as on the page, like the public page", () => {
    const csharp = board.confirmed[0].skills[0];
    expect(csharp.onPage).toEqual(["api", "cli"]);
    expect(csharp.offPage).toEqual(["draft"]);
    expect(board.confirmed[1].skills[0]).toMatchObject({ onPage: [], offPage: ["web"] });
  });

  it("lists a skill as rejected only when it was rejected everywhere", () => {
    expect(board.rejected.map((r) => r.name)).toEqual(["Go"]);
  });

  it("handles no skills", () => expect(skillBoard([])).toEqual({ suggestions: [], confirmed: [], rejected: [] }));
});

describe("suggestionsByProject", () => {
  it("lists projects with waiting suggestions, most first", () => {
    const byProject = suggestionsByProject(skillBoard(skills).suggestions);
    expect(byProject.map((p) => [p.title, p.links.length])).toEqual([["api", 1], ["cli", 1], ["old", 1]]);
    expect(byProject[0].links).toEqual([{ projectId: "api", skillId: "Docker" }]);
  });
});

describe("statuses for undo", () => {
  it("changes links and puts them back exactly", () => {
    const links = [...linksOf(skillBoard(skills).suggestions[0]), { projectId: "cli", skillId: "Go" }];
    const before = statusesOf(skills, links);
    expect([...before.values()]).toEqual([0, 0, 2]);

    const changed = withLinkStatuses(skills, new Map(links.map((l) => [`${l.projectId}:${l.skillId}`, 1 as LinkStatus])));
    expect(skillBoard(changed).suggestions.map((s) => s.name)).toEqual(["PostgreSQL"]);
    expect(withLinkStatuses(changed, before)).toEqual(skills);
  });

  it("groups changes into one request per status", () => {
    const groups = groupByStatus(new Map<string, LinkStatus>([["api:Docker", 0], ["cli:Go", 2], ["cli:Docker", 0]]));
    expect(groups).toEqual([
      [0, [{ projectId: "api", skillId: "Docker" }, { projectId: "cli", skillId: "Docker" }]],
      [2, [{ projectId: "cli", skillId: "Go" }]],
    ]);
  });
});
