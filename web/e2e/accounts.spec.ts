import { expect, test, type Page } from "@playwright/test";
import { API, emailSubjects, expectAccessible, freshEmail, linkFromEmail } from "./support";

/**
 * Email and password accounts, through the real pages and real email: the test API sends over SMTP to Mailpit
 * (docker compose up -d mailpit), and the links are read from Mailpit's API. Fictional example.test addresses only.
 */
const PASSWORD = "correct horse battery";
const NEW_PASSWORD = "a brand new passphrase";

async function signInForm(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/** Signs up through the API and opens the confirm link: a signed-in browser with a confirmed account. */
async function confirmedAccount(page: Page, email: string) {
  expect((await page.request.post(`${API}/auth/register`, { data: { email, password: PASSWORD, name: "Vera Testova" } })).status()).toBe(202);
  await page.goto(await linkFromEmail(email, "/confirm-email"));
  await page.getByRole("button", { name: "Confirm email" }).click();
  await expect(page).toHaveURL(/\/welcome/);
}

test("sign up, confirm the email, then sign in with the password", async ({ page, browser }) => {
  const email = freshEmail("e2e-signup");

  await page.goto("/signup");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Your name").fill("Vera Testova");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/check-email/);
  await expect(page.getByText(email)).toBeVisible();
  await expectAccessible(page, "/check-email");

  // Not confirmed yet: the password does not sign in, and the page says why.
  await signInForm(page, email, PASSWORD);
  await expect(page.getByRole("alert").filter({ hasText: /\w/ })).toContainText("Confirm your email first");

  // The link opens a page that confirms on a click (mail scanners only open links), and hides its token.
  const link = await linkFromEmail(email, "/confirm-email");
  await page.goto(link);
  await expect(page).not.toHaveURL(/token=/);
  await expectAccessible(page, "/confirm-email");
  await page.getByRole("button", { name: "Confirm email" }).click();
  await expect(page).toHaveURL(/\/welcome/);

  // A link works once.
  const again = await (await browser.newContext()).newPage();
  await again.goto(link);
  await again.getByRole("button", { name: "Confirm email" }).click();
  await expect(again.getByRole("alert").filter({ hasText: /\w/ })).toContainText("doesn't work any more");

  // A fresh browser signs in with the password.
  const fresh = await (await browser.newContext()).newPage();
  await signInForm(fresh, email, "not the password at all");
  await expect(fresh.getByRole("alert").filter({ hasText: /\w/ })).toContainText("don't match an account");
  await signInForm(fresh, email, PASSWORD);
  await expect(fresh).not.toHaveURL(/\/login/);
  expect((await fresh.request.get(`${API}/api/me`)).status()).toBe(200);
});

test("forgot password: the reset link sets a new password and signs out the old session", async ({ page, browser }) => {
  const email = freshEmail("e2e-reset");
  await confirmedAccount(page, email);

  const other = await (await browser.newContext()).newPage();
  await other.goto("/forgot-password");
  await other.getByLabel("Email").fill(email);
  await other.getByRole("button", { name: "Send reset link" }).click();
  await expect(other.getByRole("status").filter({ hasText: /\w/ })).toContainText("has a DevSheet password");

  await other.goto(await linkFromEmail(email, "/reset-password"));
  await expect(other).not.toHaveURL(/token=/);
  await expectAccessible(other, "/reset-password");
  await other.getByLabel("New password").fill("short");
  await other.getByRole("button", { name: "Save new password" }).click();
  await expect(other.getByLabel("New password")).toHaveAttribute("aria-invalid", "true");
  await other.getByLabel("New password").fill(NEW_PASSWORD);
  await other.getByRole("button", { name: "Save new password" }).click();
  await expect(other).not.toHaveURL(/\/reset-password/);

  // The first browser was signed out; only the new password signs in.
  expect((await page.request.get(`${API}/api/me`)).status()).toBe(401);
  const check = (password: string) => browser.newContext().then((c) => c.request.post(`${API}/auth/sign-in`, { data: { email, password } }));
  expect((await check(PASSWORD)).status()).toBe(401);
  expect((await check(NEW_PASSWORD)).status()).toBe(200);
});

test("Settings: change the password, which signs out other devices", async ({ page, browser }) => {
  const email = freshEmail("e2e-settings");
  await confirmedAccount(page, email);
  const otherDevice = await browser.newContext();
  expect((await otherDevice.request.post(`${API}/auth/sign-in`, { data: { email, password: PASSWORD } })).status()).toBe(200);

  await page.goto("/settings?tab=sign-in");
  await expect(page.getByText(`Signs in as ${email}`, { exact: false })).toBeVisible();

  await page.getByLabel("Current password").fill("not it at all");
  await page.getByLabel("New password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("That is not your current password.")).toBeVisible();

  await page.getByLabel("Current password").fill(PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed", { exact: true })).toBeVisible();

  expect((await page.request.get(`${API}/api/me`)).status()).toBe(200);
  expect((await otherDevice.request.get(`${API}/api/me`)).status()).toBe(401);
  await expect.poll(() => emailSubjects(email)).toContain("Your DevSheet password was changed");
});
