import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { Dialog, DialogClose } from "./dialog";

function Example() {
  return (
    <Dialog
      title="Delete experience"
      description="This removes it from your profile and CV."
      trigger={<Button>Delete</Button>}
      footer={
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
      }
    >
      <input aria-label="Reason" />
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens from its trigger with an accessible name and description", async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete experience" });
    expect(dialog).toHaveAccessibleDescription("This removes it from your profile and CV.");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Delete" });
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("keeps focus inside while open", async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 5; i++) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("closes from a DialogClose button", async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
