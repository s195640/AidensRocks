// The /admin section.
import { test, expect } from "@playwright/test";
import { signInAs, trackErrors } from "./helpers";

const ADMIN_PAGES = [
  "/admin", "/admin/jobs", "/admin/users", "/admin/accounts", "/admin/rocks",
  "/admin/albums", "/admin/journey", "/admin/rock-requests", "/admin/music",
  "/admin/pages", "/admin/honoring-aiden",
];

test("signed out, /admin goes to sign in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("a level-20 user is sent home from /admin", async ({ page }) => {
  await signInAs(page, "user");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/$/);
});

test.describe("as admin", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, "admin");
  });

  for (const route of ADMIN_PAGES) {
    test(`${route} loads without errors`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(new RegExp(`${route}(/[a-z0-9-]*)?$`));
      expect(errors).toEqual([]);
    });
  }

  test("Server Health renders with a single DB node", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Loading server health...")).toHaveCount(0, { timeout: 15000 });
  });

  test("[S16] admin Albums still lists hidden albums", async ({ page }) => {
    await page.goto("/admin/albums");
    await expect(page.getByText("Hidden Album").first()).toBeVisible();
  });

  test("[admin-create-account] Add Account creates a locked account", async ({ page }) => {
    await page.goto("/admin/accounts");
    await page.getByRole("button", { name: "Add Account" }).click();
    await page.locator("#create-first-name").fill("Added");
    await page.locator("#create-email").fill("added.by.admin@example.com");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText(/Account created for added\.by\.admin@example\.com/)).toBeVisible();
    const row = page.getByRole("row", { name: /added\.by\.admin@example\.com/ });
    await expect(row).toContainText("Locked");
  });

  test("[A3] the rock-request email keeps what you type after Save", async ({ page }) => {
    await page.goto("/admin/rock-requests");
    await page.locator("svg[style*='91, 192, 222'], svg[style*='5bc0de']").first().click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Send Email" }).click();
    const subject = page.locator("#send-email-subject");
    await subject.fill("My own subject");
    await page.waitForTimeout(3500); // the parent's "Saved" indicator clears at 3s
    await expect(subject).toHaveValue("My own subject");
  });
});
