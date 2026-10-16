// Site Tracking phase 3: what visitors do -- rock searches and journeys,
// shared links, the map, albums, the two form funnels and accounts. Each
// test checks what the page sends to /api/activity, and that the feature
// itself still works the same.
import { test, expect } from "@playwright/test";
import { PASSWORD, collectActivity, ofType, signInAs, trackErrors } from "./helpers";

const poll = (fn) => expect.poll(fn, { timeout: 15_000 });

test("a rock search opens its journey; what's opened inside is linked to it", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/track-the-rocks");
  await page.getByRole("button", { name: "Search" }).first().click();
  await page.getByLabel("Rock number").fill("101");
  await page.getByRole("button", { name: "Search" }).last().click();

  const dialog = page.locator(".rock-journey-outer").last();
  await expect(dialog).toBeVisible();
  await poll(() => ofType(activity.events(), "rock_search").length).toBe(1);
  expect(ofType(activity.events(), "rock_search")[0]).toMatchObject({
    targetId: "101",
    meta: { page: "track_the_rocks", input: "search", found: true },
  });
  const [view] = ofType(activity.events(), "rock_view");
  expect(view).toMatchObject({ targetId: "101", meta: { source: "search" } });

  await dialog.locator(".location-text").first().click();
  await page.getByRole("button", { name: "Close" }).first().click();
  await page.getByRole("button", { name: "✖" }).click();

  await poll(() => ofType(activity.events(), "rock_close").length).toBe(1);
  const loc = ofType(activity.events(), "journey_location")[0];
  expect(loc).toMatchObject({ targetId: "101", meta: { open_id: view.meta.open_id, source: "search" } });
  expect(loc.meta.rps_key).toBeTruthy();
  const close = ofType(activity.events(), "rock_close")[0];
  expect(close.meta.open_id).toBe(view.meta.open_id);
  expect(close.meta.engaged_ms).toBeGreaterThan(0);
});

test("a shared rock link is recorded with where it came from, found or not", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/track-the-rocks?rock=101&from=email-follow");
  await expect(page.locator(".rock-journey-outer").last()).toBeVisible();
  await poll(() => ofType(activity.events(), "rock_link").length).toBe(1);
  expect(ofType(activity.events(), "rock_link")[0]).toMatchObject({
    targetId: "101",
    meta: { found: true, from: "email-follow" },
  });
  expect(ofType(activity.events(), "rock_view")[0].meta.source).toBe("link");

  await page.goto("/track-the-rocks?rock=9999");
  await expect(page.getByText("Rock Number 9999 was not found")).toBeVisible();
  await poll(() => ofType(activity.events(), "rock_link").map((e) => e.targetId)).toContain("9999");
  expect(ofType(activity.events(), "rock_link").find((e) => e.targetId === "9999").meta).toMatchObject({
    found: false,
    from: null,
  });
});

test("typing in the map's Rock # box records one search, and a pin click opens the journey", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/map");
  const box = page.getByLabel("Highlight rock number");
  await box.pressSequentially("101", { delay: 80 });
  await poll(() => ofType(activity.events(), "rock_search").length).toBe(1);
  expect(ofType(activity.events(), "rock_search")[0]).toMatchObject({
    targetId: "101",
    meta: { page: "map", input: "highlight", found: true },
  });
  await box.blur(); // same value: not recorded again
  await page.waitForTimeout(500);
  expect(ofType(activity.events(), "rock_search")).toHaveLength(1);

  // Then a different number, so the pin click below (rock 101) isn't
  // hidden by the "same as the last search" rule.
  await box.fill("");
  await box.pressSequentially("999", { delay: 80 });
  await poll(() => ofType(activity.events(), "rock_search").length).toBe(2);
  expect(ofType(activity.events(), "rock_search")[1].meta.found).toBe(false);

  await page.locator(".leaflet-marker-icon").first().click({ force: true });
  await expect(page.locator(".rock-journey-outer").last()).toBeVisible();
  await poll(() => ofType(activity.events(), "map_pin").length).toBe(1);
  await poll(() => ofType(activity.events(), "rock_view").map((e) => e.meta.source)).toContain("map_pin");
  // The pin click filled the Rock # box with 101: that's not a typed search.
  await page.waitForTimeout(2500);
  expect(ofType(activity.events(), "rock_search")).toHaveLength(2);
});

test("opening an album and a photo records which, and for how long", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/photos");
  await page.getByText("Visible Album").first().click();
  await poll(() => ofType(activity.events(), "album_open").length).toBe(1);
  const open = ofType(activity.events(), "album_open")[0];
  expect(open).toMatchObject({ targetId: "1", meta: { album_name: "visible-album", page: "photos" } });

  await page.locator(".react-photo-album img").first().click();
  await expect(page.locator(".yarl__root")).toBeVisible();
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await poll(() => ofType(activity.events(), "photo_view").length).toBe(1);
  expect(ofType(activity.events(), "photo_view")[0]).toMatchObject({
    targetId: "1",
    meta: { open_id: open.meta.open_id, album_id: 1, is_video: false },
  });

  // Leaving the Photos page in the app closes the album. (A tab closed with
  // an album open sends its close by beacon on pagehide; Playwright can't
  // observe that, see the phase 3 log.)
  await page.locator("nav").first().getByText("Home", { exact: true }).first().click();
  await poll(() => ofType(activity.events(), "album_close").length).toBe(1);
  expect(ofType(activity.events(), "album_close")[0].meta).toMatchObject({
    open_id: open.meta.open_id,
    photos_viewed: 1,
  });
});

test("Request a Rock: opened, started, a rejected submit, then closed (abandoned)", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Request A Rock" }).click();
  await page.locator("#request-name").fill("Test Visitor");
  await page.getByRole("button", { name: /submit|send/i }).click(); // other fields missing
  await expect(page.locator("#request-email")).toBeVisible(); // still open, showing what's missing
  await page.getByRole("button", { name: "Close" }).click();

  await poll(() => ofType(activity.events(), "form_close").length).toBe(1);
  const byType = (t) => ofType(activity.events(), t).filter((e) => e.targetId === "request_a_rock");
  const [opened] = byType("form_open");
  expect(opened.meta.source).toBe("floating_button");
  const id = opened.meta.open_id;
  expect(byType("form_start")[0].meta.open_id).toBe(id);
  expect(byType("form_error")[0].meta).toMatchObject({ open_id: id });
  expect(byType("form_error")[0].meta.reason).toMatch(/^validation:.*email/);
  expect(byType("form_close")[0].meta).toMatchObject({ open_id: id, started: true });
  expect(byType("form_submit")).toEqual([]);
  // No form contents are ever sent.
  expect(JSON.stringify(activity.batches)).not.toContain("Test Visitor");
});

test("Request a Rock: a successful submit is recorded and there's no close", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Request A Rock" }).click();
  await page.locator("#request-name").fill("Funnel Tester");
  await page.locator("#request-email").fill("funnel@example.com");
  await page.locator("#request-street").fill("1 Main St");
  await page.locator("#request-city").fill("Columbus");
  await page.locator("#request-state").selectOption({ index: 1 });
  await page.locator("#request-postal-code").fill("43004");
  await page.locator("#request-rocks").fill("2");
  await page.locator("#request-no-rush").check();
  await page.getByRole("button", { name: /submit|send/i }).click();
  await expect(page.getByText(/We've received your request/)).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await poll(() => ofType(activity.events(), "form_submit").length).toBe(1);
  expect(ofType(activity.events(), "form_submit")[0]).toMatchObject({
    targetId: "request_a_rock",
    meta: { rocks: 2 },
  });
  await page.waitForTimeout(500);
  expect(ofType(activity.events(), "form_close")).toEqual([]);
});

test("Share Your Rock opened from the floating button records its source", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Share Your Rock" }).click();
  await expect(page.getByRole("heading", { name: "Upload Your Rock" })).toBeVisible();
  await page.getByRole("button", { name: "Close form" }).click();
  await poll(() => ofType(activity.events(), "form_close").length).toBe(1);
  expect(ofType(activity.events(), "form_open")[0]).toMatchObject({
    targetId: "share_your_rock",
    meta: { source: "floating_button" },
  });
  expect(ofType(activity.events(), "form_close")[0].meta.started).toBe(false);
});

test("signing in and out is recorded", async ({ page }) => {
  const activity = collectActivity(page);
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill("user@example.com");
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByText("Sign out").click();
  await expect(page.getByLabel("Sign in to follow rocks")).toBeVisible();
  await poll(() => activity.events().map((e) => e.type)).toEqual(expect.arrayContaining(["sign_in", "sign_out"]));
});

test("the admin Activity page shows every panel, and the Dashboard links to it", async ({ page }) => {
  await signInAs(page, "admin");
  const errors = trackErrors(page);
  await page.goto("/admin");
  await expect(page.getByText("Today", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /See all activity/ }).click();
  await expect(page).toHaveURL(/\/admin\/activity$/);
  for (const title of [
    "Visitors", "Activity by Day", "Forms", "Rock Searches", "Rock Journeys", "Albums",
    "Music Listening", "Links Out", "Scroll Depth", "Top Lists",
  ]) {
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await expect(page.getByText("Couldn't load this.")).toHaveCount(0);
  await expect(page.getByText("Loading...")).toHaveCount(0);

  // Every range and both toggles load without errors.
  for (const range of ["7 days", "90 days", "This year", "All"]) {
    await page.getByRole("button", { name: range, exact: true }).click();
    await expect(page.getByText("Loading...")).toHaveCount(0);
  }
  await page.getByLabel("Include admins").check();
  await page.getByLabel("Include internal").check();
  await expect(page.getByText("Couldn't load this.")).toHaveCount(0);
  expect(errors).toEqual([]);
});
