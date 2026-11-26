import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import { PasswordSection, type PasswordStatus } from "./password-section";

const posted: { url: string; body: unknown }[] = [];
let reply: () => Response = () => new Response(null, { status: 204 });

beforeEach(() => {
  posted.length = 0;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    posted.push({ url, body: JSON.parse(String(init.body)) });
    return reply();
  });
});
afterEach(() => vi.unstubAllGlobals());

const withPassword: PasswordStatus = { hasPassword: true, email: "maria@example.test", emailConfirmed: true, changedAt: "2026-11-01T00:00:00Z" };
const googleOnly: PasswordStatus = { hasPassword: false, email: "ana@example.test", emailConfirmed: false, changedAt: null };

function renderSection(status: PasswordStatus, onChange = () => {}) {
  return render(<ToastProvider><PasswordSection status={status} onChange={onChange} /></ToastProvider>);
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

describe("PasswordSection", () => {
  it("changes the password with the current one, then reloads", async () => {
    let changed = false;
    renderSection(withPassword, () => (changed = true));
    expect(screen.getByText("maria@example.test")).toBeVisible();

    await userEvent.type(screen.getByLabelText("Current password"), "correct horse battery");
    await userEvent.type(screen.getByLabelText("New password"), "a brand new passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(posted).toEqual([{
      url: expect.stringContaining("/api/me/password"),
      body: { currentPassword: "correct horse battery", newPassword: "a brand new passphrase" },
    }]);
    expect(await screen.findByText("Password changed")).toBeVisible();
    expect(changed).toBe(true);
    expect(screen.getByLabelText("Current password")).toHaveValue("");
  });

  it("puts a wrong current password under its field", async () => {
    reply = () => json(400, { errors: { currentPassword: ["That is not your current password."] } });
    renderSection(withPassword);

    await userEvent.type(screen.getByLabelText("Current password"), "not it at all");
    await userEvent.type(screen.getByLabelText("New password"), "a brand new passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText("That is not your current password.")).toBeVisible();
    expect(screen.getByLabelText("Current password")).toHaveAttribute("aria-invalid", "true");
  });

  it("says how long to wait after too many attempts", async () => {
    reply = () => json(429, { error: "too_many_attempts" }, { "Retry-After": "120" });
    renderSection(withPassword);

    await userEvent.type(screen.getByLabelText("Current password"), "x");
    await userEvent.type(screen.getByLabelText("New password"), "a brand new passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Try again in 2 minutes.");
  });

  it("adds a password to a Google account with the account email filled in", async () => {
    reply = () => new Response(null, { status: 202 });
    let changed = false;
    renderSection(googleOnly, () => (changed = true));
    expect(screen.queryByLabelText("Current password")).toBeNull();
    expect(screen.getByLabelText("Email")).toHaveValue("ana@example.test");

    await userEvent.type(screen.getByLabelText("New password"), "a brand new passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Add password" }));

    expect(posted[0].body).toEqual({ newPassword: "a brand new passphrase", email: "ana@example.test" });
    expect(await screen.findByText("Confirm link sent")).toBeVisible();
    expect(changed).toBe(true);
  });

  it("explains that an unconfirmed password does not sign in yet", () => {
    renderSection({ ...withPassword, emailConfirmed: false });
    expect(screen.getByText(/does not sign you in/)).toBeVisible();
  });

  it("tells when the email could not be sent", async () => {
    reply = () => json(503, { error: "email_unavailable" });
    renderSection(googleOnly);

    await userEvent.type(screen.getByLabelText("New password"), "a brand new passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Add password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't send the email");
  });
});
