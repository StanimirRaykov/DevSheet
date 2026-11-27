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

/** Mailpit's web API. The test API sends its email over SMTP to localhost:1025; Mailpit shows it here. */
export const MAILPIT = process.env.E2E_MAILPIT ?? "http://localhost:8025";

/** A fictional address no earlier run used. */
export const freshEmail = (prefix: string) => `${prefix}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.test`;

/**
 * Waits for the newest email to `to` that holds a link to `path` (like "/confirm-email") and returns that link.
 * `after` skips links already seen, so a second email to the same address is not mistaken for the first.
 */
export async function linkFromEmail(to: string, path: string, after: string[] = []): Promise<string> {
  const pattern = new RegExp(`https?://\\S+${path}\\?token=[^\\s)>\\]]+`);
  let found: string | null = null;
  await expect
    .poll(async () => {
      const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
      if (!r.ok) return null;
      const { messages = [] } = (await r.json()) as { messages?: { ID: string }[] };
      for (const { ID } of messages) {
        const message = (await (await fetch(`${MAILPIT}/api/v1/message/${ID}`)).json()) as { Text: string };
        const link = message.Text.match(pattern)?.[0];
        if (link && !after.includes(link)) return (found = link);
      }
      return null;
    }, { message: `an email to ${to} with a ${path} link (is Mailpit running?)`, timeout: 15_000 })
    .not.toBeNull();
  return found!;
}

/** The subjects of every email sent to `to`, newest first. */
export async function emailSubjects(to: string): Promise<string[]> {
  const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  const { messages = [] } = (await r.json()) as { messages?: { Subject: string }[] };
  return messages.map((m) => m.Subject);
}
