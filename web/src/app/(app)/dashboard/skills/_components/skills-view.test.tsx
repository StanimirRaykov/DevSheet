import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeProvider } from "@/components/me-provider";
import { ToastProvider } from "@/components/ui";
import type { DashboardProject, LinkStatus, Me, ProjectStatus, SkillSummary } from "@/lib/api";
import type { SendResult } from "@/lib/client";
import { SkillsView } from "./skills-view";

vi.mock("@/components/motion-provider", async () => {
  const { motionPresets } = await import("@/components/motion");
  return { useMotionPresets: () => motionPresets(true) };
});
const refreshed: string[][] = [];
vi.mock("../../../settings/actions", () => ({ refreshPublicPages: async (slugs: string[]) => { refreshed.push(slugs); } }));

// A plain function, not vi.fn: each test sets what the API answers.
let answer: (path: string, method: string, body: unknown) => SendResult<unknown>;
const calls: string[] = [];
vi.mock("@/lib/client", () => ({
  send: async (path: string, method = "GET", body?: unknown) => {
    calls.push(`${method} ${path}${body === undefined ? "" : " " + JSON.stringify(body)}`);
    return answer(path, method, body);
  },
}));

const ok = <T,>(data: T): SendResult<T> => ({ ok: true, status: 200, data, errors: {} });
const fail: SendResult<unknown> = { ok: false, status: 500, data: null, errors: {} };
const me: Me = { id: "u1", displayName: "Ana", avatarUrl: null, slug: "ana-petrova", isPublished: true, github: null };

const link = (projectId: string, status: LinkStatus, projectStatus: ProjectStatus = 1) => ({ projectId, projectTitle: projectId, projectStatus, status });
const skill = (name: string, category: string, ...projects: ReturnType<typeof link>[]): SkillSummary => ({ skillId: name, name, category, projects });
const project = (id: string, status: ProjectStatus = 1) => ({ id, title: id, status }) as DashboardProject;

function api(skills: SkillSummary[], change: (path: string, method: string, body: unknown) => SendResult<unknown> = () => ok({ updated: 1 })) {
  answer = (path, method, body) => {
    if (method === "GET" && path === "/api/me/skill-links") return ok(skills);
    if (method === "GET" && path === "/api/me/projects") return ok([project("api"), project("cli"), project("draft", 0)]);
    if (method === "GET" && path.startsWith("/api/me/skills?query=")) return ok([{ id: "x", name: "Docker" }]);
    return change(path, method, body);
  };
}

const renderView = () => render(<MeProvider me={me}><ToastProvider><SkillsView /></ToastProvider></MeProvider>);
const queue = () => screen.getByRole("list", { name: "Suggested skills" });
const patches = () => calls.filter((c) => c.startsWith("PATCH"));

beforeEach(() => {
  calls.length = 0;
  refreshed.length = 0;
});

describe("SkillsView", () => {
  it("shows suggestions, confirmed skills by category and the rejected ones", async () => {
    api([
      skill("C#", "Languages", link("api", 1), link("cli", 1), link("draft", 1, 0)),
      skill("Docker", "Tools", link("api", 0), link("cli", 0)),
      skill("Go", "Languages", link("cli", 2)),
    ]);
    renderView();

    const docker = await screen.findByRole("listitem", { name: "Docker, found in api, cli" });
    expect(within(docker).getByRole("button", { name: "Confirm Docker" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Languages" })).toBeInTheDocument();
    const csharp = screen.getByRole("button", { name: "C#, on your page through 2 projects" });

    await userEvent.click(csharp);
    expect(screen.getByText(/which is pending or hidden/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore Go" })).toBeInTheDocument();
  });

  it("confirms a suggestion on every project it was found in, then undoes it", async () => {
    api([skill("Docker", "Tools", link("api", 0), link("cli", 0)), skill("Rust", "Languages", link("api", 0))]);
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Confirm Docker" }));

    expect(patches()).toEqual([
      'PATCH /api/me/skill-links {"links":[{"projectId":"api","skillId":"Docker"},{"projectId":"cli","skillId":"Docker"}],"status":1}',
    ]);
    const toast = (await screen.findByText("Docker confirmed")).closest("li")!;
    expect(screen.getByRole("heading", { name: "Tools" })).toBeInTheDocument();
    expect(refreshed).toEqual([["ana-petrova"]]);

    await userEvent.click(within(toast).getByRole("button", { name: "Undo" }));

    await waitFor(() => expect(patches()).toHaveLength(2));
    expect(patches()[1]).toBe('PATCH /api/me/skill-links {"links":[{"projectId":"api","skillId":"Docker"},{"projectId":"cli","skillId":"Docker"}],"status":0}');
    expect(await screen.findByRole("button", { name: "Confirm Docker" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tools" })).not.toBeInTheDocument();
  });

  it("puts a suggestion back and explains when the API refuses", async () => {
    api([skill("Docker", "Tools", link("api", 0))], () => fail);
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Reject Docker" }));

    expect(await screen.findByText("Docker not rejected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject Docker" })).toBeInTheDocument();
    expect(refreshed).toEqual([]);
  });

  it("confirms and rejects with the keyboard", async () => {
    api([skill("Docker", "Tools", link("api", 0)), skill("Rust", "Languages", link("cli", 0)), skill("Zig", "Languages", link("cli", 0))]);
    renderView();
    const first = await screen.findByRole("listitem", { name: /^Docker/ });
    first.focus();

    await userEvent.keyboard("{ArrowDown}");
    expect(within(queue()).getByRole("listitem", { name: /^Rust/ })).toHaveFocus();
    await userEvent.keyboard("r");
    await userEvent.keyboard("{ArrowUp}c");

    expect(patches()).toEqual([
      'PATCH /api/me/skill-links {"links":[{"projectId":"cli","skillId":"Rust"}],"status":2}',
      'PATCH /api/me/skill-links {"links":[{"projectId":"api","skillId":"Docker"}],"status":1}',
    ]);
  });

  it("confirms all suggestions from one project", async () => {
    api([skill("Docker", "Tools", link("api", 0), link("cli", 0)), skill("Rust", "Languages", link("api", 0))]);
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Confirm all 2 from api" }));

    expect(patches()).toEqual([
      'PATCH /api/me/skill-links {"links":[{"projectId":"api","skillId":"Docker"},{"projectId":"api","skillId":"Rust"}],"status":1}',
    ]);
    expect(await screen.findByText("2 skills from api confirmed")).toBeInTheDocument();
    // Docker still waits on cli.
    expect(screen.getByRole("listitem", { name: "Docker, found in cli" })).toBeInTheDocument();
  });

  it("restores a rejected skill to the suggestions", async () => {
    api([skill("Go", "Languages", link("cli", 2))]);
    renderView();
    await userEvent.click(await screen.findByText("Rejected"));
    await userEvent.click(screen.getByRole("button", { name: "Restore Go" }));

    expect(patches()).toEqual(['PATCH /api/me/skill-links {"links":[{"projectId":"cli","skillId":"Go"}],"status":0}']);
    expect(await screen.findByRole("button", { name: "Confirm Go" })).toBeInTheDocument();
  });

  it("adds a skill to the ticked projects", async () => {
    api([], (path, method) => (method === "POST" ? ok({ skillId: "d", name: "Docker", status: 1 }) : ok(null)));
    renderView();
    await userEvent.type(await screen.findByRole("combobox", { name: "Skill" }), "Docker");
    await userEvent.click(screen.getByRole("checkbox", { name: /api/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /draft/ }));
    await userEvent.click(screen.getByRole("button", { name: "Add to 2 projects" }));

    expect(await screen.findByText("Docker added to 2 projects")).toBeInTheDocument();
    expect(calls).toContain('POST /api/me/projects/api/skills {"name":"Docker"}');
    expect(calls).toContain('POST /api/me/projects/draft/skills {"name":"Docker"}');
  });

  it("asks for a project before adding", async () => {
    api([]);
    renderView();
    await userEvent.type(await screen.findByRole("combobox", { name: "Skill" }), "Docker");
    await userEvent.click(screen.getByRole("button", { name: "Add skill" }));

    expect(screen.getByText("Tick at least one project that uses it.")).toBeInTheDocument();
    expect(calls.some((c) => c.startsWith("POST"))).toBe(false);
  });
});
