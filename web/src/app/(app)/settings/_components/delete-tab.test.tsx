import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeProvider } from "@/components/me-provider";
import { ToastProvider } from "@/components/ui";
import type { SendResult } from "@/lib/client";
import { DeleteTab } from "./delete-tab";

const refreshed: string[][] = [];
vi.mock("../actions", () => ({ refreshPublicPages: async (slugs: string[]) => { refreshed.push(slugs); } }));

// A plain function, not vi.fn: each test sets what the API answers.
let answer: () => SendResult<unknown>;
const calls: string[] = [];
vi.mock("@/lib/client", () => ({
  send: async (path: string, method = "GET") => {
    calls.push(`${method} ${path}`);
    return answer();
  },
}));

const me = { id: "u1", displayName: "Ana", avatarUrl: null, slug: "ana-petrova", isPublished: true, github: null };

function renderTab(onDeleted = () => {}) {
  render(<MeProvider me={me}><ToastProvider><DeleteTab onDeleted={onDeleted} /></ToastProvider></MeProvider>);
}

async function openDialog() {
  await userEvent.click(screen.getByRole("button", { name: "Delete account…" }));
  return screen.getByRole("dialog", { name: "Delete your DevSheet?" });
}

beforeEach(() => {
  calls.length = 0;
  refreshed.length = 0;
});

describe("DeleteTab", () => {
  it("enables Delete only once the address is typed exactly", async () => {
    renderTab();
    const dialog = await openDialog();
    const confirm = within(dialog).getByRole("button", { name: "Delete my account" });
    const input = within(dialog).getByLabelText("Type ana-petrova to confirm");

    expect(confirm).toBeDisabled();
    await userEvent.type(input, "ana-petrov");
    expect(confirm).toBeDisabled();
    await userEvent.type(input, "a");
    expect(confirm).toBeEnabled();
  });

  it("deletes, clears the cached public page and leaves", async () => {
    answer = () => ({ ok: true, status: 204, data: null, errors: {} });
    let left = false;
    renderTab(() => (left = true));
    const dialog = await openDialog();

    await userEvent.type(within(dialog).getByLabelText("Type ana-petrova to confirm"), "ana-petrova");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete my account" }));

    expect(calls).toEqual(["DELETE /api/me"]);
    expect(refreshed).toEqual([["ana-petrova"]]);
    expect(left).toBe(true);
  });

  it("stays and says so when the delete fails", async () => {
    answer = () => ({ ok: false, status: 500, data: null, errors: {} });
    let left = false;
    renderTab(() => (left = true));
    const dialog = await openDialog();

    await userEvent.type(within(dialog).getByLabelText("Type ana-petrova to confirm"), "ana-petrova");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete my account" }));

    expect(await screen.findByText("Your account was not deleted")).toBeVisible();
    expect(left).toBe(false);
  });

  it("starts empty again after the dialog is closed", async () => {
    renderTab();
    let dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText("Type ana-petrova to confirm"), "ana-petrova");
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep my account" }));

    dialog = await openDialog();
    expect(within(dialog).getByLabelText("Type ana-petrova to confirm")).toHaveValue("");
  });
});
