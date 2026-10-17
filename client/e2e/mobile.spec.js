// Phone-sized smoke check of the main public pages and the admin pages.
import { test, expect } from "@playwright/test";
import { signInAs, trackErrors } from "./helpers";

// How far the page is wider than the phone. Compared to the device width,
// not window.innerWidth: a phone browser widens its layout to fit an
// overflowing page, so innerWidth grows along with it.
const sidewaysOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth).then((w) => w - page.viewportSize().width);

for (const route of ["/", "/track-the-rocks", "/map", "/share-your-rock"]) {
  test(`mobile: ${route} renders without errors or sideways scroll`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

// Admin pages: a page wider than the phone pushes the fixed navbar's ☰
// off-screen to the right.
const ADMIN_ROUTES = [
  "/admin", "/admin/activity", "/admin/jobs", "/admin/users", "/admin/accounts",
  "/admin/rocks", "/admin/rock-requests", "/admin/albums", "/admin/journey",
  "/admin/music", "/admin/pages", "/admin/honoring-aiden", "/admin/settings",
];

// The seed DB has no site-health data; these rows make the dashboard's
// Site Health tables wider than a phone (they should scroll inside the panel).
const mockSiteHealth = async (page) => {
  await page.route("**/api/admin/site-health/errors?*", (r) => r.fulfill({ json: [
    { fingerprint: "a", status: "new", type: "client_error", title: "TypeError: Cannot read properties of undefined (reading 'map')",
      pages: ["/track-the-rocks", "/map"], platforms: ["iPhone Safari"], count: 1234, visitors: 56, last_seen: new Date().toISOString() },
  ] }));
  await page.route("**/api/admin/site-health/slow?*", (r) => r.fulfill({ json: [
    { method: "GET", path: "/api/rocks/journey/123", count: 3, median_ms: 12000, max_ms: 25000 },
  ] }));
  await page.route("**/api/admin/site-health/speed?*", (r) => r.fulfill({ json: [
    { platform: "iPhone Safari", count: 1234, lcp_median: 2100, lcp_p90: 5400, load_median: 3200 },
  ] }));
};

for (const route of ADMIN_ROUTES) {
  test(`mobile: ${route} has no sideways scroll`, async ({ page }) => {
    if (route === "/admin") await mockSiteHealth(page);
    await signInAs(page, "admin");
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(1);
  });
}
