import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PublicPortfolio } from "@/lib/api";
import { Portfolio } from "./portfolio";

const base: PublicPortfolio = {
  displayName: "ana",
  avatarUrl: null,
  githubLogin: "ana-gh",
  slug: "ana-petrova",
  cvDownload: false,
  profile: { fullName: "Ana Petrova", headline: "Backend developer", summary: "I build APIs.", location: null, email: null, website: null },
  projects: [
    { title: "ledger-api", description: "Bookkeeping API", url: "https://github.com/ana/ledger-api", stars: 14, languagesJson: '{"C#":90,"PLpgSQL":10}', skills: ["C#"] },
    { title: "trail-maps", description: null, url: "https://github.com/ana/trail-maps", stars: 0, languagesJson: '{"TypeScript":1}', skills: ["TypeScript"] },
  ],
  skills: [
    { name: "C#", category: "Languages", projects: ["ledger-api"] },
    { name: "TypeScript", category: "Languages", projects: ["trail-maps"] },
  ],
  experience: [{ company: "Rila Freight", title: "Backend developer", startDate: "2024-03-01", endDate: null, description: "" }],
  education: [],
  languages: [{ name: "English", isMotherTongue: false, listening: 5, reading: 5, spokenInteraction: 5, spokenProduction: 5, writing: 5 }],
  certifications: [],
};

describe("Portfolio", () => {
  it("shows no email or location when the API leaves them out", () => {
    render(<Portfolio data={base} />);
    expect(screen.getByRole("heading", { level: 1, name: "Ana Petrova" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
    expect(screen.getByRole("link", { name: "github.com/ana-gh" })).toHaveAttribute("href", "https://github.com/ana-gh");
  });

  it("shows email, location and website when the owner allows them", () => {
    render(<Portfolio data={{ ...base, profile: { ...base.profile!, email: "ana@example.com", location: "Plovdiv", website: "https://www.ana.dev/" } }} />);
    expect(screen.getByRole("link", { name: "ana@example.com" })).toHaveAttribute("href", "mailto:ana@example.com");
    expect(screen.getByText("Plovdiv")).toBeVisible();
    expect(screen.getByRole("link", { name: "ana.dev" })).toHaveAttribute("href", "https://www.ana.dev/");
  });

  it("offers the CV only when the owner turned the download on", () => {
    const { unmount } = render(<Portfolio data={base} />);
    expect(screen.queryByRole("link", { name: "Download CV" })).toBeNull();
    unmount();

    render(<Portfolio data={{ ...base, cvDownload: true }} />);
    expect(screen.getByRole("link", { name: "Download CV" })).toHaveAttribute("href", expect.stringContaining("/api/public/ana-petrova/cv.pdf"));
  });

  it("names the projects each skill was used in, for screen readers", () => {
    render(<Portfolio data={base} />);
    const skills = screen.getByRole("region", { name: "Skills" });
    expect(within(skills).getByText(/used in ledger-api/)).toBeInTheDocument();
  });

  it("leaves out sections with nothing in them and shows CEFR levels", () => {
    render(<Portfolio data={base} />);
    expect(screen.queryByRole("region", { name: "Education" })).toBeNull();
    expect(within(screen.getByRole("region", { name: "Languages" })).getByText("C1")).toBeVisible();
  });
});
