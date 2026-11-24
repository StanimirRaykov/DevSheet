import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MeSummary } from "@/lib/api";
import type { SendResult } from "@/lib/client";
import { CvView } from "./cv-view";

let answer: SendResult<unknown>;
vi.mock("@/lib/client", () => ({ send: async () => answer }));

const summary: MeSummary = {
  isPublished: true, slug: "ana", hasHeadline: true, hasSummary: true, experience: 2, education: 0, languages: 1,
  certifications: 0, projects: { pending: 0, visible: 4, hidden: 0 }, confirmedSkills: 7, suggestedSkills: 0, github: null,
};

beforeEach(() => {
  answer = { ok: true, status: 200, data: summary, errors: {} };
});

describe("CvView", () => {
  it("previews and downloads the chosen template", async () => {
    render(<CvView />);
    expect(screen.getByRole("radio", { name: /Modern/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTitle("Modern CV preview")).toHaveAttribute("src", expect.stringMatching(/template=modern&inline=true$/));

    await userEvent.click(screen.getByRole("radio", { name: /Europass-style/ }));

    expect(screen.getByTitle("Europass-style CV preview")).toHaveAttribute("src", expect.stringMatching(/template=europass&inline=true$/));
    expect(screen.getByRole("link", { name: "Download Europass-style CV" })).toHaveAttribute("href", expect.stringMatching(/template=europass$/));
    expect(screen.getByRole("link", { name: "Open preview" })).toHaveAttribute("target", "_blank");
    expect(screen.getByLabelText("Loading the preview")).toBeInTheDocument();
  });

  it("exports the official Europass file and says where to import it", () => {
    render(<CvView />);
    expect(screen.getByRole("link", { name: "Export for Europass" })).toHaveAttribute("href", expect.stringMatching(/\/api\/me\/cv\.xml$/));
    expect(screen.getByRole("link", { name: /Europass CV editor/ })).toHaveAttribute("href", "https://europa.eu/europass/eportfolio/screen/cv-editor");
  });

  it("lists what is included and links the empty parts to where they are fixed", async () => {
    render(<CvView />);

    expect(await screen.findByText("One part is empty and left out of the CV.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "No education yet" })).toHaveAttribute("href", "/dashboard/profile?tab=education");
    expect(screen.getByRole("link", { name: "No certifications (optional)" })).toBeInTheDocument();
    expect(screen.getByText("Projects").parentElement).toHaveTextContent("Projects4");
  });

  it("keeps the preview working when the list cannot be loaded", async () => {
    answer = { ok: false, status: 500, data: null, errors: {} };
    render(<CvView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("The preview and download still work.");
    expect(screen.getByTitle("Modern CV preview")).toBeInTheDocument();
  });
});
