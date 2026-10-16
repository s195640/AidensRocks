// Site activity tracking (Site Tracking phase 1): what the browser sends to
// POST /api/activity, and that the site behaves exactly the same when
// tracking is blocked or storage is unavailable.
import { test, expect } from "@playwright/test";
import { collectActivity, ofType, signInAs, trackErrors } from "./helpers";


test("page views, page leaves and the visit are sent", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator("nav").first().getByText("Map", { exact: true }).first().click();
  await expect(page).toHaveURL(/\/map$/);

  await expect
    .poll(() => ofType(activity.events(), "page_view").map((e) => e.path), { timeout: 15_000 })
    .toEqual(["/", "/map"]);

  const [home] = ofType(activity.events(), "page_view");
  const leave = ofType(activity.events(), "page_leave").find((e) => e.path === "/");
  expect(leave.meta.view_id).toBe(home.meta.view_id);
  expect(leave.meta.engaged_ms).toBeGreaterThan(0);
  expect(leave.meta.max_scroll_pct).toBeGreaterThan(0);

  const { visit } = activity.batches[0];
  expect(visit.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(visit.deviceId).toMatch(/^[0-9a-f-]{36}$/);
  expect(visit.landingPath).toBe("/");
  expect(visit.clientVersion).toMatch(/^\d+\.\d+\.\d+$/);
  // One visit for the whole session.
  expect(new Set(activity.batches.map((b) => b.visit.id)).size).toBe(1);
});

test("a QR scan records the rock number, not a page view for /qr", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/qr?r=101");
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => ofType(activity.events(), "qr_scan").length, { timeout: 15_000 }).toBe(1);
  expect(ofType(activity.events(), "qr_scan")[0].targetId).toBe("101");
  expect(ofType(activity.events(), "page_view").map((e) => e.path)).not.toContain("/qr");
});

test("an unknown path records not_found", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/no-such-page?x=1");
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => ofType(activity.events(), "not_found").length, { timeout: 15_000 }).toBe(1);
  expect(ofType(activity.events(), "not_found")[0]).toMatchObject({
    path: "/no-such-page",
    meta: { full_url: "/no-such-page?x=1" },
  });
});

test("outbound links and the contact popup are recorded, and the link still opens", async ({ page, context }) => {
  const activity = collectActivity(page);
  await page.goto("/");
  const popupPromise = context.waitForEvent("page");
  await page.locator('[data-activity-where="footer"] a[href*="facebook.com"]').click();
  const popup = await popupPromise;
  await popup.close();

  await page.getByLabel("Contact Me").click();
  await expect(page.getByText("Contact Us")).toBeVisible();

  await expect.poll(() => ofType(activity.events(), "outbound_click").length, { timeout: 15_000 }).toBe(1);
  expect(ofType(activity.events(), "outbound_click")[0]).toMatchObject({
    targetId: "facebook.com",
    meta: { where: "footer" },
  });
  await expect.poll(() => ofType(activity.events(), "contact_open").length, { timeout: 15_000 }).toBe(1);
});

test("admin pages are never tracked", async ({ page }) => {
  await signInAs(page, "admin");
  const activity = collectActivity(page);
  await page.goto("/admin");
  await expect(page.getByText("Admin Dashboard")).toBeVisible();
  await page.goto("/map");
  await expect.poll(() => ofType(activity.events(), "page_view").length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(activity.events().filter((e) => e.path.startsWith("/admin"))).toEqual([]);
});

test("the site works the same with tracking blocked (ad blocker)", async ({ page }) => {
  await page.route("**/api/activity", (route) => route.abort());
  const errors = trackErrors(page);
  for (const path of ["/", "/map", "/photos", "/track-the-rocks"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("nav").first()).toBeVisible();
  }
  await page.locator("nav").first().getByText("Home", { exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});

test("the site works and still tracks when storage throws", async ({ page }) => {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (String(key).startsWith("ar_")) throw new Error("storage blocked");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (String(key).startsWith("ar_")) throw new Error("storage blocked");
      return set.call(this, key, value);
    };
  });
  const errors = trackErrors(page);
  const activity = collectActivity(page);
  await page.goto("/");
  await page.locator("nav").first().getByText("Map", { exact: true }).first().click();
  await expect(page).toHaveURL(/\/map$/);
  await expect.poll(() => ofType(activity.events(), "page_view").length, { timeout: 15_000 }).toBe(2);
  expect(new Set(activity.batches.map((b) => b.visit.id)).size).toBe(1);
  expect(errors).toEqual([]);
});

test("errors and page speed are recorded, and failed loads still show their retry", async ({ page }) => {
  const activity = collectActivity(page);
  await page.route("**/api/rock-posts/allrocks", (route) => route.fulfill({ status: 500, body: "{}" }));
  await page.goto("/all-rocks");
  await expect(page.getByRole("button", { name: /try again|retry/i })).toBeVisible();
  await page.evaluate(() => setTimeout(() => {
    throw new Error("activity test boom");
  }));

  await expect.poll(() => ofType(activity.events(), "load_error").length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(ofType(activity.events(), "load_error")[0]).toMatchObject({
    targetId: "/api/rock-posts/allrocks",
    meta: { method: "GET", status: 500 },
  });
  await expect.poll(() => ofType(activity.events(), "client_error").length, { timeout: 15_000 }).toBe(1);
  expect(ofType(activity.events(), "client_error")[0].meta.message).toContain("activity test boom");
  await expect.poll(() => ofType(activity.events(), "page_perf").length, { timeout: 15_000 }).toBe(1);
  expect(ofType(activity.events(), "page_perf")[0].meta.load_ms).toBeGreaterThan(0);
});

// ---------------------------------------------------------------- phase 2
test("a page crash shows the crash screen, is recorded, and clears on navigation", async ({ page }) => {
  const activity = collectActivity(page);
  // Data the page can't draw: AllRocks maps over artistsTable.
  await page.route("**/api/ar-details", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ artistsTable: "broken" }) })
  );
  await page.goto("/all-rocks");
  await expect(page.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
  await expect(page.locator("nav").first()).toBeVisible(); // the rest of the site is still there

  await expect.poll(() => ofType(activity.events(), "render_crash").length, { timeout: 15_000 }).toBe(1);
  const crash = ofType(activity.events(), "render_crash")[0];
  expect(crash.path).toBe("/all-rocks");
  expect(crash.meta.message).toMatch(/map is not a function/);
  expect(crash.meta.component_stack).toBeTruthy();
  expect(crash.meta.where).toBe("page");

  await page.getByRole("link", { name: "Go to the home page" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0);
});

test("error messages shown to visitors are recorded with their spot", async ({ page }) => {
  const activity = collectActivity(page);
  await page.route(/\/api\/albums\/(\?|$)/, (route) => route.fulfill({ status: 500, body: "{}" }));
  await page.goto("/photos");
  await expect(page.getByText("The photo albums couldn't be loaded right now.")).toBeVisible();
  await expect.poll(() => ofType(activity.events(), "error_shown").length, { timeout: 15_000 }).toBe(1);
  expect(ofType(activity.events(), "error_shown")[0]).toMatchObject({
    targetId: "albums_load",
    meta: { message: "The photo albums couldn't be loaded right now." },
  });

  // The Track the Rocks alert, too (the alert itself still shows).
  page.once("dialog", (d) => d.accept());
  await page.goto("/track-the-rocks");
  await page.getByRole("button", { name: "Search" }).first().click();
  await page.getByLabel("Rock number").fill("0");
  await page.getByRole("button", { name: "Search" }).last().click();
  await expect
    .poll(() => ofType(activity.events(), "error_shown").map((e) => e.targetId), { timeout: 15_000 })
    .toContain("track_rock_number");
});

test("broken images and rate limits are recorded; 404s are not", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/");
  await page.evaluate(() => {
    const img = document.createElement("img");
    img.src = "/media/albums/Nope/webp/missing-1.webp";
    document.body.appendChild(img);
  });
  await expect
    .poll(() => ofType(activity.events(), "media_error").map((e) => e.targetId), { timeout: 15_000 })
    .toContain("/media/albums/Nope/webp/missing-1.webp");
  expect(ofType(activity.events(), "media_error").find((e) => e.targetId.includes("missing-1"))).toMatchObject({
    targetId: "/media/albums/Nope/webp/missing-1.webp",
    meta: { kind: "image" },
  });

  // A rate-limited request through the app's own axios (the map's pins),
  // and a 404 (an unknown rock) that must not count.
  await page.route("**/api/rock-posts/locations/all", (route) => route.fulfill({ status: 429, body: "{}" }));
  await page.goto("/map");
  await expect
    .poll(() => ofType(activity.events(), "load_error").map((e) => e.meta.status), { timeout: 15_000 })
    .toContain(429);
  await page.route("**/api/rock-posts/7777", (route) => route.fulfill({ status: 404, body: "[]" }));
  await page.goto("/track-the-rocks?rock=7777");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  expect(ofType(activity.events(), "load_error").some((e) => e.meta.status === 404)).toBe(false);
});

test("API calls carry the visit id for matching server errors", async ({ page }) => {
  const visitIds = new Set();
  page.on("request", (req) => {
    if (req.url().includes("/api/") && !req.url().endsWith("/api/activity")) {
      const id = req.headers()["x-visit-id"];
      if (id) visitIds.add(id);
    }
  });
  const activity = collectActivity(page);
  await page.goto("/all-rocks");
  await page.waitForLoadState("networkidle");
  await expect.poll(() => activity.batches.length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect([...visitIds]).toEqual([activity.batches[0].visit.id]);
});
