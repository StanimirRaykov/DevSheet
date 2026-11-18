import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs } from "./tabs";

const items = [
  { value: "pending", label: "Pending", count: 4, content: <p>Pending list</p> },
  { value: "visible", label: "Visible", count: 7, content: <p>Visible list</p> },
];

describe("Tabs", () => {
  it("shows the first tab by default and switches on click", async () => {
    render(<Tabs label="Projects" items={items} />);
    expect(screen.getByText("Pending list")).toBeVisible();
    await userEvent.click(screen.getByRole("tab", { name: /Visible/ }));
    expect(screen.getByText("Visible list")).toBeVisible();
    expect(screen.queryByText("Pending list")).toBeNull();
  });

  it("moves between tabs with the arrow keys", async () => {
    render(<Tabs label="Projects" items={items} />);
    screen.getByRole("tab", { name: /Pending/ }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Visible/ })).toHaveAttribute("aria-selected", "true");
  });

  it("names the tab list and shows counts", () => {
    render(<Tabs label="Projects" items={items} />);
    expect(screen.getByRole("tablist", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Pending/ })).toHaveTextContent("4");
  });
});
