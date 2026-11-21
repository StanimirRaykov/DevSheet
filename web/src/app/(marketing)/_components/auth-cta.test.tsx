import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Me } from "@/lib/api";

// What the mocked getMe() does in the current test: return a user, null, or fail like an unreachable API.
let session: () => Promise<Me | null> = async () => null;
vi.mock("@/lib/session", () => ({ getMe: () => session() }));

const { AuthCta, SignInLink } = await import("./auth-cta");

const me: Me = { id: "1", displayName: "Ana", avatarUrl: null, slug: "ana", isPublished: false, github: null };

describe("landing page call to action", () => {
  it("asks a visitor to get started and offers sign in", async () => {
    session = async () => null;
    render(<>{await AuthCta({})}{await SignInLink()}</>);

    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Go to dashboard" })).toBeNull();
  });

  it("sends a signed-in user to the dashboard, without a sign-in link", async () => {
    session = async () => me;
    render(<>{await AuthCta({})}{await SignInLink()}</>);

    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "Get started" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("treats an unreachable API as a visitor instead of breaking the page", async () => {
    session = async () => {
      throw new Error("GET /api/me failed with 500");
    };
    render(<>{await AuthCta({})}{await SignInLink()}</>);

    expect(screen.getByRole("link", { name: "Get started" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });
});
