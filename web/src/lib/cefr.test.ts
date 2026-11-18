import { describe, expect, it } from "vitest";
import { LevelSet, levelLabel, setAll, summarizeLevels, uniformLevel } from "@/lib/cefr";

describe("levelLabel", () => {
  it("maps 1-6 to A1-C2", () => {
    expect([1, 2, 3, 4, 5, 6].map(levelLabel)).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
  });
  it("returns empty for null, undefined and unknown numbers", () => {
    expect(levelLabel(null)).toBe("");
    expect(levelLabel(undefined)).toBe("");
    expect(levelLabel(0)).toBe("");
    expect(levelLabel(99)).toBe("");
  });
});

describe("setAll / uniformLevel", () => {
  it("sets all five skills to one level and detects it again", () => {
    const set = setAll(4);
    expect(Object.values(set)).toEqual([4, 4, 4, 4, 4]);
    expect(uniformLevel(set)).toBe(4);
  });
  it("clearing sets everything to null", () => {
    expect(setAll(null)).toEqual({ listening: null, reading: null, spokenInteraction: null, spokenProduction: null, writing: null });
    expect(uniformLevel(setAll(null))).toBeNull();
  });
  it("is not uniform when skills differ or some are missing", () => {
    expect(uniformLevel({ ...setAll(4), writing: 3 })).toBeNull();
    expect(uniformLevel({ ...setAll(4), reading: null })).toBeNull();
  });
});

describe("summarizeLevels", () => {
  it("shows a single level when uniform", () => {
    expect(summarizeLevels(setAll(5))).toBe("C1");
  });
  it("lists only the skills that are set, in Europass order", () => {
    const levels: LevelSet = { ...setAll(null), writing: 3, listening: 4 };
    expect(summarizeLevels(levels)).toBe("Listening B2 · Writing B1");
  });
  it("is empty when nothing is set", () => {
    expect(summarizeLevels(setAll(null))).toBe("");
  });
});
