import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeProvider } from "@/components/me-provider";
import { ToastProvider } from "@/components/ui";
import type { Me } from "@/lib/api";
import type { SendResult } from "@/lib/client";
import { GithubConnection, SignInMethods, type Login } from "./sign-in-tab";

let refreshed = 0;
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => { refreshed++; } }) }));

// A plain function, not vi.fn: each test sets what the API answers.
let answer: (path: string, method: string) => SendResult<unknown> = () => ({ ok: true, status: 204, data: null, errors: {} });
const calls: string[] = [];
vi.mock("@/lib/client", () => ({
  send: async (path: string, method = "GET") => {
    calls.push(`${method} ${path}`);
    return answer(path, method);
  },
}));

const github: Login = { provider: "github", email: "ana@example.com", createdAt: "2026-01-01T00:00:00Z" };
const google: Login = { provider: "google", email: "ana@gmail.example", createdAt: "2026-02-01T00:00:00Z" };

const me = (connected: boolean): Me => ({
  id: "u1", displayName: "Ana", avatarUrl: null, slug: "ana", isPublished: false,
  github: connected ? { login: "ana-dev", lastSyncedAt: null } : null,
});

function renderMethods(logins: Login[], enabled = ["github", "google"] as ("github" | "google")[], onChange = () => {}) {
  return render(<ToastProvider><SignInMethods logins={logins} enabled={enabled} onChange={onChange} /></ToastProvider>);
}

function renderGithub(connected: boolean) {
  return render(<MeProvider me={me(connected)}><ToastProvider><GithubConnection /></ToastProvider></MeProvider>);
}

const row = (name: string) => screen.getByText(name, { selector: "span.font-medium" }).closest("li")!;

beforeEach(() => {
  calls.length = 0;
  refreshed = 0;
});

describe("SignInMethods", () => {
  it("lists added methods with Remove and set-up ones with Add, which links back to this tab", () => {
    renderMethods([github]);

    expect(within(row("GitHub")).getByText(/ana@example.com/)).toBeVisible();
    const add = within(row("Google")).getByRole("link", { name: "Add Google" });
    expect(add).toHaveAttribute("href", expect.stringContaining("/auth/link/google?next=%2Fsettings%3Ftab%3Dsign-in"));
  });

  it("does not let the last sign-in method be removed", () => {
    renderMethods([github]);
    expect(within(row("GitHub")).getByRole("button", { name: "Remove" })).toBeDisabled();
    expect(screen.getByText(/only sign-in method/)).toBeVisible();
  });

  it("removes a method when there is another one, then reloads", async () => {
    let changed = false;
    renderMethods([github, google], ["github", "google"], () => (changed = true));

    await userEvent.click(within(row("Google")).getByRole("button", { name: "Remove" }));

    expect(calls).toEqual(["DELETE /api/me/logins/google"]);
    expect(await screen.findByText("Google sign-in removed")).toBeVisible();
    expect(changed).toBe(true);
  });

  it("hides a provider that is neither added nor set up on the server", () => {
    renderMethods([github], ["github"]);
    expect(screen.queryByText("Google")).toBeNull();
  });
});

describe("GithubConnection", () => {
  it("offers Connect GitHub when nothing is connected", () => {
    renderGithub(false);
    expect(screen.getByRole("link", { name: "Connect GitHub" }))
      .toHaveAttribute("href", expect.stringContaining("/auth/github/connect?next=%2Fsettings%3Ftab%3Dsign-in"));
  });

  it("syncs and reports what came in", async () => {
    answer = () => ({ ok: true, status: 200, data: { added: 2 }, errors: {} });
    renderGithub(true);
    expect(screen.getByText("Not synced yet")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Sync now" }));

    expect(calls).toEqual(["POST /api/me/sync"]);
    expect(await screen.findByText("2 new repositories waiting for review.")).toBeVisible();
    expect(refreshed).toBe(1);
  });

  it("disconnects only after confirming", async () => {
    answer = () => ({ ok: true, status: 204, data: null, errors: {} });
    renderGithub(true);

    await userEvent.click(screen.getByRole("button", { name: "Disconnect GitHub" }));
    const dialog = screen.getByRole("dialog", { name: "Disconnect GitHub?" });
    expect(calls).toEqual([]);

    await userEvent.click(within(dialog).getByRole("button", { name: "Disconnect GitHub" }));

    expect(calls).toEqual(["POST /api/me/github/disconnect"]);
    expect(await screen.findByText("GitHub disconnected")).toBeVisible();
  });
});
