// Phone-sized smoke check of the main public pages.
import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

for (const route of ["/", "/track-the-rocks", "/map", "/share-your-rock"]) {
  test(`mobile: ${route} renders without errors or sideways scroll`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
