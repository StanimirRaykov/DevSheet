import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeProvider } from "@/components/me-provider";
import { ToastProvider } from "@/components/ui";
import type { Me, MeSummary } from "@/lib/api";
import type { SendResult } from "@/lib/client";
import { Overview } from "./overview";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
// Numbers jump straight to their value, so the test can read them.
vi.mock("motion/react", async (original) => ({ ...(await original<object>()), useReducedMotion: () => true }));

const calls: string[] = [];
let summary: MeSummary;
vi.mock("@/lib/client", () => ({
  send: async (path: string, method = "GET"): Promise<SendResult<unknown>> => {
    calls.push(`${method} ${path}`);
    const data = method === "POST" ? { added: 2 } : summary;
    return { ok: true, status: 200, data, errors: {} };
  },
}));

const me: Me = { id: "u1", displayName: "Ana", avatarUrl: null, slug: "ana-petrova", isPublished: false, github: null };
const base: MeSummary = {
  isPublished: false, slug: "ana-petrova", hasHeadline: true, hasSummary: false, experience: 1, education: 0, languages: 1,
  certifications: 0, projects: { pending: 4, visible: 2, hidden: 0 }, confirmedSkills: 3, suggestedSkills: 1,
  github: { login: "ana-dev", lastSyncedAt: null },
};

const renderOverview = () => render(<MeProvider me={me}><ToastProvider><Overview /></ToastProvider></MeProvider>);

beforeEach(() => {
  calls.length = 0;
  summary = base;
});

describe("Overview", () => {
  it("loads with one call and links every missing item to the page that fixes it", async () => {
    renderOverview();

    // headline 10 + experience 15 + language 10 + skills 15 + GitHub 5
    expect(await screen.findByRole("progressbar", { name: "Profile completeness" })).toHaveAttribute("aria-valuenow", "55");
    expect(screen.getByLabelText("55 percent complete")).toHaveTextContent("55%");
    const todo = screen.getByRole("list", { name: "Still to do" });
    expect(within(todo).getByRole("link", { name: /Write a short summary/ })).toHaveAttribute("href", "/dashboard/profile");
    expect(within(todo).getByRole("link", { name: /Add your education/ })).toHaveAttribute("href", "/dashboard/profile?tab=education");
    expect(within(todo).getByRole("link", { name: /Show 3 projects on your page.*2 of 3/ })).toHaveAttribute("href", "/dashboard/projects");
    expect(within(todo).getByRole("link", { name: /Publish your page/ })).toHaveAttribute("href", "/settings?tab=public-page");
    expect(within(todo).queryByRole("link", { name: /headline/ })).not.toBeInTheDocument();
    expect(calls).toEqual(["GET /api/me/summary"]);
  });

  it("shows what waits for a decision, with links to it", async () => {
    renderOverview();

    expect(await screen.findByRole("link", { name: "4 repositories wait for approval" })).toHaveAttribute("href", "/dashboard/projects");
    expect(screen.getByRole("link", { name: "1 suggested skill to confirm or reject" })).toHaveAttribute("href", "/dashboard/skills");
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View public page" })).not.toBeInTheDocument();
  });

  it("says when the page is published and complete", async () => {
    summary = { ...base, isPublished: true, hasSummary: true, education: 1, projects: { pending: 0, visible: 3, hidden: 0 }, suggestedSkills: 0 };
    renderOverview();

    expect(await screen.findByText("Everything a reader looks for is there.")).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View public page" })).toHaveAttribute("href", "/ana-petrova");
    expect(screen.getByText(/Nothing waiting/)).toBeInTheDocument();
  });

  it("syncs GitHub and loads the overview again", async () => {
    renderOverview();
    expect(await screen.findByText("Not synced yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sync now" }));

    expect(await screen.findByText("2 new repositories in Pending")).toBeInTheDocument();
    expect(calls).toEqual(["GET /api/me/summary", "POST /api/me/sync", "GET /api/me/summary"]);
  });

  it("offers to connect GitHub when it is not connected", async () => {
    summary = { ...base, github: null };
    renderOverview();

    expect(await screen.findByRole("link", { name: "Connect GitHub" })).toHaveAttribute("href", expect.stringContaining("/auth/github/connect"));
  });
});
