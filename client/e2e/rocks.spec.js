// Rock journeys: Track the Rocks, the map, All Rocks.
import { test, expect } from "@playwright/test";

const banner = (page, n) => page.locator(".rock-banner", { hasText: `Aiden's Rock: ${n}` });

test("[C1] a journey banner shows start - latest in date order and a real distance", async ({ page }) => {
  await page.goto("/track-the-rocks");
  await expect(banner(page, 101)).toContainText("06/01/25 - 08/01/25");
  await expect(banner(page, 101)).toContainText("Trips: 2");
  await expect(banner(page, 101)).not.toContainText("NaN");
  // rock 102 has no coordinates yet: the distance is still a number
  await expect(banner(page, 102)).toContainText(/Distance: \d+ miles/);
});

test("[C3] Track the Rocks stops asking for pages at the end of the list", async ({ page }) => {
  let pageRequests = 0;
  page.on("request", (req) => {
    if (/\/api\/rock-posts\?/.test(req.url())) pageRequests++;
  });
  await page.goto("/track-the-rocks");
  await expect(page.locator(".rock-banner").first()).toBeVisible();
  await page.mouse.wheel(0, 20000);
  await page.waitForTimeout(2500);
  expect(pageRequests).toBeLessThanOrEqual(2);
  // hidden (103) and imageless (104) rocks are not listed
  await expect(banner(page, 103)).toHaveCount(0);
  await expect(banner(page, 104)).toHaveCount(0);
});

test("[C3] a failed page shows a retry instead of spinning forever", async ({ page }) => {
  let fail = true;
  await page.route(/\/api\/rock-posts\?/, (route) =>
    fail ? route.fulfill({ status: 500, body: "{}" }) : route.continue()
  );
  await page.goto("/track-the-rocks");
  await expect(page.getByText(/Couldn.t load/)).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".rock-banner").first()).toBeVisible();
});

test("[C-pin] every map pin opens a rock that exists", async ({ page }) => {
  await page.goto("/map");
  const pins = page.locator(".leaflet-marker-icon");
  await expect(pins).toHaveCount(2);
  await pins.first().click({ force: true });
  await expect(page.getByText(/Aiden's Rock: 101/).first()).toBeVisible();
  await expect(page.getByText(/was not found/)).toHaveCount(0);
});

test("[C4] All Rocks shows an error with a retry when the stats fail", async ({ page }) => {
  let fail = true;
  await page.route("**/api/ar-details", (route) =>
    fail ? route.fulfill({ status: 500, body: "{}" }) : route.continue()
  );
  await page.goto("/all-rocks");
  await expect(page.getByText(/couldn.t be loaded/)).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText(/Rocks \(\d+\)/)).toBeVisible();
});
