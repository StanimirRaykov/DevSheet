import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT, loginHref, safeNext } from "@/lib/redirect";

describe("safeNext", () => {
  it.each(["/dashboard", "/dashboard/profile?tab=languages", "/settings#github"])("allows %s", (path) => {
    expect(safeNext(path)).toBe(path);
  });

  it.each([
    null,
    undefined,
    "",
    "dashboard",
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/dash\nboard",
  ])("rejects %j", (value) => {
    expect(safeNext(value)).toBe(DEFAULT_NEXT);
  });
});

describe("loginHref", () => {
  it("keeps the return path", () => {
    expect(loginHref("/dashboard/skills")).toBe("/login?next=%2Fdashboard%2Fskills");
  });

  it("drops the default path and unsafe values", () => {
    expect(loginHref("/dashboard")).toBe("/login");
    expect(loginHref("//evil.com")).toBe("/login");
  });
});
