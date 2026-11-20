import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast, type ToastOptions } from "./toast";

function Trigger(options: ToastOptions) {
  const toast = useToast();
  return <button onClick={() => toast(options)}>Show</button>;
}

describe("Toast", () => {
  it("appears and closes on its own after its duration", async () => {
    render(
      <ToastProvider>
        {/* Long enough to be seen on a slow CI runner (50 ms was sometimes gone before the first check). */}
        <Trigger title="Project hidden" duration={1000} />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(await screen.findByText("Project hidden")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Project hidden")).toBeNull(), { timeout: 3000 });
  });

  it("runs its action (Undo)", async () => {
    const undo = vi.fn();
    render(
      <ToastProvider>
        <Trigger title="Experience deleted" action={{ label: "Undo", onClick: undo }} />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }));
    expect(undo).toHaveBeenCalledOnce();
  });

  it("fails loudly when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger title="x" />)).toThrow(/ToastProvider/);
  });
});
