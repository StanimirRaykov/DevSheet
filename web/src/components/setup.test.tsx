import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

it("renders React components in the test environment", () => {
  render(<p>hello</p>);
  expect(screen.getByText("hello")).toBeInTheDocument();
});
