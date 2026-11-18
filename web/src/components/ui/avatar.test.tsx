import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar, initials } from "./avatar";

describe("initials", () => {
  it.each([
    ["Ada Lovelace", "AL"],
    ["octocat", "O"],
    ["  grace   brewster hopper ", "GH"],
    ["Стефан Иванов", "СИ"],
    ["", "?"],
  ])("%j -> %j", (name, expected) => expect(initials(name)).toBe(expected));
});

describe("Avatar", () => {
  it("uses the name as the accessible label without a picture", () => {
    render(<Avatar name="Ada Lovelace" />);
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveTextContent("AL");
  });
  it("renders the picture with the name as alt text", () => {
    render(<Avatar name="Ada Lovelace" src="https://example.com/a.png" />);
    expect(screen.getByRole("img", { name: "Ada Lovelace" })).toHaveAttribute("src", "https://example.com/a.png");
  });
});
