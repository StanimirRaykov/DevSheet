import { expect, test } from "@playwright/test";
import { expectAccessible, freshLogin, signIn } from "./support";

// One person's first session, start to finish. Steps depend on each other, so they run in order in one test.
test("sign in, sync, approve a project, confirm a skill, add experience, download the CV", async ({ page }) => {
  await signIn(page, freshLogin("e2e-journey"));

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectAccessible(page, "/dashboard");

  // Sync (GitHub is stubbed: three fictional repositories) and approve one.
  await page.goto("/dashboard/projects");
  await page.getByRole("button", { name: "Sync now" }).click();
  const approve = page.getByRole("button", { name: "Approve ledger-api" });
  await expect(approve).toBeVisible();
  await expectAccessible(page, "/dashboard/projects");
  await approve.click();
  await expect(page.getByText("ledger-api approved")).toBeVisible();

  // The approved project's languages are now suggestions: confirm C#.
  await page.goto("/dashboard/skills");
  const confirm = page.getByRole("button", { name: "Confirm C#" });
  await expect(confirm).toBeVisible();
  await expectAccessible(page, "/dashboard/skills");
  await confirm.click();
  await expect(page.getByRole("button", { name: "Confirm C#" })).toHaveCount(0);

  // Add a job.
  await page.goto("/dashboard/profile?tab=experience");
  await page.getByRole("button", { name: "Add experience" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Job title").fill("Backend developer");
  await dialog.getByLabel("Company").fill("Example Ledger Ltd");
  await dialog.getByLabel("Start, month").selectOption({ label: "March" });
  await dialog.getByLabel("Start, year").selectOption("2023");
  await dialog.getByText("I currently work here").click();
  await expectAccessible(page, "add experience dialog");
  await dialog.getByRole("button", { name: "Add experience" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Example Ledger Ltd")).toBeVisible();
  await expectAccessible(page, "/dashboard/profile");

  // Download the CV: a real PDF with the approved project in it.
  await page.goto("/dashboard/cv");
  await expectAccessible(page, "/dashboard/cv");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download Modern CV" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/-cv\.pdf$/);
  const bytes = await (await download.createReadStream()).toArray();
  expect(Buffer.concat(bytes).subarray(0, 4).toString()).toBe("%PDF");

  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectAccessible(page, "/settings");
});

test("a signed-out visitor is sent to the login page", async ({ page }) => {
  await page.goto("/dashboard/projects");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fprojects/);
});
