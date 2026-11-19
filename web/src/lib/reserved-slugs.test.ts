import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isReservedSlug, RESERVED_SLUGS } from "@/lib/reserved-slugs";

const APP_DIR = join(__dirname, "..", "app");
const API_LIST = join(__dirname, "..", "..", "..", "api", "src", "DevSheet.Domain", "ReservedSlugs.cs");

/** Top-level URL segments: folders in src/app, looking through route groups like (app). */
function topLevelSegments(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((e) => {
      if (e.name.startsWith("(") && e.name.endsWith(")")) return topLevelSegments(join(dir, e.name));
      if (e.name.startsWith("[") || e.name.startsWith("_")) return []; // dynamic or private folder
      return [e.name];
    });
}

describe("reserved slugs", () => {
  it("covers every top-level route in the web app", () => {
    const missing = topLevelSegments(APP_DIR).filter((name) => !isReservedSlug(name));
    expect(missing).toEqual([]);
  });

  it("matches the API list", () => {
    const source = readFileSync(API_LIST, "utf8");
    const block = source.slice(source.indexOf("reserved-slugs:start"), source.indexOf("reserved-slugs:end"));
    const apiList = [...block.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
    expect([...RESERVED_SLUGS].sort()).toEqual(apiList.sort());
  });

  it("ignores case and spaces", () => {
    expect(isReservedSlug(" Dashboard ")).toBe(true);
    expect(isReservedSlug("maria-petrova")).toBe(false);
  });
});
