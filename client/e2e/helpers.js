// Shared helpers for the Playwright suite. Seed data and accounts come from
// server/tests/fixtures/seed.sql (password for every seeded account below).
import { expect } from "@playwright/test";

export const PASSWORD = "Test-Passw0rd!";
export const ACCOUNTS = {
  admin: "admin@example.com",
  user: "user@example.com",
};
export const MAILPIT = "http://localhost:8026";

// Signs in through the real API and drops the token where AuthContext
// looks for it, before any page script runs.
export async function signInAs(page, role) {
  const res = await page.request.post("/api/auth/login", {
    data: { email: ACCOUNTS[role], password: PASSWORD },
  });
  expect(res.ok(), `login as ${role}`).toBeTruthy();
  const { token } = await res.json();
  await page.addInitScript((t) => window.localStorage.setItem("authToken", t), token);
}

// Collects uncaught page errors and console errors, ignoring network noise
// from outside the app (map tiles, fonts) and expected 4xx probes.
export function trackErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/Failed to load resource|tile\.openstreetmap|fonts\.g|ERR_|net::/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

export async function latestMailTo(request, to) {
  for (let i = 0; i < 50; i++) {
    const res = await request.get(`${MAILPIT}/api/v1/messages?limit=50`);
    const { messages = [] } = await res.json();
    const hit = messages.find((m) => m.To.some((r) => r.Address === to));
    if (hit) return (await request.get(`${MAILPIT}/api/v1/message/${hit.ID}`)).json();
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no mail to ${to}`);
}

// Site activity: every batch / event the page sends to /api/activity, read
// from the outgoing requests (Site Tracking).
// Normal sends are read from the request; sends made on the way out of a
// page go by navigator.sendBeacon, whose body Playwright doesn't expose,
// so those are copied out from inside the page.
export function collectActivity(page) {
  const batches = [];
  page.on("request", (req) => {
    const body = req.postData();
    if (req.method() === "POST" && req.url().endsWith("/api/activity") && body) {
      batches.push(JSON.parse(body));
    }
  });
  page.exposeFunction("__activityBeacon", (body) => batches.push(JSON.parse(body))).catch(() => {});
  page
    .addInitScript(() => {
      const send = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = (url, data) => {
        if (String(url).endsWith("/api/activity") && data?.text) {
          data.text().then((t) => window.__activityBeacon?.(t)).catch(() => {});
        }
        return send(url, data);
      };
    })
    .catch(() => {});
  return {
    batches,
    events: () => batches.flatMap((b) => b.events || []),
  };
}

export const ofType = (events, type) => events.filter((e) => e.type === type);
