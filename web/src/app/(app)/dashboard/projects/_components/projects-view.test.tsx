import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeProvider } from "@/components/me-provider";
import { ToastProvider } from "@/components/ui";
import type { DashboardProject, Me, ProjectStatus } from "@/lib/api";
import type { SendResult } from "@/lib/client";
import { ProjectsView } from "./projects-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("@/components/motion-provider", async () => {
  const { motionPresets } = await import("@/components/motion");
  return { useMotionPresets: () => motionPresets(true) };
});
const refreshed: string[][] = [];
vi.mock("../../../settings/actions", () => ({ refreshPublicPages: async (slugs: string[]) => { refreshed.push(slugs); } }));

// A plain function, not vi.fn: each test sets what the API answers. It may return a promise to hold the answer back.
let answer: (path: string, method: string, body: unknown) => SendResult<unknown> | Promise<SendResult<unknown>>;
const calls: string[] = [];
vi.mock("@/lib/client", () => ({
  send: async (path: string, method = "GET", body?: unknown) => {
    calls.push(`${method} ${path}${body === undefined ? "" : " " + JSON.stringify(body)}`);
    return answer(path, method, body);
  },
}));

const ok = <T,>(data: T): SendResult<T> => ({ ok: true, status: 200, data, errors: {} });
const project = (id: string, status: ProjectStatus, extra: Partial<DashboardProject> = {}): DashboardProject => ({
  id, title: id, status, description: null, url: `https://github.com/ana/${id}`, stars: 0, languagesJson: '{"C#":100}',
  sourceMissing: false, pushedAt: null, skills: [], ...extra,
});
const me: Me = { id: "u1", displayName: "Ana", avatarUrl: null, slug: "ana-petrova", isPublished: true, github: { login: "ana", lastSyncedAt: null } };

function api(projects: DashboardProject[], change: (path: string, body: unknown) => SendResult<unknown> | Promise<SendResult<unknown>> = () => ok(null)) {
  answer = (path, method, body) => (method === "GET" && path === "/api/me/projects" ? ok(projects) : change(path, body));
}

function renderView() {
  render(<MeProvider me={me}><ToastProvider><ProjectsView /></ToastProvider></MeProvider>);
}
const tab = (name: string) => screen.getByRole("tab", { name: new RegExp(`^${name}`) });

beforeEach(() => {
  calls.length = 0;
  refreshed.length = 0;
});

describe("ProjectsView", () => {
  it("opens on Pending with counts when something waits", async () => {
    api([project("api-gateway", 0), project("blog", 1), project("dotfiles", 2), project("cli", 0)]);
    renderView();

    expect(await screen.findByRole("button", { name: "Approve api-gateway" })).toBeInTheDocument();
    expect(tab("Pending")).toHaveAttribute("aria-selected", "true");
    expect(tab("Pending")).toHaveTextContent("2");
    expect(tab("Visible")).toHaveTextContent("1");
    expect(tab("Hidden")).toHaveTextContent("1");
  });

  it("opens on Visible and says what to do when nothing waits", async () => {
    api([project("blog", 1)]);
    renderView();

    expect(await screen.findByRole("button", { name: "Hide blog" })).toBeInTheDocument();
    expect(tab("Visible")).toHaveAttribute("aria-selected", "true");
    await userEvent.click(tab("Pending"));
    expect(screen.getByText("No pending repos")).toBeInTheDocument();
  });

  it("moves a project at once and keeps it there when the API agrees", async () => {
    let release!: (r: SendResult<unknown>) => void;
    api([project("api-gateway", 0), project("cli", 0)], () => new Promise((r) => (release = r)));
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Approve api-gateway" }));

    // Before the API answers, the project is already counted in Visible.
    expect(tab("Pending")).toHaveTextContent("1");
    expect(tab("Visible")).toHaveTextContent("1");

    release({ ok: true, status: 204, data: null, errors: {} });
    expect(await screen.findByText("api-gateway approved")).toBeInTheDocument();
    expect(calls).toContain('PATCH /api/me/projects/api-gateway/status {"status":1}');
    expect(refreshed).toEqual([["ana-petrova"]]);
    expect(tab("Visible")).toHaveTextContent("1");
  });

  it("puts the project back and explains when the API refuses", async () => {
    api([project("api-gateway", 0), project("cli", 0)], () => ({ ok: false, status: 500, data: null, errors: {} }));
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Approve api-gateway" }));

    expect(await screen.findByText("api-gateway not approved")).toBeInTheDocument();
    expect(screen.getByText("Nothing changed. Try again in a moment.")).toBeInTheDocument();
    expect(tab("Pending")).toHaveTextContent("2");
    expect(tab("Visible")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: "Approve api-gateway" })).toBeInTheDocument();
    expect(refreshed).toEqual([]);
  });

  it("approves the selected projects in one request", async () => {
    api([project("a-one", 0), project("b-two", 0), project("c-three", 0)]);
    renderView();
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select a-one" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select c-three" }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Approve selected" }));

    expect(await screen.findByText("2 projects approved")).toBeInTheDocument();
    expect(calls).toContain('PATCH /api/me/projects/status {"ids":["a-one","c-three"],"status":1}');
    expect(tab("Pending")).toHaveTextContent("1");
    expect(tab("Visible")).toHaveTextContent("2");
  });

  it("rolls a bulk move back with the API's reason", async () => {
    api([project("a-one", 0), project("b-two", 0)], () => ({
      ok: false, status: 404, data: null, errors: {}, body: { error: "Some of these projects no longer exist. Reload and try again." },
    }));
    renderView();
    await userEvent.click(await screen.findByRole("checkbox", { name: /Select all 2/ }));
    await userEvent.click(screen.getByRole("button", { name: "Hide selected" }));

    expect(await screen.findByText("2 projects not hidden")).toBeInTheDocument();
    expect(screen.getByText(/no longer exist/)).toBeInTheDocument();
    expect(tab("Pending")).toHaveTextContent("2");
    expect(tab("Hidden")).toHaveTextContent("0");
  });

  it("undoes a move from the toast", async () => {
    api([project("blog", 1)]);
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Hide blog" }));
    const toast = (await screen.findByText("blog hidden")).closest("li")!;

    await userEvent.click(within(toast).getByRole("button", { name: "Undo" }));

    await waitFor(() => expect(calls).toContain('PATCH /api/me/projects/blog/status {"status":1}'));
    expect(tab("Visible")).toHaveTextContent("1");
    expect(tab("Hidden")).toHaveTextContent("0");
  });

  it("searches and sorts the tab", async () => {
    api([
      project("zeta", 1, { stars: 1, description: "Payment service" }),
      project("alpha", 1, { stars: 9 }),
      project("mid", 1, { stars: 5, description: "payments UI" }),
    ]);
    renderView();
    await screen.findByRole("button", { name: "Hide zeta" });
    const names = () => screen.getAllByRole("button", { name: /^Hide / }).map((b) => b.getAttribute("aria-label"));

    await userEvent.selectOptions(screen.getByRole("combobox"), "stars");
    expect(names()).toEqual(["Hide alpha", "Hide mid", "Hide zeta"]);

    await userEvent.type(screen.getByRole("searchbox", { name: "Search projects" }), "payment");
    await waitFor(() => expect(names()).toEqual(["Hide mid", "Hide zeta"]));
  });

  it("shows the details of a project in the side panel", async () => {
    api([project("api-gateway", 1, {
      description: "Routes requests to services.", stars: 3, languagesJson: '{"C#":80,"Shell":20}',
      skills: [{ skillId: "s1", name: "ASP.NET Core", status: 1 }, { skillId: "s2", name: "Docker", status: 0 }, { skillId: "s3", name: "Go", status: 2 }],
    })]);
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "api-gateway" }));

    const panel = await screen.findByRole("dialog", { name: "api-gateway" });
    expect(within(panel).getByText("Routes requests to services.")).toBeInTheDocument();
    expect(within(panel).getByText("C# 80%")).toBeInTheDocument();
    expect(within(panel).getByText("ASP.NET Core")).toBeInTheDocument();
    expect(within(panel).getByText("(suggested)")).toBeInTheDocument();
    expect(within(panel).queryByText("Go")).not.toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Manage skills" })).toHaveAttribute("href", "/dashboard/skills");
    expect(within(panel).getByRole("link", { name: /Open on GitHub/ })).toHaveAttribute("href", "https://github.com/ana/api-gateway");
  });
});
