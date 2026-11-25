import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MeProvider } from "@/components/me-provider";
import { ToastProvider } from "@/components/ui";
import type { ExperienceItem, LanguageItem, Me, ProfileData } from "@/lib/api";
import type { SendResult } from "@/lib/client";
import { ProfileView } from "./profile-view";
import type { ProfileTab } from "./profile-tab-names";

const refreshed: string[][] = [];
vi.mock("../../../settings/actions", () => ({ refreshPublicPages: async (slugs: string[]) => { refreshed.push(slugs); } }));

// A plain function, not vi.fn: each test sets what the API answers to changes.
let change: (path: string, method: string, body: unknown) => SendResult<unknown> | Promise<SendResult<unknown>>;
const calls: string[] = [];
let experience: ExperienceItem[] = [];
let languages: LanguageItem[] = [];

const ok = <T,>(data: T): SendResult<T> => ({ ok: true, status: 200, data, errors: {}, body: data });
const bad = (body: unknown): SendResult<unknown> => ({ ok: false, status: 400, data: null, errors: {}, body });

const profile: ProfileData = {
  fullName: "Ana Petrova", headline: "Backend developer", summary: "", location: "Sofia", email: "ana@example.com",
  website: "", showEmailPublicly: false, showLocationPublicly: true, phone: "", showPhonePublicly: false, countryCode: "",
};

vi.mock("@/lib/client", () => ({
  send: async (path: string, method = "GET", body?: unknown) => {
    if (method === "GET") {
      const lists: Record<string, unknown> = {
        "/api/me/profile": profile, "/api/me/experience": experience, "/api/me/education": [],
        "/api/me/languages": languages, "/api/me/certifications": [],
      };
      return ok(lists[path]);
    }
    calls.push(`${method} ${path}${body === undefined ? "" : " " + JSON.stringify(body)}`);
    return change(path, method, body);
  },
}));

const me: Me = { id: "u1", displayName: "Ana", avatarUrl: null, slug: "ana-petrova", isPublished: true, github: null };
const job: ExperienceItem = { id: "j1", company: "Acme", title: "Developer", startDate: "2021-04-01", endDate: null, description: "APIs" };

const renderView = (tab: ProfileTab = "experience") =>
  render(<MeProvider me={me}><ToastProvider><ProfileView initialTab={tab} /></ToastProvider></MeProvider>);
const dialog = () => screen.getByRole("dialog");
const pick = (name: string, value: string) => userEvent.selectOptions(within(dialog()).getByRole("combobox", { name }), value);

beforeEach(() => {
  calls.length = 0;
  refreshed.length = 0;
  experience = [];
  languages = [];
  change = () => ok(null);
});

describe("ProfileView", () => {
  it("checks the form before sending and shows each error under its field", async () => {
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Add experience" }));
    await userEvent.type(within(dialog()).getByRole("textbox", { name: "Job title" }), "Developer");
    await pick("Start, month", "05");
    await pick("Start, year", "2024");
    await pick("End, month", "03");
    await pick("End, year", "2024");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Add experience" }));

    expect(within(dialog()).getByRole("textbox", { name: "Company" })).toHaveAccessibleDescription("This field is required.");
    expect(within(dialog()).getByRole("group", { name: "End" })).toHaveAccessibleDescription("End date cannot be before the start date.");
    expect(within(dialog()).getByRole("textbox", { name: "Job title" })).not.toHaveAttribute("aria-invalid");
    expect(calls).toEqual([]);
  });

  it("puts the API's 400 errors under the matching fields, and the rest above the form", async () => {
    change = () => bad({ errors: { company: ["Must be at most 200 characters."], "$": ["The request could not be read."] } });
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Add experience" }));
    await userEvent.type(within(dialog()).getByRole("textbox", { name: "Job title" }), "Developer");
    await userEvent.type(within(dialog()).getByRole("textbox", { name: "Company" }), "Acme");
    await pick("Start, month", "04");
    await pick("Start, year", "2021");
    await userEvent.click(within(dialog()).getByRole("checkbox", { name: "I currently work here" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Add experience" }));

    expect(calls).toEqual(['POST /api/me/experience {"title":"Developer","company":"Acme","description":"","startDate":"2021-04-01","endDate":null}']);
    expect(await within(dialog()).findByRole("alert")).toHaveTextContent("This value could not be read.");
    expect(within(dialog()).getByRole("textbox", { name: "Company" })).toHaveAccessibleDescription("Must be at most 200 characters.");
  });

  it("disables Save while saving, then adds the entry and closes", async () => {
    let finish: (r: SendResult<unknown>) => void = () => {};
    change = () => new Promise((resolve) => { finish = resolve; });
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Add experience" }));
    await userEvent.type(within(dialog()).getByRole("textbox", { name: "Job title" }), "Developer");
    await userEvent.type(within(dialog()).getByRole("textbox", { name: "Company" }), "Acme");
    await pick("Start, month", "04");
    await pick("Start, year", "2021");
    await userEvent.click(within(dialog()).getByRole("checkbox", { name: "I currently work here" }));
    const save = within(dialog()).getByRole("button", { name: "Add experience" });
    await userEvent.click(save);

    expect(save).toBeDisabled();
    await userEvent.click(save);
    expect(calls).toHaveLength(1);

    finish(ok(job));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^Edit Developer\b.*Acme/ })).toHaveTextContent("Apr 2021 – Present");
    expect(refreshed).toEqual([["ana-petrova"]]);
  });

  it("edits an entry in place", async () => {
    experience = [job];
    change = (_p, _m, body) => ok({ ...job, ...(body as object) });
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: /^Edit Developer\b.*Acme/ }));
    const title = within(dialog()).getByRole("textbox", { name: "Job title" });
    await userEvent.clear(title);
    await userEvent.type(title, "Senior developer");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Save changes" }));

    expect(calls[0]).toBe('PUT /api/me/experience/j1 {"title":"Senior developer","company":"Acme","description":"APIs","startDate":"2021-04-01","endDate":null}');
    expect(await screen.findByRole("button", { name: /^Edit Senior developer\b.*Acme/ })).toBeInTheDocument();
  });

  it("asks before deleting, then offers Undo that creates the entry again", async () => {
    experience = [job];
    change = (_p, method) => (method === "POST" ? ok({ ...job, id: "j2" }) : { ok: true, status: 204, data: null, errors: {} });
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: "Delete Developer at Acme" }));
    expect(dialog()).toHaveTextContent("Developer at Acme is removed from your CV and your public page.");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Delete" }));

    expect(calls).toEqual(["DELETE /api/me/experience/j1"]);
    const toast = (await screen.findByText("Experience deleted")).closest("li")!;
    expect(screen.queryByRole("button", { name: /^Edit Developer\b.*Acme/ })).not.toBeInTheDocument();

    await userEvent.click(within(toast).getByRole("button", { name: "Undo" }));
    expect(calls[1]).toBe('POST /api/me/experience {"company":"Acme","title":"Developer","startDate":"2021-04-01","endDate":null,"description":"APIs"}');
    expect(await screen.findByRole("button", { name: /^Edit Developer\b.*Acme/ })).toBeInTheDocument();
  });

  it("sends no levels for a mother tongue, and one level for all five skills otherwise", async () => {
    change = (_p, _m, body) => ok({ id: "l1", ...(body as object) });
    renderView("languages");
    await userEvent.click(await screen.findByRole("button", { name: "Add language" }));
    await userEvent.type(within(dialog()).getByRole("textbox", { name: "Language" }), "English");
    await userEvent.selectOptions(within(dialog()).getByRole("combobox", { name: "Overall level" }), "4");
    expect(within(dialog()).getByRole("combobox", { name: "Overall level" })).toHaveAccessibleDescription(/without strain/);
    await userEvent.click(within(dialog()).getByRole("button", { name: "Add language" }));

    expect(calls[0]).toBe('POST /api/me/languages {"name":"English","isoCode":null,"isMotherTongue":false,"listening":4,"reading":4,"spokenInteraction":4,"spokenProduction":4,"writing":4}');
    expect(await screen.findByText("B2, upper intermediate")).toBeInTheDocument();
  });

  it("counts the summary's characters and keeps a draft across tabs", async () => {
    renderView("about");
    const summary = await screen.findByRole("textbox", { name: "Summary" });
    await userEvent.type(summary, "I build APIs.");
    expect(summary).toHaveAccessibleDescription(/13 of 2000 characters/);

    await userEvent.click(screen.getByRole("tab", { name: /Experience/ }));
    await userEvent.click(screen.getByRole("tab", { name: "About" }));
    expect(screen.getByRole("textbox", { name: "Summary" })).toHaveValue("I build APIs.");
    expect(window.location.search).toBe("");
  });
});
