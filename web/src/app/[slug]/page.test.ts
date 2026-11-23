import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicPortfolio } from "@/lib/api";
import { generateMetadata } from "./page";

let portfolio: PublicPortfolio | null = null;
vi.mock("./load-portfolio", () => ({ loadPortfolio: async () => portfolio }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const params = (slug: string) => ({ params: Promise.resolve({ slug }) }) as Parameters<typeof generateMetadata>[0];

beforeEach(() => {
  portfolio = null;
});

describe("public page metadata", () => {
  it("is a 404 for an unknown or unpublished address (the API answers both the same way)", async () => {
    await expect(generateMetadata(params("nobody"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("names the person and uses the headline for the share card", async () => {
    portfolio = {
      displayName: "ana", avatarUrl: null, githubLogin: null, slug: "ana-petrova", cvDownload: false,
      profile: { fullName: "Ana Petrova", headline: "Backend developer", summary: "", location: null, email: null, website: null },
      projects: [], skills: [], experience: [], education: [], languages: [], certifications: [],
    };

    const meta = await generateMetadata(params("ana-petrova"));

    expect(meta.title).toBe("Ana Petrova");
    expect(meta.description).toBe("Backend developer");
    expect(meta.openGraph).toMatchObject({ title: "Ana Petrova · DevSheet", url: "/ana-petrova" });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });
});
