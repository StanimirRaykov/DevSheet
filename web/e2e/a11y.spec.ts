import { expect, test, type Page } from "@playwright/test";
import { API, expectAccessible, signIn } from "./support";

/**
 * The checks every page gets, signed out and signed in, in both themes: axe, no horizontal scroll at phone, tablet and
 * desktop widths, headings in order, and a keyboard run (every Tab stop visible, with a focus ring, and no trap).
 */
const PUBLIC = ["/", "/about", "/privacy", "/terms", "/login", "/signup", "/forgot-password", "/demo"];
const SIGNED_IN = ["/dashboard", "/dashboard/projects", "/dashboard/skills", "/dashboard/profile", "/dashboard/cv", "/settings", "/settings?tab=sign-in"];
const WIDTHS = [360, 768, 1280];

/** One fictional account per worker, synced once, so the lists have rows in them. */
async function signedInWithData(page: Page) {
  await signIn(page, `e2e-a11y-${test.info().workerIndex}`);
  await page.request.post(`${API}/api/me/sync`);
}

async function headingProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const levels = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
      .filter((h) => (h as HTMLElement).offsetParent !== null || getComputedStyle(h).position === "fixed")
      .map((h) => ({ level: Number(h.tagName[1]), text: (h.textContent ?? "").trim().slice(0, 40) }));
    const problems: string[] = [];
    const h1 = levels.filter((h) => h.level === 1).length;
    if (h1 !== 1) problems.push(`${h1} h1 elements`);
    levels.forEach((h, i) => {
      const before = i === 0 ? 0 : levels[i - 1].level;
      if (h.level > before + 1) problems.push(`h${h.level} "${h.text}" follows h${before}`);
    });
    return problems;
  });
}

/** Tabs through the page: each stop must be on screen-visible content with a visible focus indicator. */
async function keyboardProblems(page: Page, stops = 30): Promise<string[]> {
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  const problems: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < stops; i++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const ring = (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
      const name = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
      return { key: `${el.tagName}:${name}:${Math.round(rect.top)}`, name, ring, visible: rect.width > 0 && rect.height > 0 };
    });
    if (!stop) break; // back at the start of the page: no trap
    if (seen.has(stop.key)) break; // went around once
    seen.add(stop.key);
    if (!stop.visible) problems.push(`focus on something invisible: ${stop.name}`);
    else if (!stop.ring) problems.push(`no focus ring on: ${stop.name}`);
  }
  return problems;
}

async function checkPage(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expectAccessible(page, path);
  expect.soft(await headingProblems(page), `headings on ${path}`).toEqual([]);
  expect.soft(await keyboardProblems(page), `keyboard on ${path}`).toEqual([]);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect.soft(overflow, `horizontal scroll on ${path} at ${width}px`).toBeLessThanOrEqual(0);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    for (const path of PUBLIC) test(`${path}`, async ({ page }) => checkPage(page, path));

    for (const path of SIGNED_IN) {
      test(`${path} signed in`, async ({ page }) => {
        await signedInWithData(page);
        await checkPage(page, path);
      });
    }
  });
}

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  /** Animations still running a moment after load (CSS, Web Animations and Motion's, which use the same API). */
  async function running(page: Page): Promise<string[]> {
    await page.waitForTimeout(300);
    return page.evaluate(() =>
      document.getAnimations()
        .filter((a) => a.playState === "running")
        .map((a) => {
          const target = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null;
          return `${a.constructor.name} on ${target?.tagName ?? "?"}.${String(target?.className ?? "").slice(0, 60)}`;
        }));
  }

  for (const path of PUBLIC) {
    test(`nothing animates on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      expect(await running(page)).toEqual([]);
    });
  }

  for (const path of SIGNED_IN) {
    test(`nothing animates on ${path} signed in`, async ({ page }) => {
      await signedInWithData(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      expect(await running(page)).toEqual([]);
    });
  }
});
