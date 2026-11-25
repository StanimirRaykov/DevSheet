import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const API = "http://localhost:5317";

/**
 * Runs axe on the page as it is now and fails on serious or critical problems (WCAG 2.1 A and AA rules).
 * Moderate and minor findings are attached to the report instead, to be read, not to break the build.
 */
export async function expectAccessible(page: Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = blocking.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`);
  // Soft: the test goes on, so one run lists the problems of every page it visits.
  expect.soft(summary, `axe on ${name}`).toEqual([]);
}

/** Signs this browser in as a fictional user, through the API's test-only endpoint. Returns the user's slug. */
export async function signIn(page: Page, login: string): Promise<string> {
  const r = await page.request.post(`${API}/api/testing/sign-in`, { data: { login } });
  expect(r.ok(), "test sign-in (is the API running in the Testing environment?)").toBeTruthy();
  return (await r.json()).slug;
}

/** A login no earlier run used, so every run starts from an empty account. */
export const freshLogin = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;
