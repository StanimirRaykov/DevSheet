import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PageSkeleton, RouteError } from "./route-states";

describe("RouteError", () => {
  it("says what happened, moves focus to it, and retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const error = Object.assign(new Error("An error occurred in the Server Components render."), { digest: "1234567" });
    render(<RouteError error={error} retry={retry} home={{ href: "/dashboard", label: "Go to the overview" }} />);

    expect(screen.getByRole("heading", { name: "This page could not be loaded" })).toHaveFocus();
    expect(screen.getByText("1234567")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the overview" })).toHaveAttribute("href", "/dashboard");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("shows no reference for an error without a digest", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<RouteError error="plain" retry={() => {}} home={{ href: "/", label: "Go to DevSheet" }} />);
    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });
});

describe("PageSkeleton", () => {
  it("tells assistive technology the page is loading", () => {
    render(<PageSkeleton />);
    expect(screen.getByLabelText("Loading the page")).toHaveAttribute("aria-busy", "true");
  });
});
