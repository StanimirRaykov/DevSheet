import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_SLUG, FOOTER_LINKS, NAV_LINKS, REPO_URL } from "./site-links";
import { isReservedSlug } from "@/lib/reserved-slugs";

const APP_DIR = join(__dirname, "..", "..");

/** Folder of a static route, looking through route groups such as (marketing). */
function routeExists(path: string, dir = APP_DIR): boolean {
  const [segment, ...rest] = path.replace(/^\//, "").split("/");
  if (!segment) return existsSync(join(dir, "page.tsx"));
  const groups = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name.startsWith("("));
  if (existsSync(join(dir, segment))) return routeExists("/" + rest.join("/"), join(dir, segment));
  return groups.some((g) => routeExists(path, join(dir, g.name)));
}

describe("site links", () => {
  it.each([...NAV_LINKS, ...FOOTER_LINKS].filter((l) => l.href.startsWith("/")))("$label points to an existing page", ({ href }) => {
    expect(routeExists(href)).toBe(true);
  });

  it("the only external link is the source code", () => {
    expect(FOOTER_LINKS.filter((l) => !l.href.startsWith("/")).map((l) => l.href)).toEqual([REPO_URL]);
  });

  it("the example page's address is reserved, so no real account can take it", () => {
    expect(isReservedSlug(DEMO_SLUG)).toBe(true);
    expect(routeExists("/" + DEMO_SLUG)).toBe(false); // served by the public [slug] page, not a route of its own
  });

  it("the check itself notices a missing page", () => {
    expect(routeExists("/no-such-page")).toBe(false);
    expect(routeExists("/dashboard/projects")).toBe(true);
  });
});
