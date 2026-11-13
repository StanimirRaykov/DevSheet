import { describe, expect, it } from "vitest";
import { topLanguages } from "@/lib/api";

describe("topLanguages", () => {
  it("returns languages ordered by bytes, limited to n", () => {
    const json = JSON.stringify({ CSS: 10, TypeScript: 500, "C#": 300, HTML: 20 });
    expect(topLanguages(json, 2)).toEqual(["TypeScript", "C#"]);
  });

  it("returns an empty list for invalid JSON instead of throwing", () => {
    expect(topLanguages("not json")).toEqual([]);
  });

  it("returns an empty list for no languages", () => {
    expect(topLanguages("{}")).toEqual([]);
  });
});
