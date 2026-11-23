import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import type { SendResult } from "@/lib/client";
import { AddressForm, Visibility, type PublicPage, type SlugCheck } from "./public-page-tab";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

const refreshed: string[][] = [];
vi.mock("../actions", () => ({ refreshPublicPages: async (slugs: string[]) => { refreshed.push(slugs); } }));

// A plain function, not vi.fn: each test sets what the API answers.
let answer: (path: string, method: string, body: unknown) => SendResult<unknown>;
const calls: string[] = [];
vi.mock("@/lib/client", () => ({
  send: async (path: string, method = "GET", body?: unknown) => {
    calls.push(`${method} ${path}`);
    return answer(path, method, body);
  },
}));

/** The live check as the API answers it: "taken-one" is taken, "settings" reserved, anything else free. */
function check(slug: string): SlugCheck {
  if (slug === "taken-one") return { slug, status: "Taken", message: "Someone already uses that address.", available: false };
  if (slug === "settings") return { slug, status: "Reserved", message: "That address is used by DevSheet itself. Choose another.", available: false };
  return { slug, status: "Available", message: null, available: true };
}
const ok = <T,>(data: T): SendResult<T> => ({ ok: true, status: 200, data, errors: {} });

beforeEach(() => {
  calls.length = 0;
  refreshed.length = 0;
  answer = (path) => ok(check(decodeURIComponent(path.split("slug=")[1] ?? "")));
});

function renderAddress(onMoved: (slug: string) => void = () => {}) {
  render(<ToastProvider><AddressForm current="ana-petrova" published onMoved={onMoved} /></ToastProvider>);
  return screen.getByLabelText("Page address");
}

describe("AddressForm", () => {
  it("starts on the current address with nothing to save", () => {
    renderAddress();
    expect(screen.getByText("This is your current address.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Change address" })).toBeDisabled();
  });

  it("checks the address after typing pauses and explains a refusal", async () => {
    const input = renderAddress();
    await userEvent.clear(input);
    await userEvent.type(input, "taken-one");

    expect(await screen.findByText("Someone already uses that address.")).toBeVisible();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Change address" })).toBeDisabled();
    // Typing does not call the API on every key.
    expect(calls.filter((c) => c.includes("slug-available")).length).toBeLessThan("taken-one".length);
  });

  it("moves the page to a free address and refreshes both cached pages", async () => {
    let moved = "";
    const input = renderAddress((slug) => (moved = slug));
    await userEvent.clear(input);
    await userEvent.type(input, "Ana-Dev");
    expect(await screen.findByText("Available")).toBeVisible();

    answer = (path, method) => (method === "PATCH" ? ok(check("ana-dev")) : ok(check("ana-dev")));
    await userEvent.click(screen.getByRole("button", { name: "Change address" }));

    expect(calls).toContain("PATCH /api/me/slug");
    expect(await screen.findByText("Address changed")).toBeVisible();
    expect(moved).toBe("ana-dev");
    expect(refreshed).toEqual([["ana-petrova", "ana-dev"]]);
  });

  it("shows the API's reason when someone takes the address first", async () => {
    const input = renderAddress();
    await userEvent.clear(input);
    await userEvent.type(input, "fresh-one");
    await screen.findByText("Available");

    answer = (path, method) =>
      method === "PATCH"
        ? { ok: false, status: 409, data: null, errors: {}, body: check("taken-one") }
        : ok(check("fresh-one"));
    await userEvent.click(screen.getByRole("button", { name: "Change address" }));

    expect(await screen.findByText("Someone already uses that address.")).toBeVisible();
  });
});

describe("Visibility", () => {
  const page: PublicPage = { slug: "ana-petrova", isPublished: false, showEmail: false, showLocation: false, allowCvDownload: false };

  it("publishes at once with a toast and refreshes the cached page", async () => {
    answer = (_p, _m, body) => ok({ ...page, ...(body as object) });
    let latest = page;
    render(<ToastProvider><Visibility page={page} onChange={(p) => (latest = p)} /></ToastProvider>);

    await userEvent.click(screen.getByRole("switch", { name: "Published" }));

    expect(await screen.findByText("Page published")).toBeVisible();
    expect(latest.isPublished).toBe(true);
    expect(refreshed).toEqual([["ana-petrova"]]);
  });

  it("turns the public CV download on, which is off at first", async () => {
    answer = (_p, _m, body) => ok({ ...page, ...(body as object) });
    let latest = page;
    render(<ToastProvider><Visibility page={page} onChange={(p) => (latest = p)} /></ToastProvider>);
    const cv = screen.getByRole("switch", { name: "CV download" });
    expect(cv).not.toBeChecked();

    await userEvent.click(cv);

    expect(calls).toContain("PATCH /api/me/public-page");
    expect(await screen.findByText("CV download turned on")).toBeVisible();
    expect(latest.allowCvDownload).toBe(true);
  });

  it("says the email shown is the profile email, not the sign-in one", () => {
    render(<ToastProvider><Visibility page={page} onChange={() => {}} /></ToastProvider>);
    expect(screen.getByRole("switch", { name: "Show email" })).toHaveAccessibleDescription(/not your sign-in email/);
  });
});
