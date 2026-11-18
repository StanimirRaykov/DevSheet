import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { Menu, MenuItem } from "./menu";

describe("Menu", () => {
  it("opens with the keyboard and runs the chosen item", async () => {
    const onSettings = vi.fn();
    render(
      <Menu trigger={<Button>Account</Button>}>
        <MenuItem onSelect={onSettings}>Settings</MenuItem>
        <MenuItem>Sign out</MenuItem>
      </Menu>,
    );
    screen.getByRole("button", { name: "Account" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: "Settings" }));
    expect(onSettings).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
