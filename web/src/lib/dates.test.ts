import { describe, expect, it } from "vitest";
import { formatMonth, formatRange, formatTimeAgo } from "@/lib/dates";

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

describe("formatTimeAgo", () => {
  const now = new Date("2026-11-22T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

  it("reads like speech for recent times", () => {
    expect(formatTimeAgo(ago(20_000), now)).toBe("just now");
    expect(formatTimeAgo(ago(1 * MIN), now)).toBe("1 minute ago");
    expect(formatTimeAgo(ago(5 * MIN), now)).toBe("5 minutes ago");
    expect(formatTimeAgo(ago(3 * HOUR), now)).toBe("3 hours ago");
    expect(formatTimeAgo(ago(1 * DAY), now)).toBe("yesterday");
    expect(formatTimeAgo(ago(4 * DAY), now)).toBe("4 days ago");
  });

  it("shows the date after a week", () => {
    expect(formatTimeAgo("2026-03-12T08:00:00Z", now)).toBe("12 Mar 2026");
  });

  it("returns unparseable input as is", () => {
    expect(formatTimeAgo("soon", now)).toBe("soon");
  });
});
