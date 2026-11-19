import { describe, expect, it } from "vitest";
import { APP_NAV, isActive } from "@/lib/nav";

const active = (pathname: string) => APP_NAV.filter((item) => isActive(item, pathname)).map((i) => i.label);

describe("isActive", () => {
  it("marks exactly one item for each page", () => {
    expect(active("/dashboard")).toEqual(["Overview"]);
    expect(active("/dashboard/projects")).toEqual(["Projects"]);
    expect(active("/dashboard/profile")).toEqual(["Profile"]);
    expect(active("/settings")).toEqual(["Settings"]);
  });

  it("keeps the section active on sub-pages and with a trailing slash", () => {
    expect(active("/dashboard/projects/123")).toEqual(["Projects"]);
    expect(active("/settings/")).toEqual(["Settings"]);
  });

  it("does not match a longer name with the same start", () => {
    expect(active("/dashboard/cvs")).toEqual([]);
    expect(active("/welcome")).toEqual([]);
  });
});
