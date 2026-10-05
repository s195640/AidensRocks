// Every public route renders without script errors, and the navbar is
// built from the published pages.
import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

const ROUTES = [
  "/", "/share-your-rock", "/photos", "/birthdays", "/honoring-aiden",
  "/track-the-rocks", "/all-rocks", "/map", "/sudc",
  "/login", "/sign-up", "/forgot-password",
];

for (const route of ROUTES) {
  test(`renders ${route} without errors`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("nav").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("navbar lists the published pages", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator("nav").first();
  for (const label of ["Home", "Share Your Rock", "Photos", "Track The Rocks", "Map", "SUDC"]) {
    await expect(nav.getByText(label, { exact: true }).first()).toBeAttached();
  }
});

test("an unknown path redirects home", async ({ page }) => {
  await page.goto("/definitely-not-a-page");
  await expect(page).toHaveURL(/\/$/);
});

test("[S16] hidden albums never reach the Photos page", async ({ page }) => {
  await page.goto("/photos");
  await expect(page.getByText("Visible Album").first()).toBeVisible();
  await expect(page.getByText("Hidden Album")).toHaveCount(0);
});
