// Site activity tracking (Site Tracking feature): records what happens on
// the public site as small events, sent in batches to POST /api/activity.
// See data/ai-build-docs/site-tracking/site-tracking-feature-plan.md.
//
// Ground rules (the plan's visitor-experience review):
// - Never in the way: nothing here is awaited, nothing blocks rendering or
//   navigation, and every failure is swallowed. The site works the same
//   with this blocked (ad blockers) or with storage unavailable.
// - Sends go through fetch, not axios, so a failed send is never itself
//   reported as a failed request.
// - /admin is never tracked.
//
// Visitor = device: a random id in localStorage. Visit = session: a random
// id that rolls over after 30 minutes without activity.
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const ENDPOINT = "/api/activity";
const SESSION_MS = 30 * 60 * 1000;
const FLUSH_MS = 5000;
const BATCH_SIZE = 20;
const KEEPALIVE_MAX_BYTES = 60000; // browsers cap keepalive bodies at 64 KB
const MAX_ERRORS_PER_PAGE = 30;
const PERF_DELAY_MS = 3000;
const SLOW_REQUEST_MS = 10000;
const TILE_REPORT_DELAY_MS = 3000;
const DEVICE_KEY = "ar_device_id";
const VISIT_KEY = "ar_visit";

// ---------------------------------------------------------------- storage
// localStorage can be missing or throw (private mode, blocked site data);
// fall back to memory so tracking still works for this page load.
const memory = {};
function load(key) {
  try {
    const value = window.localStorage.getItem(key);
    if (value != null) return value;
  } catch {
    // fall through to memory
  }
  return memory[key] ?? null;
}
function save(key, value) {
  memory[key] = value;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // memory only
  }
}

const isAdminPath = (path) => path === "/admin" || path.startsWith("/admin/");

// ------------------------------------------------------------ visit / queue
let queue = [];
let flushTimer = null;
let stopped = false; // the server said stop (429 / 400): quiet for this page load

function currentVisit() {
  const now = Date.now();
  let deviceId = load(DEVICE_KEY);
  const newDevice = !deviceId;
  if (newDevice) {
    deviceId = uuidv4();
    save(DEVICE_KEY, deviceId);
  }
  let visit = null;
  try {
    visit = JSON.parse(load(VISIT_KEY) || "null");
  } catch {
    visit = null;
  }
  if (!visit?.id || !(now - visit.last < SESSION_MS)) {
    const referrer = document.referrer;
    visit = {
      id: uuidv4(),
      landingPath: window.location.pathname,
      // Same-site referrers (a reload, another tab) aren't where they came from.
      referrer: referrer && !referrer.startsWith(window.location.origin) ? referrer : null,
      isReturning: !newDevice,
    };
  }
  visit.last = now;
  save(VISIT_KEY, JSON.stringify(visit));
  return { ...visit, deviceId };
}

function visitPayload(visit) {
  return {
    id: visit.id,
    deviceId: visit.deviceId,
    landingPath: visit.landingPath,
    referrer: visit.referrer,
    isReturning: visit.isReturning,
    screen: `${window.screen?.width}x${window.screen?.height}`,
    language: navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    clientVersion: __APP_VERSION__,
  };
}

// Leaving the page (pagehide / tab hidden / an outbound link): browsers
// drop a fetch started while the page unloads, even with keepalive, so
// these go by navigator.sendBeacon, which is made for exactly this. A
// beacon can't carry an Authorization header, so the sign-in token rides
// in the body ("auth") and the server reads it from there. Sent as
// text/plain (a beacon with a JSON content type isn't allowed everywhere).
function sendBeacon(body) {
  try {
    if (!navigator.sendBeacon) return false;
    return navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }));
  } catch {
    return false;
  }
}

function send(visit, events, { leaving = false } = {}) {
  const token = load("authToken");
  const payload = { visit: visitPayload(visit), events };
  if (leaving) {
    const beaconBody = JSON.stringify(token ? { ...payload, auth: token } : payload);
    if (beaconBody.length < KEEPALIVE_MAX_BYTES && sendBeacon(beaconBody)) return;
  }
  const body = JSON.stringify(payload);
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    fetch(ENDPOINT, {
      method: "POST",
      headers,
      body,
      credentials: "same-origin",
      keepalive: body.length < KEEPALIVE_MAX_BYTES,
    })
      .then((res) => {
        if (res.status === 429 || res.status === 400) stopped = true;
      })
      .catch(() => {});
  } catch {
    // fetch itself unavailable or threw: drop it
  }
}

// leaving: the page is going away (see sendBeacon above).
export function flush({ leaving = false } = {}) {
  clearTimeout(flushTimer);
  flushTimer = null;
  if (stopped || queue.length === 0) {
    queue = [];
    return;
  }
  const items = queue;
  queue = [];
  // A batch belongs to one visit; group in case a visit rolled over while
  // events were queued.
  const byVisit = new Map();
  for (const { visit, event } of items) {
    if (!byVisit.has(visit.id)) byVisit.set(visit.id, { visit, events: [] });
    byVisit.get(visit.id).events.push(event);
  }
  for (const { visit, events } of byVisit.values()) {
    for (let i = 0; i < events.length; i += BATCH_SIZE) send(visit, events.slice(i, i + BATCH_SIZE), { leaving });
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (window.requestIdleCallback) window.requestIdleCallback(flush, { timeout: 2000 });
    else flush();
  }, FLUSH_MS);
}

// Records one event. `path` defaults to the current page. Never throws.
export function track(type, { targetId = null, meta = null, path = window.location.pathname } = {}) {
  try {
    if (stopped || isAdminPath(path)) return;
    queue.push({ visit: currentVisit(), event: { id: uuidv4(), type, path, targetId, meta } });
    scheduleFlush();
  } catch {
    // tracking must never break the page
  }
}

// A fresh random id, e.g. for linking an open to its close (open_id).
export const newActivityId = () => uuidv4();

// ------------------------------------------------------------ timed views
// On-screen time for things that open and close (an album, a rock's
// journey, one photo, a song). Time in a background tab doesn't count,
// unless countHidden (music keeps playing in a background tab). When the
// page is left, onLeave runs so the view can send its close before the
// final flush.
const timers = new Set();

export function startTimed({ countHidden = false, onLeave = null } = {}) {
  const t = {
    ms: 0,
    since: countHidden || document.visibilityState === "visible" ? Date.now() : null,
    countHidden,
    onLeave,
  };
  timers.add(t);
  return {
    end() {
      if (!timers.has(t)) return t.ms;
      timers.delete(t);
      if (t.since != null) t.ms += Date.now() - t.since;
      t.since = null;
      return t.ms;
    },
  };
}

function pauseTimers() {
  const now = Date.now();
  for (const t of timers) {
    if (t.countHidden || t.since == null) continue;
    t.ms += now - t.since;
    t.since = null;
  }
}

function resumeTimers() {
  const now = Date.now();
  for (const t of timers) if (t.since == null) t.since = now;
}

function leaveTimers() {
  for (const t of [...timers]) {
    try {
      t.onLeave?.();
    } catch {
      // never block leaving
    }
  }
}

// Something that opens and closes: sends `openType` now and `closeType`
// (with engaged_ms and closeMeta()) when close() is called or the page is
// left, linked by meta.open_id. Both are recorded against the page it was
// opened on. close() is safe to call more than once.
export function openView(openType, closeType, { targetId = null, meta = {}, closeMeta = () => ({}) } = {}) {
  const openId = uuidv4();
  const path = window.location.pathname;
  track(openType, { targetId, path, meta: { ...meta, open_id: openId } });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    const ms = timer.end();
    let extra = {};
    try {
      extra = closeMeta() || {};
    } catch {
      extra = {};
    }
    track(closeType, { targetId, path, meta: { open_id: openId, engaged_ms: ms, ...extra } });
  };
  const timer = startTimed({ onLeave: close });
  return { openId, close };
}

// One slide at a time in a lightbox: show() ends the previous slide's
// viewing time and starts the next; end() on close. `type` is
// photo_view / journey_photo_view; baseMeta() is added to each.
export function createSlideTracker(type, baseMeta = () => ({})) {
  let current = null;
  const end = () => {
    if (!current) return;
    const { targetId, meta, timer } = current;
    current = null;
    track(type, { targetId, meta: { ...baseMeta(), ...meta, engaged_ms: timer.end() } });
  };
  return {
    show(targetId, meta = {}) {
      end();
      current = { targetId, meta, timer: startTimed({ onLeave: end }) };
    },
    end,
  };
}

// ------------------------------------------------------------------- pages
// One "page" per route change. page_leave carries the time the page was on
// screen since the last report (engaged_ms, background tabs excluded) and
// the furthest scroll, so it's sent on hide as well as on leaving.
let page = null; // { path, viewId, engagedMs, visibleSince, maxScroll, reportedScroll, untracked }
let skipPath = null;
// Errors already reported on this page (each one once), reset per page.
let pageErrors = new Set();

function scrollPct() {
  const doc = document.documentElement;
  const height = Math.max(doc.scrollHeight, document.body?.scrollHeight || 0);
  if (!height) return 100;
  return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / height) * 100));
}

function measureScroll() {
  if (page) page.maxScroll = Math.max(page.maxScroll, scrollPct());
}

function reportPage() {
  if (!page || page.untracked) return;
  const now = Date.now();
  if (page.visibleSince != null) {
    page.engagedMs += now - page.visibleSince;
    page.visibleSince = document.visibilityState === "visible" ? now : null;
  }
  measureScroll();
  // Hidden then closed: pagehide follows visibilitychange with nothing new.
  if (page.engagedMs === 0 && page.maxScroll === page.reportedScroll) return;
  page.reportedScroll = page.maxScroll;
  track("page_leave", {
    path: page.path,
    meta: { view_id: page.viewId, engaged_ms: page.engagedMs, max_scroll_pct: page.maxScroll },
  });
  page.engagedMs = 0;
}

function startPage(path) {
  const untracked = isAdminPath(path) || skipPath === path;
  skipPath = null;
  page = {
    path,
    viewId: uuidv4(),
    engagedMs: 0,
    visibleSince: document.visibilityState === "visible" ? Date.now() : null,
    maxScroll: 0,
    reportedScroll: null,
    untracked,
  };
  pageErrors = new Set();
  tileErrors = new Map();
  if (untracked) return;
  track("page_view", { path, meta: { view_id: page.viewId } });
  window.requestAnimationFrame?.(measureScroll);
}

// Called by the app on every route change (pathname only: query strings can
// hold tokens, e.g. /reset-password?token=...).
export function pageChanged(path) {
  try {
    if (page?.path === path) return;
    reportPage();
    startPage(path);
  } catch {
    // never break navigation
  }
}

// For redirect-only routes (/qr, the not-found catch-all): they record
// their own event, so the route itself isn't a page view. Must be called
// before the app's pageChanged for that path, i.e. from a child's effect.
export function skipPageView(path = window.location.pathname) {
  skipPath = path;
}

// ------------------------------------------------------------------ errors
const NOISE_RE = /ResizeObserver loop|Script error\.?$|^Non-Error promise rejection/i;
const EXTENSION_RE = /^(chrome|moz|safari(-web)?)-extension:/i;
// Scripts the Facebook/Instagram in-app browser injects (e.g. its
// navigation_performance_logger throwing on unload), matched anywhere in a stack.
const IN_APP_BROWSER_RE = /iabjs:\/\//i;
// Our code always runs from /assets/ (prod) or /src/, /node_modules/,
// /@vite/... (dev). A stack whose frames all point elsewhere -- usually the
// page URL itself, from a script an in-app browser or extension injected --
// isn't ours to fix.
const OWN_CODE_RE = /\/(assets|src|node_modules|@[\w-]+)\//;
function isForeignStack(stack) {
  const frames = typeof stack === "string" ? stack.match(/https?:\/\/[^\s()]+:\d+:\d+/g) : null;
  return !!frames && !frames.some((f) => OWN_CODE_RE.test(f));
}
const clip = (s, n) => (typeof s === "string" ? s.slice(0, n) : null);

function trackError(type, key, meta, targetId = null) {
  if (page?.untracked || pageErrors.size >= MAX_ERRORS_PER_PAGE || pageErrors.has(key)) return;
  pageErrors.add(key);
  track(type, { targetId, meta: { ...meta, app_version: __APP_VERSION__ } });
}

function onWindowError(event) {
  const message = event.message || event.error?.message || "";
  const source = event.filename || "";
  if (
    NOISE_RE.test(message) ||
    EXTENSION_RE.test(source) ||
    IN_APP_BROWSER_RE.test(`${source}\n${event.error?.stack || ""}`) ||
    isForeignStack(event.error?.stack)
  )
    return;
  trackError("client_error", `${message}|${source}|${event.lineno}`, {
    message: clip(message, 500),
    stack: clip(event.error?.stack, 2000),
    source: clip(source.split("?")[0], 300),
    line: event.lineno || null,
    col: event.colno || null,
  });
}

function onRejection(event) {
  const reason = event.reason;
  if (reason?.isAxiosError) return; // reported as load_error
  const message = reason?.message || String(reason ?? "");
  const stack = reason?.stack || "";
  if (NOISE_RE.test(message) || EXTENSION_RE.test(stack) || IN_APP_BROWSER_RE.test(stack) || isForeignStack(stack)) return;
  trackError("client_error", `rejection|${message}`, {
    message: clip(message, 500),
    stack: clip(reason?.stack, 2000),
    rejection: true,
  });
}

// API path as a pattern: /api/rock-posts/123 -> /api/rock-posts/:n
const apiPattern = (url = "") =>
  url.split("?")[0].replace(window.location.origin, "").replace(/\/\d+(?=\/|$)/g, "/:n").slice(0, 200);

let unloading = false;
// When the page last went to the background (performance.now() clock). A
// phone that locks or switches apps mid-request (e.g. iOS Safari) kills the
// connection, so the request fails with a network error that isn't ours.
let lastHiddenAt = null;

// A network error (no response) while offline, or for a request that was in
// flight when the page went to the background: the visitor's connection, not
// the site.
const isBackgroundNetworkError = (status, config) =>
  status === 0 &&
  (document.visibilityState === "hidden" ||
    navigator.onLine === false ||
    (lastHiddenAt != null && config?.activityStart != null && lastHiddenAt >= config.activityStart));

const isSameSiteApi = (url = "") => url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`);

// Adds X-Visit-Id to our own API calls, so a server error can be matched to
// the visitor's visit (and what they did just before). Same-origin /api/
// only, so it can never trigger a CORS failure elsewhere.
function onAxiosRequest(config) {
  try {
    config.activityStart = performance.now();
    if (isSameSiteApi(config.url) && !isAdminPath(window.location.pathname)) {
      const visitId = currentVisit().id;
      if (config.headers?.set) config.headers.set("X-Visit-Id", visitId);
      else config.headers = { ...config.headers, "X-Visit-Id": visitId };
    }
  } catch {
    // never block a request
  }
  return config;
}

function checkSlow(config, status) {
  const ms = config?.activityStart != null ? Math.round(performance.now() - config.activityStart) : 0;
  if (ms < SLOW_REQUEST_MS) return;
  const method = (config.method || "get").toUpperCase();
  track("slow_request", { targetId: apiPattern(config.url), meta: { method, status, duration_ms: ms } });
}

function onAxiosResponse(response) {
  try {
    checkSlow(response.config, response.status);
  } catch {
    // observing only
  }
  return response;
}

// Failed requests that matter to a visitor: no answer at all, any server
// error, a rate limit (429), too large (413), a timeout (408), or a rejected
// submit (400 on anything but a GET). 401/403/404 are normal app behavior
// (signed out, not allowed, an unknown rock) and aren't errors.
function isLoadError(status, method) {
  if (status === 0 || status >= 500) return true;
  if (status === 429 || status === 413 || status === 408) return true;
  return status === 400 && method !== "GET";
}

// Only observes: returns the original error unchanged, so every existing
// catch block, retry button and the 401 sign-out behave exactly as before.
function onAxiosError(error) {
  try {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED" || unloading) return Promise.reject(error);
    const status = error.response?.status ?? 0;
    const method = (error.config?.method || "get").toUpperCase();
    checkSlow(error.config, status);
    if (isLoadError(status, method) && !isBackgroundNetworkError(status, error.config)) {
      const target = apiPattern(error.config?.url);
      trackError("load_error", `${method}|${target}|${status}`, { method, status, code: error.code || null }, target);
    }
  } catch {
    // observing only
  }
  return Promise.reject(error);
}

// --------------------------------------------- crashes and shown errors
// The error boundary's crash (components/error-boundary/ErrorBoundary.jsx).
export function reportCrash(error, componentStack, where) {
  try {
    trackError("render_crash", `crash|${error?.message}`, {
      message: clip(error?.message || String(error), 500),
      stack: clip(error?.stack, 2000),
      component_stack: clip(componentStack, 1500),
      where: where || null,
    });
  } catch {
    // never make a crash worse
  }
}

// An error message or alert the visitor actually saw. `code` is a fixed
// short name for the spot (e.g. "signin"), so groups don't depend on the
// wording. Only our own message text is sent, never what they typed.
export function reportShownError(code, message) {
  try {
    trackError("error_shown", `shown|${code}|${message}`, { message: clip(String(message ?? ""), 300) }, code);
  } catch {
    // tracking must never break the page
  }
}

// ------------------------------------------------- broken photos/videos
// One capture-phase listener catches every <img>/<video>/<audio>/<source>
// that fails to load, site-wide. It only observes. Leaflet map tiles are
// collapsed to one event per page per tile server, with a count.
let tileErrors = new Map(); // host -> { count }

function onResourceError(event) {
  try {
    // Leaving the page cancels loads still in progress, and some browsers
    // (Android Chrome) report those as errors. Mobile browsers often only
    // send visibilitychange (not pagehide) when a tab is closed or switched
    // away from, so a hidden page counts as leaving too.
    if (unloading || document.visibilityState === "hidden") return;
    const el = event.target;
    if (!el || el === window || !el.tagName) return;
    const tag = el.tagName.toLowerCase();
    if (!["img", "video", "audio", "source"].includes(tag)) return;
    const src = el.currentSrc || el.src || "";
    if (!src || /^(data|blob):/.test(src)) return;
    const url = new URL(src, window.location.href);

    if (el.classList?.contains("leaflet-tile")) {
      const entry = tileErrors.get(url.host);
      if (entry) {
        entry.count += 1;
      } else {
        const fresh = { count: 1 };
        tileErrors.set(url.host, fresh);
        setTimeout(() => track("map_tile_error", { targetId: url.host, meta: { count: fresh.count } }), TILE_REPORT_DELAY_MS);
      }
      return;
    }

    const kind = tag === "img" ? "image" : tag === "source" ? el.parentElement?.tagName?.toLowerCase() || "video" : tag;
    const target = url.origin === window.location.origin ? url.pathname : `${url.host}${url.pathname}`;
    const where = el.closest?.("[data-activity-where]")?.dataset.activityWhere || window.location.pathname;
    trackError("media_error", `media|${target}`, { kind, where }, clip(target, 200));
  } catch {
    // observing only
  }
}

// ------------------------------------------------------------ page speed
let perfSent = false;
let lcpMs = null;

function sendPerf() {
  if (perfSent) return;
  perfSent = true;
  try {
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    if (!nav) return;
    const ms = (v) => (v > 0 ? Math.round(v) : null);
    const firstPath = new URL(nav.name).pathname;
    track("page_perf", {
      path: firstPath,
      meta: {
        ttfb_ms: ms(nav.responseStart),
        dom_ready_ms: ms(nav.domContentLoadedEventEnd),
        load_ms: ms(nav.loadEventEnd),
        lcp_ms: ms(lcpMs),
        app_version: __APP_VERSION__,
      },
    });
  } catch {
    // no timing API
  }
}

function watchPerf() {
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      lcpMs = entries[entries.length - 1]?.startTime ?? lcpMs;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // LCP unsupported (Safari < 17): send without it
  }
  const later = () => setTimeout(sendPerf, PERF_DELAY_MS);
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
}

// ------------------------------------------------------- outbound links
function onLinkClick(event) {
  try {
    const link = event.target?.closest?.("a[href]");
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    const where =
      link.closest("[data-activity-where]")?.dataset.activityWhere || window.location.pathname;
    if (url.protocol === "mailto:") {
      track("outbound_click", { targetId: "mailto", meta: { href: "mailto", where } });
    } else if (/^https?:$/.test(url.protocol) && url.origin !== window.location.origin) {
      track("outbound_click", {
        targetId: url.hostname.replace(/^www\./, ""),
        meta: { href: clip(url.origin + url.pathname, 500), where },
      });
    } else {
      return;
    }
    flush({ leaving: true }); // a beacon; the link opens normally, nothing waits on this
  } catch {
    // never block a click
  }
}

// ---------------------------------------------------------------- set-up
let initialized = false;

export function initActivity() {
  if (initialized) return;
  initialized = true;
  try {
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onRejection);
    axios.interceptors.request.use(onAxiosRequest);
    axios.interceptors.response.use(onAxiosResponse, onAxiosError);
    window.addEventListener("error", onResourceError, true);

    document.addEventListener("click", onLinkClick, true);
    document.addEventListener("auxclick", onLinkClick, true);

    let scrollQueued = false;
    window.addEventListener(
      "scroll",
      () => {
        if (scrollQueued) return;
        scrollQueued = true;
        window.requestAnimationFrame(() => {
          scrollQueued = false;
          measureScroll();
        });
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        lastHiddenAt = performance.now();
        pauseTimers();
        // pagehide (which can come first) has already reported this page.
        if (!unloading) {
          sendPerf();
          reportPage();
        }
        flush({ leaving: true });
      } else {
        resumeTimers();
        if (page) page.visibleSince = Date.now();
      }
    });
    window.addEventListener("pagehide", () => {
      unloading = true;
      sendPerf();
      leaveTimers(); // open albums / journeys / songs send their close
      reportPage();
      flush({ leaving: true });
    });
    // Restored from the back/forward cache: a fresh view of the same page.
    window.addEventListener("pageshow", (event) => {
      unloading = false;
      if (event.persisted && page) startPage(page.path);
    });

    watchPerf();
  } catch {
    // tracking must never break the page
  }
}
