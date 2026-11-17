import { describe, expect, it } from "vitest";
import { formatMonth, formatRange } from "@/lib/dates";

describe("formatMonth", () => {
  it("formats ISO dates without timezone shifts", () => {
    expect(formatMonth("2024-03-01")).toBe("Mar 2024");
    expect(formatMonth("2023-12-31")).toBe("Dec 2023");
    expect(formatMonth("2024-01-01")).toBe("Jan 2024");
  });
  it("returns unparseable input unchanged", () => {
    expect(formatMonth("nonsense")).toBe("nonsense");
    expect(formatMonth("2024-13-01")).toBe("2024-13-01");
  });
});

describe("formatRange", () => {
  it("shows Present for an open end", () => {
    expect(formatRange("2023-01-01", null)).toBe("Jan 2023 – Present");
  });
  it("shows both ends", () => {
    expect(formatRange("2020-09-01", "2024-06-01")).toBe("Sep 2020 – Jun 2024");
  });
  it("handles missing dates", () => {
    expect(formatRange(null, null)).toBe("");
    expect(formatRange(null, "2024-06-01")).toBe("Jun 2024");
  });
});
