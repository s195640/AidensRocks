// The "Upload Your Rock" form.
import { test, expect } from "@playwright/test";

const openUploadForm = async (page) => {
  await page.goto("/share-your-rock");
  await page.getByRole("button", { name: "Upload Your Rock" }).first().click();
  await expect(page.locator(".rock-form-overlay")).toBeVisible();
};

test.describe("in a US evening (UTC is already tomorrow)", () => {
  test.use({ timezoneId: "America/New_York" });

  test("[C5] the date defaults to the visitor's local today", async ({ page }) => {
    // 9:30pm New York == 01:30 UTC the next day
    await page.clock.setFixedTime(new Date("2025-09-01T21:30:00-04:00"));
    await openUploadForm(page);
    await expect(page.locator('.rock-form-overlay input[type="date"]').first()).toHaveValue("2025-09-01");
  });
});

test("the upload form opens above the navbar", async ({ page }) => {
  await openUploadForm(page);
  const navBox = await page.locator("nav").first().boundingBox();
  const onTop = await page.evaluate(
    ({ x, y }) => !!document.elementFromPoint(x, y)?.closest(".rock-form-overlay"),
    { x: navBox.x + navBox.width / 2, y: navBox.y + navBox.height / 2 }
  );
  expect(onTop).toBe(true);
});
