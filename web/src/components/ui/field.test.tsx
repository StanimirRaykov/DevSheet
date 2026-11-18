import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, Input } from "./field";

describe("Field", () => {
  it("links the label to the control", () => {
    render(<Field label="Headline"><Input /></Field>);
    expect(screen.getByLabelText("Headline")).toBeInstanceOf(HTMLInputElement);
  });

  it("describes the control with the hint when there is no error", () => {
    render(<Field label="Slug" hint="Lowercase letters, digits and hyphens."><Input /></Field>);
    expect(screen.getByLabelText("Slug")).toHaveAccessibleDescription("Lowercase letters, digits and hyphens.");
    expect(screen.getByLabelText("Slug")).not.toHaveAttribute("aria-invalid");
  });

  it("marks the control invalid and describes it with the error, hiding the hint", () => {
    render(<Field label="Email" hint="Shown on your CV." error="Enter a valid email address."><Input /></Field>);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a valid email address.");
    expect(screen.queryByText("Shown on your CV.")).toBeNull();
  });
});
