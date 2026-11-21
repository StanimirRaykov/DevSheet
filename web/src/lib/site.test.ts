import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { siteUrl } from "./site";

describe("site address, robots and sitemap", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses SITE_URL without a trailing slash, localhost by default", () => {
    expect(siteUrl()).toBe("http://localhost:3000");
    vi.stubEnv("SITE_URL", "https://devsheet.example/");
    expect(siteUrl()).toBe("https://devsheet.example");
  });

  it("keeps the signed-in app out of search engines and points to the sitemap", () => {
    vi.stubEnv("SITE_URL", "https://devsheet.example");
    const r = robots();
    expect(r.rules).toMatchObject({ allow: "/", disallow: expect.arrayContaining(["/dashboard", "/settings", "/login"]) });
    expect(r.sitemap).toBe("https://devsheet.example/sitemap.xml");
  });

  it("lists the public site's pages", () => {
    vi.stubEnv("SITE_URL", "https://devsheet.example");
    expect(sitemap().map((e) => e.url)).toEqual([
      "https://devsheet.example",
      "https://devsheet.example/about",
      "https://devsheet.example/privacy",
      "https://devsheet.example/terms",
      "https://devsheet.example/demo",
    ]);
  });
});
