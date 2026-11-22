import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeProvider } from "@/components/me-provider";
import { ToastProvider } from "@/components/ui";
import type { DashboardProject } from "@/lib/api";
import type { SendResult } from "@/lib/client";
import type { OnboardingView } from "./steps";
import { WelcomeFlow } from "./welcome-flow";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));
// Reduced motion: steps fade instead of sliding. jsdom does not run the fade, so a new step is checked with toBeInTheDocument.
vi.mock("@/components/motion-provider", async () => {
  const { motionPresets } = await import("@/components/motion");
  return { useMotionPresets: () => motionPresets(true) };
});

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
const noContent: SendResult<unknown> = { ok: true, status: 204, data: null, errors: {} };
const me = { id: "u1", displayName: "Ana", avatarUrl: null, slug: "ana-petrova", isPublished: false, github: null };
const view = (over: Partial<OnboardingView> = {}): OnboardingView => ({
  step: "About", completedAt: null, displayName: "Ana", headline: "", githubLogin: null, lastSyncedAt: null, ...over,
});
const project = (id: string, title: string): DashboardProject => ({
  id, title, status: 0, description: null, url: `https://github.com/ana/${id}`, stars: 0, languagesJson: '{"C#":100}', sourceMissing: false, skills: [],
});

/** The API for one test: the onboarding view, plus what sync and the project list answer. */
function api(start: OnboardingView, extra: (path: string, method: string, body: unknown) => SendResult<unknown> | undefined = () => undefined) {
  answer = (path, method, body) => {
    const custom = extra(path, method, body);
    if (custom) return custom;
    if (path === "/api/me/onboarding") return ok(start);
    if (path === "/api/me/onboarding/about") return ok({ ...start, ...(body as object), step: "Github" });
    return noContent;
  };
}

function renderFlow(leave: (path: string) => void = () => {}) {
  render(<MeProvider me={me}><ToastProvider><WelcomeFlow error={null} leave={leave} /></ToastProvider></MeProvider>);
}
const heading = (name: string) => screen.findByRole("heading", { level: 2, name });
const saved = () => calls.filter((c) => c.startsWith("PUT /api/me/onboarding/step") || c.startsWith("POST /api/me/onboarding/complete"));

beforeEach(() => {
  calls.length = 0;
});

describe("WelcomeFlow", () => {
  it("resumes at the step saved last time", async () => {
    api(view({ step: "Review", githubLogin: "ana-gh" }), (path) => (path === "/api/me/projects" ? ok([]) : undefined));
    renderFlow();
    expect(await heading("Review projects")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Review projects");
  });

  it("saves name and headline, then asks to connect GitHub", async () => {
    api(view());
    renderFlow();
    const headline = await screen.findByLabelText("Headline");
    await userEvent.type(headline, "Backend developer");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(calls).toContain('PUT /api/me/onboarding/about {"displayName":"Ana","headline":"Backend developer"}');
    expect(await heading("Connect GitHub")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect GitHub" })).toHaveAttribute("href", expect.stringContaining("/auth/github/connect?next=%2Fwelcome"));
  });

  it("shows the API's reason when the name is missing", async () => {
    api(view(), (path) => (path === "/api/me/onboarding/about" ? { ok: false, status: 400, data: null, errors: { displayName: ["Enter the name people should see."] } } : undefined));
    renderFlow();
    await userEvent.clear(await screen.findByLabelText("Name"));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Enter the name people should see.")).toBeVisible();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("About you");
  });

  it("skips the connect step when GitHub is already connected and starts the sync", async () => {
    api(view({ step: "Github", githubLogin: "ana-gh" }), (path) =>
      path === "/api/me/sync" ? ok({ added: 2 }) : path === "/api/me/projects" ? ok([project("a", "api"), project("b", "web")]) : undefined);
    renderFlow();
    expect(await heading("First sync")).toBeInTheDocument();
    expect(await screen.findByText("2 repositories found.")).toBeVisible();
    expect(screen.queryByText("Connect GitHub")).toBeNull(); // not in the progress either
    expect(saved()).toContain('PUT /api/me/onboarding/step {"step":"Sync"}');
  });

  it("goes straight to the end when GitHub is skipped, and that finishes the flow", async () => {
    api(view({ step: "Github" }));
    renderFlow();
    await userEvent.click(await screen.findByRole("button", { name: "Skip for now" }));
    expect(await heading("You're set up")).toBeInTheDocument();
    expect(saved()).toEqual(['PUT /api/me/onboarding/step {"step":"Done"}', "POST /api/me/onboarding/complete"]);
  });

  it("offers a retry when the sync fails, without blocking the rest", async () => {
    let attempts = 0;
    api(view({ step: "Sync", githubLogin: "ana-gh" }), (path) => {
      if (path === "/api/me/sync") return ++attempts === 1 ? { ok: false, status: 502, data: null, errors: {} } : ok({ added: 1 });
      if (path === "/api/me/projects") return ok([project("a", "api")]);
    });
    renderFlow();
    expect(await screen.findByText(/did not finish/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue without syncing" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1 repository found.")).toBeVisible();
  });

  it("approves only the selected repositories", async () => {
    api(view({ step: "Review", githubLogin: "ana-gh" }), (path) =>
      path === "/api/me/projects" ? ok([project("a", "api"), project("b", "web")]) : undefined);
    renderFlow();
    const list = await screen.findByRole("group", { name: "Repositories to approve" });
    await userEvent.click(within(list).getByRole("checkbox", { name: /web/ }));
    await userEvent.click(screen.getByRole("button", { name: "Approve 1 and continue" }));

    expect(calls).toContain('PATCH /api/me/projects/b/status {"status":1}');
    expect(calls).not.toContain('PATCH /api/me/projects/a/status {"status":1}');
    expect(await heading("You're set up")).toBeInTheDocument();
  });

  it("says nothing is public yet on the review step", async () => {
    api(view({ step: "Review", githubLogin: "ana-gh" }), (path) => (path === "/api/me/projects" ? ok([]) : undefined));
    renderFlow();
    expect(await screen.findByText(/Nothing is public until you publish your page/)).toBeVisible();
    // The list loads after the step's text, so wait for it.
    expect(await screen.findByText("Nothing waiting for review")).toBeVisible();
  });

  it("can be skipped from any step", async () => {
    api(view());
    let left = "";
    renderFlow((path) => (left = path));
    await userEvent.click(await screen.findByRole("button", { name: "Skip setup" }));
    expect(calls).toContain("POST /api/me/onboarding/complete");
    expect(left).toBe("/dashboard");
  });
});
