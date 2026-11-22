import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import type { SendResult } from "@/lib/client";
import { AccountForm, type Account } from "./account-tab";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

// A plain function, not vi.fn: each test sets what the API answers.
let answer: (path: string, method: string, body: unknown) => SendResult<unknown>;
const calls: { path: string; method: string; body: unknown }[] = [];
vi.mock("@/lib/client", () => ({
  send: async (path: string, method = "GET", body?: unknown) => {
    calls.push({ path, method, body });
    return answer(path, method, body);
  },
}));

const saved = { displayName: "Ana Petrova", email: "ana@example.com", avatarUrl: null };

function renderForm(onSaved: (account: Account) => void = () => {}) {
  return render(
    <ToastProvider>
      <AccountForm saved={saved} onSaved={onSaved} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  calls.length = 0;
});

describe("AccountForm", () => {
  it("enables Save only after a change", async () => {
    renderForm();
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Display name"), "-Ivanova");
    expect(save).toBeEnabled();
  });

  it("saves and confirms with a toast", async () => {
    answer = (_p, _m, body) => ({ ok: true, status: 200, data: { ...saved, ...(body as object) }, errors: {} });
    let result: Account | undefined;
    renderForm((a) => (result = a));

    await userEvent.clear(screen.getByLabelText("Contact email"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(calls).toEqual([{ path: "/api/me/account", method: "PATCH", body: { displayName: "Ana Petrova", email: "" } }]);
    expect(await screen.findByText("Account saved")).toBeVisible();
    expect(result).toMatchObject({ email: "" });
  });

  it("shows the API's field errors next to the fields", async () => {
    answer = () => ({ ok: false, status: 400, data: null, errors: { email: ["Must be a valid email address."] } });
    renderForm();

    await userEvent.type(screen.getByLabelText("Contact email"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Must be a valid email address.")).toBeVisible();
    expect(screen.getByLabelText("Contact email")).toHaveAttribute("aria-invalid", "true");
  });
});
