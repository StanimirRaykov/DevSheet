import { describe, expect, it } from "vitest";
import type { ProjectStatus } from "./api";
import { countByTab, defaultTab, sortProjects, visibleProjects, withPrevious, withStatus } from "./projects";

const p = (id: string, status: ProjectStatus, extra: Partial<{ title: string; description: string | null; stars: number; pushedAt: string | null }> = {}) => ({
  id, status, title: id, description: null, stars: 0, pushedAt: null, ...extra,
});

const list = [
  p("api-gateway", 0, { stars: 4, pushedAt: "2026-05-01T00:00:00Z", description: "Routes requests" }),
  p("Blog", 1, { stars: 10, pushedAt: "2026-01-01T00:00:00Z" }),
  p("café-finder", 0, { stars: 4, pushedAt: null }),
  p("dotfiles", 2, { stars: 1, pushedAt: "2026-06-01T00:00:00Z" }),
];

describe("countByTab and defaultTab", () => {
  it("counts each tab", () => expect(countByTab(list)).toEqual({ pending: 2, visible: 1, hidden: 1 }));
  it("opens Pending while something waits", () => expect(defaultTab(list)).toBe("pending"));
  it("opens Visible when nothing waits", () => expect(defaultTab([p("a", 1), p("b", 2)])).toBe("visible"));
  it("opens Visible with no projects", () => expect(defaultTab([])).toBe("visible"));
});

describe("visibleProjects", () => {
  const titles = (tab: "pending" | "visible" | "hidden", query = "", sort: "updated" | "stars" | "name" = "name") =>
    visibleProjects(list, { tab, query, sort }).map((x) => x.title);

  it("keeps one tab only", () => expect(titles("pending")).toEqual(["api-gateway", "café-finder"]));
  it("searches name and description, ignoring case", () => expect(titles("pending", "ROUTES")).toEqual(["api-gateway"]));
  it("ignores accents", () => expect(titles("pending", "cafe")).toEqual(["café-finder"]));
  it("needs every word typed", () => expect(titles("pending", "api nothing")).toEqual([]));
  it("treats blank search as no search", () => expect(titles("visible", "   ")).toEqual(["Blog"]));
});

describe("sortProjects", () => {
  const names = (sort: "updated" | "stars" | "name") => sortProjects(list, sort).map((x) => x.title);

  it("sorts by name without caring about case", () => expect(names("name")).toEqual(["api-gateway", "Blog", "café-finder", "dotfiles"]));
  it("puts most stars first, ties by name", () => expect(names("stars")).toEqual(["Blog", "api-gateway", "café-finder", "dotfiles"]));
  it("puts the latest push first and never-pushed last", () => expect(names("updated")).toEqual(["dotfiles", "api-gateway", "Blog", "café-finder"]));
  it("does not change the list it was given", () => {
    const before = list.map((x) => x.id);
    sortProjects(list, "stars");
    expect(list.map((x) => x.id)).toEqual(before);
  });
});

describe("withStatus and withPrevious", () => {
  it("moves only the given projects and puts them back", () => {
    const moved = withStatus(list, ["api-gateway", "café-finder"], 1);
    expect(moved.map((x) => x.status)).toEqual([1, 1, 1, 2]);
    const back = withPrevious(moved, new Map<string, ProjectStatus>([["api-gateway", 0], ["café-finder", 0]]));
    expect(back.map((x) => x.status)).toEqual([0, 1, 0, 2]);
  });
});
