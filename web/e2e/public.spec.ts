import { expect, test } from "@playwright/test";
import { expectAccessible } from "./support";

test.describe("public pages", () => {
  test("the landing page loads and its links work", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectAccessible(page, "/");

    await page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByRole("link", { name: "Sign in" }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("the seeded public profile renders", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { level: 1, name: "Ana Petrova" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });

  test("an unknown address shows the 404 page", async ({ page }) => {
    await page.goto("/no-one-uses-this-address");
    await expect(page.getByRole("heading", { name: "Nothing here" })).toBeVisible();
    // The page streams, so the browser gets 200 with noindex; link previews and search engines get a real 404.
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    await expectAccessible(page, "404");
  });

  for (const path of ["/about", "/privacy", "/terms", "/login", "/demo"]) {
    test(`${path} has no serious accessibility problems`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectAccessible(page, path);
    });
  }
});
