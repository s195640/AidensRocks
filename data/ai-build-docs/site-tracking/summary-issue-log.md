# Site Tracking — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase. The plan is `site-tracking-feature-plan.md` in this folder.

## Planning (2026-10-16), 0.15.0 → 0.15.10

Planned and reviewed with the user over several rounds; every decision is recorded in the plan. Two changes shipped during planning:
- **Email links** carry `&from=email-follow` / `&from=email-response` (`server/src/utils/buildRockJourneyLinkTag.js`, `buildRockNumbersWithLinksTag.js`). The page ignores the parameter until phase 3 reads it.
- **Admin pages are lazy-loaded** (`client/src/App.jsx`), found in the visitor-experience review. See `data/ai-build-docs/visitors-by-day/summary-issue-log.md` Phase 1.2.

## Phase 1 — Tables, ingest and the site-wide tracker (2026-10-16), 0.15.11
**Status:** Complete

**Files changed:**
- New:
  - `data/sql/migrations/add_site_tracking_tables.sql`
  - `server/src/routes/activity.js`, `server/src/utils/activity/requestInfo.js`
  - `server/tests/api/activity.test.mjs`
  - `client/src/utils/activity.js`
  - `client/e2e/activity.spec.js`
  - this file
- Changed:
  - SQL: `data/sql/createdb.sql`, `droptables.sql`, `pglogical.sql`
  - Server: `server/src/app.js`, `server/src/middleware/publicFormLimiter.js`, `server/tests/api/auth-matrix.test.mjs`
  - Client: `client/src/main.jsx`, `client/src/App.jsx`, `client/src/components/qrredirect/QRRedirect.jsx`, `notfoundredirect/NotFoundRedirect.jsx`, `footer/Footer.jsx`, `contact-popup/ContactPopup.jsx`
  - Build: `client/vite.config.js`, `client/vite.e2e.config.js`, `client/.eslintrc.cjs`, `data/docker/docker-client-prod`
  - `VERSION`

**Summary:**
- **Tables:**
  - `visit` and `site_event`, insert-only, with browser-generated UUID keys.
  - `visit.client_version` is included now.
  - The error tables (`server_error`, `error_group`) come with phase 2 in their own migration.
- **`POST /api/activity`:**
  - It has its own `activityLimiter` (1,500 per 15 minutes per IP), then `optionalAuth`.
  - It validates the batch: a UUID visit and device, at most 50 events, an allow-list of types, capped strings, and meta capped at 4,000 characters (otherwise replaced with `{ truncated: true }`).
  - It answers `204` and inserts afterwards in one transaction (visit `ON CONFLICT DO NOTHING`, then the events).
  - The server sets the IP, location (`geoip-lite`), platform, `is_internal`, `account_id` and `is_admin`. Bots and an empty user agent get `204` and are dropped.
- **`is_internal`** is true for a private or loopback IP, or for an `Origin` whose host isn't `PUBLIC_SITE_URL`'s (`www.` ignored).
- **Client tracker (`client/src/utils/activity.js`):**
  - **IDs:** device ID and a 30-minute visit in `localStorage`, falling back to memory.
  - **Sending:** a queue flushed every 5 seconds on idle and on hide or `pagehide`, using `fetch` with `keepalive` (batches of 20, `keepalive` only under 60 KB). It stops for the page on a 429 or 400. Every path is wrapped so it can't throw into the app.
  - **Pages:** `page_view` / `page_leave` per route (pathname only), linked by `view_id`. `page_leave` reports on-screen time since the last report plus the furthest scroll, and is sent on hide as well as on leaving. A page restored by Back counts as a new view.
  - **`page_perf`:** sent once per visit, from Navigation Timing plus Largest Contentful Paint.
  - **Basic errors:** `client_error` from `window` error / `unhandledrejection` (noise and extensions filtered, each once per page, at most 30 per page). `load_error` from an observe-only axios interceptor for network errors and 5xx, ignoring cancels and anything after `pagehide`, with `targetId` set to the API path pattern.
  - **Outbound clicks:** one capture-phase click listener for links leaving the site and `mailto:`. `where` comes from the nearest `data-activity-where` (footer, contact popup), otherwise the page path.
  - **Other events:** `contact_open` (Footer), `qr_scan` with the rock number (QRRedirect), `not_found` with `full_url` (NotFoundRedirect).
  - `/admin` is never tracked.
- **App version:** `__APP_VERSION__` is baked in at build time from the repo `VERSION` (Vite `define`). The prod client Dockerfile now copies `VERSION` to `/VERSION` so the build can read it.

**Deviations from plan:**
1. **Names:**
   - `client/src/utils/activity.js` instead of `track.js`, for consistency with the ad-blocker-safe `/api/activity`.
   - There's no `<SiteTracker />` component: `initActivity()` runs in `main.jsx` (listeners before first render), and `pageChanged()` is called from `AppContent`'s own effect. Being in the parent is what lets `/qr` and the not-found redirect mark their path "not a page view" first, since child effects run before the parent's.
2. **`page_view` meta is `{ view_id }`, not `{ title }`:** the site has no per-page titles. The query string is never sent, because `/reset-password?token=…` and `/verify-email?token=…` carry tokens.
3. **No `meta.client_ts`:** `created_at` (server receive time) is the only timestamp. With the 5-second batching and the flush on hide, that's accurate enough for visit length, and it saves bytes on every event.
4. **`/qr` and the not-found catch-all aren't page views:** they record `qr_scan` / `not_found` instead, so "top pages" doesn't fill with redirects and mistyped URLs.
5. **The error fingerprint isn't computed yet:** that's phase 2, along with grouping.

**Issues/gotchas encountered:**
- **Effect order:** the page view has to be recorded by the parent (`AppContent`), not a sibling component, for the redirect skip to work.
- **The e2e contact popup's overlay** covers the footer links, so the test clicks the outbound link first.

**Tests:**
- 7 new API tests (`activity.test.mjs`) and `/api/activity` in the auth matrix.
- 8 new browser tests (`activity.spec.js`), including the site working normally with `/api/activity` blocked and with storage throwing.
- Full regression passes: lint, 394 API tests and 54 browser tests.
- Bundle size: the public download went from 776.6 KB to 779.3 KB gzipped (+2.7 KB, the tracker plus `uuid`), within the plan's "a few KB" rule.

**To deploy:** see `DEPLOY.md` in this folder. The original instructions here were wrong for two-way replication; corrected in 0.15.13.

## Phase 2 — Error tracking (2026-10-16), 0.15.12
**Status:** Complete

**Files changed:**
- New:
  - SQL: `data/sql/migrations/add_error_tracking_tables.sql`
  - Server: `server/src/middleware/errorCapture.js`; `server/src/utils/errors/{fingerprint,errorGroups,errorEmails,recordServerError,resolveStack,log}.js`; `server/src/utils/{scheduledJobs,statsRange}.js`; `server/src/routes/siteHealthAdmin.js`
  - Tests: `server/tests/api/error-tracking.test.mjs`
  - Client: `client/src/components/error-boundary/ErrorBoundary.{jsx,module.css}`, `client/src/utils/useShownError.js`, `client/src/admin/components/site-health/SiteHealth.{jsx,module.css}`
  - Deploy: `data/docker/client-entrypoint/40-copy-sourcemaps.sh`
- Changed:
  - SQL: `createdb.sql`, `droptables.sql`, `pglogical.sql`
  - Server: `app.js`, `routes/activity.js`, `routes/statistics.js` (range helper moved to `utils/statsRange.js`), `utils/sendEmail.js`, `utils/emailTemplates.js`, `utils/emailSlugs.js`, `utils/rock-upload/processImagesInBackground.js`, `package.json` (+ `source-map`), `tests/api/auth-matrix.test.mjs`
  - Client: `utils/activity.js`, `App.jsx`, `components/footer/Footer.jsx`, `pages/map/Map.jsx`, `adminContent/emailTemplates.js`, `admin/pages/admin/Admin.{jsx,module.css}`, `vite.config.js`, `e2e/activity.spec.js`
  - Error messages: `AllRocks`, `PhotoAlbum`, `EntryDetailView`, `SignIn`, `SignUp`, `ForgotPassword`, `ResetPassword`, `VerifyEmail`, `FollowRocks`, `ContactReqestRocks`, `UploadRockForm`, `TrackTheRocks`
  - Deploy: `data/docker/docker-client-prod`, `data/docker-compose/docker-compose-prod.yml`, `data/nginx/nginx.conf`
  - `VERSION`

**Summary:**
- **Crash screen:** `ErrorBoundary` wraps three places:
  - **The routes:** full "Something went wrong" screen with Reload and a Home link. It resets when the route changes.
  - **The map:** a small inline notice in place of the map.
  - **The music player:** hidden, so a broken player quietly disappears.
  - Every crash records `render_crash` with React's component stack.
- **Browser capture (`client/src/utils/activity.js`):**
  - `error_shown` through `useShownError(code, message)` at 15 spots across 12 components, plus `reportShownError` for the Track the Rocks alert.
  - `media_error` from one capture-phase listener. Leaflet tiles are collapsed to one `map_tile_error` per page per host, with a count.
  - `load_error` now also covers 429, 413, 408 and a 400 on a non-GET.
  - `slow_request` for anything over 10 seconds.
  - `X-Visit-Id` on same-origin `/api/` calls.
- **Server capture:**
  - **5xx responses:** `errorCapture` gives each request an AsyncLocalStorage store and wraps `console.error` to remember the last Error logged. When the response finishes with a 5xx, that error is recorded with Express's route pattern. No route handler was changed.
  - **Other failures:** the global error handler, `unhandledRejection`, `sendEmail` failures, and `processImagesInBackground` failures all record explicitly.
- **Grouping:**
  - The server computes the fingerprint (`utils/errors/fingerprint.js`). `error_group` holds status, `fixed_in_version`, `last_alerted_at` and a note.
  - Counts, visitors, pages, platforms and versions are computed in SQL at read time.
  - Marking a group Fixed records the version. If it happens again, it goes back to New.
- **Alerts:**
  - `error-new-email` is sent when a group is created or reopened, at most once per 24 hours per group (claimed with an `UPDATE ... RETURNING` before sending).
  - `error-daily-summary-email` comes from `scheduledJobs.js`. It runs only with `RUN_SCHEDULED_JOBS=true`, at `DAILY_SUMMARY_HOUR` (default 8) in `SITE_TIMEZONE` (default America/New_York). It's claimed per day in the `setting` table and sent only if there were errors.
  - Both are Page Details templates (Send To etc., seeded like the upload failure emails: failures@aidensrocks.com). Internal traffic never alerts. Alert send failures are logged, not recorded, so they can't loop.
- **Readable stacks:**
  - `build.sourcemap: "hidden"`. The prod Dockerfile moves the `.map` files out of the web root into `/sourcemaps/<version>/assets`.
  - The client container's entrypoint script copies them into the `volume-sourcemaps` volume, which the server mounts read-only at `/app/sourcemaps`. nginx returns 404 for `*.map` as a safety net.
  - `resolveStack` maps frames with `source-map`, caching six maps. Verified locally: a minified frame resolved to `src/utils/activity.js:293`.
- **Site Health panel:** on the dashboard second in the left column (mobile order renumbered).
  - Range, Include admins and Include internal controls.
  - Error groups, new first. Clicking one opens its occurrences: time, page, device, version, account, message, component stack, resolved stack, and the visitor's last 10 events, with New / Known / Fixed buttons.
  - Slow requests, and page load speed (median and slowest 10%) by device.

**Deviations from plan / decisions made in the build:**
1. **Extra columns:** `server_error` also has `is_admin` / `is_internal`, so the dashboard's two toggles filter server errors the same way as browser ones.
2. **Browser fingerprints use the file, not the function:** minified function names change every build, so they'd split one bug into a new group each release. The build hash is stripped from file names for the same reason.
3. **Broken media is grouped by folder:** `/media/albums/Trip/webp/*` is one group per kind and folder, so 40 broken photos in an album are one item, not 40. The occurrences still show each file.
4. **Upload-processing failures don't send a new-error email:** they're recorded and grouped, but they already send their own Upload Failed emails, so a second email would be a duplicate. Follower-notification failures do alert.
5. **The new-error email fires only on first appearance or a comeback after Fixed:** a group that stays New doesn't re-alert every day, because the daily summary lists it.
6. **Slow requests aren't error groups:** they're listed separately and never alert.
7. **Summary time defaults:** 8 AM, America/New_York, both set by env vars. **To confirm with the user.**

**Issues/gotchas encountered:**
- **A pg parameter used as both `varchar` (status column) and in a `CASE` comparison** gave "inconsistent types deduced for parameter". Fixed with explicit `::varchar`.
- **The e2e `/api/albums/` route needed a regex:** the call is `/api/albums/?tag=...`.
- **Real finding in the test environment:** `media_error` caught `/media/music/1/song.mp3` failing to load (the seed has no audio file). That's harmless in tests, but it shows the capture works on the music player too.

**Tests:**
- 15 new API tests (`error-tracking.test.mjs`): grouping, fixed -> new, email on new, the 24-hour throttle, internal traffic never alerting, 5xx capture through the real middleware, the Site Health endpoints and filters, and the daily summary.
- 5 Site Health routes in the auth matrix.
- 4 new browser tests: the crash screen (shows, records, clears on navigation), shown messages, broken images and 429s but not 404s, and `X-Visit-Id`.
- Full regression passes: lint, 424 API tests and 58 browser tests. The phase 1 oversized-meta test now expects the added `fingerprint`.
- Bundle: 779.3 KB to 780.9 KB gzipped (+1.6 KB). The source maps aren't part of what visitors download.

**To deploy:** see `DEPLOY.md` in this folder (corrected in 0.15.13).

## Migration fix — two-way replication (2026-10-16), 0.15.13
**Status:** Complete. Found by the user.

**Problem:**
- **Data on both nodes:** `add_error_tracking_tables.sql` mixed schema with data changes (an `INSERT` and an `UPDATE` of `page_content` for the two alert templates), and its instructions said to run the file on both nodes. `page_content` replicates in both directions, so running the data part on both nodes would have created the same rows twice and conflicted.
- **Registration on one node:** both new migrations also said to register the new tables in the replication set on the "provider node only", wording copied from an older migration. With two-way replication, each node only sends changes for tables in its own set. The new tables are written on whichever node handles the request, so registration is needed on both. The 0.12 runbook (`email-senders-and-site-settings/DEPLOY.md`) already checks for the tables "on each node".

**Fix:**
- **Both migrations now use the repo's labelled-parts pattern**, from `add_email_sender_columns.sql`:
  - **PART 1:** schema, on both nodes.
  - **PART 2:** replication-set registration, on both nodes (no longer commented out).
  - **PART 3:** data, on one node only. Only `add_error_tracking_tables.sql` has one.
- **New `DEPLOY.md` runbook:** pre-checks, the order, per-step verification queries on both nodes, env, code, smoke checks and rollback. It also has notes on what the new tables do under two-way replication: inserts use UUID keys, and `error_group`'s rare insert race could at worst send a new-error email twice.
- `createdb.sql` (single-node fresh install, used by the tests) is unchanged.
- The older migrations that still say "provider only" (e.g. `add_unmatched_path_hit_table.sql`) were left as they are: they're already applied.

## Migrations as numbered step files (2026-10-16), 0.15.14
**Status:** Complete. Requested by the user, to make running migrations on the two servers foolproof.

- **New folder:** the two combined files (`add_site_tracking_tables.sql`, `add_error_tracking_tables.sql`) were replaced by `data/sql/migrations/0.15-site-tracking/`, one file per step:
  - `01_bothservers_create_site_tracking_tables.sql`: schema only
  - `02_bothservers_create_error_tracking_tables.sql`: schema only
  - `03_bothservers_add_tables_to_replication.sql`: replication set only
  - `04_oneserver_add_error_email_templates.sql`: data only, Node A only
- **The name says where it runs:** `NN_bothservers_<desc>.sql` or `NN_oneserver_<desc>.sql`. Each step is finished on its server(s) before the next starts. Each file's header repeats the rule.
- **Updated to match:** `DEPLOY.md` steps 2-5 now run the files in order, with a check query after each. The `createdb.sql` comments and the plan point to the folder. `createdb.sql`'s content is unchanged.

## Phase 3 — What visitors do (2026-10-16), 0.15.15
**Status:** Complete

**Files changed:**
- New:
  - `client/src/utils/useTypedSearch.js`, `useFormFunnel.js`
  - `client/src/components/rock-journey/JourneyActivityContext.js`
  - `client/e2e/activity-events.spec.js`
- Changed:
  - `client/src/utils/activity.js`: `startTimed` / `openView` / `createSlideTracker` / `newActivityId`, and beacons on exit
  - Music: `ar-audio-player/PlayCountTracker.jsx`, `CustomCloseComponent.jsx`
  - Rock journeys: `rock-map/rock-journey-dialog/RockJourneyDialog.jsx`, `rock-map-popup/RockMapPopup.jsx`, `rock-journey/RockJourney.jsx`, `rock-collection/RockCollection.jsx`, `rock-table/RockTable.jsx`
  - Search and the map: `rock-map/RockMap.jsx`, `pages/track-the-rocks/TrackTheRocks.jsx`
  - Albums: `photo-album/PhotoCollection.jsx`
  - Honoring Aiden: `pages/honoring-aiden/EntryDetailView.jsx`
  - Forms: `upload-rock-form/UploadRockForm.jsx`, `contact-request-rocks/ContactReqestRocks.jsx`, `floating-rock-link/FloatingRockLink.jsx`, `adminContent/UploadRockModalProvider.jsx`, `adminContent/components/UploadRockButton.jsx`, `UploadRockLinkTrigger.jsx`, `pages/share-your-rock/ShareYourRock.jsx`
  - My Rocks: `pages/follow-rocks/FollowRocks.jsx`
  - Accounts: `pages/account/SignIn.jsx`, `SignUp.jsx`, `SignOut.jsx`
  - Tests: `client/e2e/helpers.js` (`collectActivity` / `ofType` moved here), `client/e2e/activity.spec.js`
  - Server: `server/src/routes/activity.js` (27 new types allowed, beacon bodies), `server/tests/api/activity.test.mjs`
  - `VERSION`

**Summary:**
- **Music:**
  - `PlayCountTracker` (still the only place a play is counted) now sends `song_play` with a `play_id`, then exactly one `song_stop`.
  - `song_stop` carries `listened_ms` (wall time while playing, paused time excluded, background-tab time counted), `duration_ms` and `completed` (the audio `ended` event, or the position within a second of the end).
  - It also carries `reason`: `pause`, `skip`, `ended`, `close` (player unmounted) or `leave` (page left).
  - Closing the player also sends `player_close`.
- **Rock journeys:**
  - `RockJourneyDialog` sends `rock_view` / `rock_close` (with `engaged_ms`) through `openView`. `source` is `search`, `link`, `map_pin` or `my_rocks`.
  - `JourneyActivityContext` gives the stops inside the dialog its `open_id`. Stops shown straight in the Track the Rocks list have `source: "list"` and no `open_id`.
  - `RockCollection` sends `journey_location` / `journey_comment` (with `rps_key`), and `journey_photo_view` per full-screen photo or video, timed per slide through the lightbox's `on.view`.
- **Searches and links:**
  - Track the Rocks' Search sends `rock_search`, and a `?rock=` link sends `rock_link` with `from`. `found` comes from `RockMapPopup`'s new `onResult` once the rock has loaded.
  - The map's two live boxes send `rock_search` through `useTypedSearch` (1.5 s idle or on blur, empty values and repeats skipped). A pin click sends `map_pin`.
  - My Rocks' box sends `my_rocks_search` with the result count.
- **Albums:** `PhotoCollection` sends `album_open` / `album_close` (`photos_viewed`), with `page` set to `photos` or `birthdays`, and `photo_view` per photo.
- **Honoring Aiden:** `entry_view` fires from the same once-per-session trigger as the existing `view_count` bump.
- **Forms:**
  - Both forms use `useFormFunnel`: `form_open` (with source), `form_start` (the first change, via `onChangeCapture` on the form's outer element), `form_submit`, `form_error` (`validation:<fields>` / `server_<status>` / `network`), and `form_close` (if not submitted).
  - **Sources:**
    - Share Your Rock: `floating_button` (`?openUpload=1`), `page_button`, `page_link`. `UploadRockModalProvider.open(source)` ignores the click event that `onClick={open}` would pass.
    - Request a Rock: `floating_button`, `upload_form`.
  - No form contents are ever sent. A test checks this.
- **Following and accounts:**
  - My Rocks sends `follow` / `unfollow` (`where: my_rocks`) and `follow_notify` (`on`).
  - The account pages send `sign_up` (after the server accepts it), `sign_in` (on success) and `sign_out`.
- **Missed in phase 2:** `RockTable`'s "Couldn't load rocks" now reports `error_shown` (`rocktable_load`).

**Bug found and fixed: exit sends never arrived**
- **Found:** an e2e test showed that events queued just before leaving (page leave, album / journey closes, song stops, an outbound click) never reached the server.
- **Traced:** `pagehide` fired and the tracker called `fetch(..., { keepalive: true })` with the right events, but the browser dropped the request while the page unloaded. The server stored nothing.
- **Fix:** exit sends (`pagehide`, the tab hidden, outbound clicks) now go by `navigator.sendBeacon`, as a `text/plain` JSON body. A beacon can't set headers, so the sign-in token goes in the body (`auth`). The server's activity route parses `text/plain` and moves `auth` into the Authorization header before `optionalAuth`, then removes it. Normal 5-second sends are unchanged.
- **Verified:** closing the tab with events queued now delivers them. Checked in the test database: `contact_open`, then `page_leave /`.
- **Harness limit:** Playwright can't observe beacons sent by a page it navigates away from with `page.goto`, so the e2e tests use in-app navigation for those paths. The beacon itself is covered by an API test (text/plain body, token in the body, `is_admin` set, `auth` not stored).
- **Also fixed:** after `pagehide`, the visibility handler sent a second, empty `page_leave`. It no longer re-reports a page `pagehide` already reported.

**Deviations from plan:**
1. **No `player_open`:** the music player is always shown at the bottom of the page; there's nothing to open. `player_close` is there.
2. **`song_stop` reasons:** if the player is closed mid-song, the stop may read `pause` (the close button pauses first) followed by `player_close`, rather than `close`.
3. **`rock_view` has no `all_rocks` source:** All Rocks shows rock photos in a lightbox, not the journey dialog.
4. **`entry_view` matches the existing counter:** once per session per entry. Every visit to an entry is already a `page_view`.

**Not covered by a browser test:**
- **Music listening:** the test seed has no audio file (see phase 2's "real finding"), so the player can't play in tests. `PlayCountTracker` was checked by lint and build only. **Verify by hand:** play, pause and skip a song, then check `song_play` / `song_stop` rows.
- **Following:** follow, unfollow, the notify switch and the My Rocks search box, wired in `FollowRocks.jsx`. Lint and build only.

**Tests:**
- **API:** 2 new tests: every type the site sends is accepted, and a beacon with the token in the body.
- **Browser:** 8 new tests (`activity-events.spec.js`):
  - a rock search plus a journey location open, linked by `open_id`, then the close with its time
  - a shared link, found and not found, with `from`
  - one map search from typing, and a pin click opening the journey
  - an album and a photo with times
  - Request a Rock abandoned (open, start, validation error, close, and no form contents sent)
  - Request a Rock submitted (no close)
  - the Share Your Rock source
  - sign in and sign out

**Regression (phase 3):**
- Lint passes, and all 426 API tests pass.
- Browser tests: 65 of 66 passed. The one failure was phase 1's outbound-click test.
  - **Cause:** outbound clicks now go by beacon, and Playwright reports a beacon as a `ping` request with no body, so the helper read it as empty. The event itself was sent.
  - **Fix:** `collectActivity` (`client/e2e/helpers.js`) also copies beacon bodies out from inside the page, by wrapping `navigator.sendBeacon` with an init script and `exposeFunction`.
- **After the fix:** all 20 activity browser tests pass. The other 46 browser tests don't use the helper; they passed in the full run.
- **Bundle:** 780.9 KB to 783.2 KB gzipped (+2.4 KB).

## Phase 4 — The Activity page (2026-10-16), 0.15.16
**Status:** Complete

**Decision (asked and answered):** the panels go on a **new Admin → Activity page** with one shared filter bar, not on the Dashboard (10 panels would make it very long). The Dashboard gets a small "Today" row linking to it. Site Health stays on the Dashboard.

**Files changed:**
- New:
  - Server: `server/src/routes/activityAdmin.js`, `server/src/utils/activityFilters.js`, `server/tests/api/activity-admin.test.mjs`
  - Client: `client/src/admin/pages/activity/ActivityAdmin.{jsx,module.css}`; `client/src/admin/components/activity/{activityUi.jsx,ActivityPanels.jsx,Activity.module.css,TodayGlance.jsx,TodayGlance.module.css}`
- Changed:
  - Server: `routes/siteHealthAdmin.js` (uses the shared filters), `app.js`, `tests/api/auth-matrix.test.mjs` (11 routes)
  - Client: `App.jsx` (lazy route + "Activity" nav item after Dashboard), `admin/pages/admin/Admin.jsx` (Today row), `e2e/activity-events.spec.js`
  - `VERSION`

**Summary:**
- **Server:** `/api/admin/activity/*`, all admin-only.
  - **Panels:** `visitors`, `activity`, `forms`, `albums`, `searches`, `journeys`, `music`, `outbound`, `scroll`, `top`, and `glance` for the Dashboard.
  - **Filters:** every panel takes range / tz / includeAdmins / includeInternal through `activityFilters` (moved out of Site Health). Each one aggregates in SQL over a shared `ev` CTE (events joined to their visit, filtered), and per-day rows are zero-filled.
  - **Visit length:** last event minus visit start, with one-event visits left out of the averages. Time on screen is the sum of `page_leave.engaged_ms`.
  - **Form funnel:** one row per `open_id`; abandoned = opened with no submit. **Scroll depth:** each page view's several `page_leave`s are combined first. **Music:** listen-through is capped at 100% per play.
- **Activity page:** a sticky filter bar (range, Include admins, Include internal, refresh), then the panels in two columns on wide screens and one on phones:
  - **Visitors:** tiles (visitors, visits, page views, avg visit length, avg time on screen, % returning), a Visitors vs Visits line chart, and visitors by device.
  - **Activity by Day:** the chart that started this feature. Song plays, Honoring Aiden reads, QR scans and bad links, one line each.
  - **Forms:** opened / started / submitted / abandoned / gave up after typing / submit rate per form, submitted vs abandoned by day (stacked), where each form was opened from, and why submits were rejected.
  - **Rock Searches:** by rock, with how it was searched, link opens (from email), and found. A separate list shows searches that found nothing.
  - **Rock Journeys:** per rock: opens, visitors, avg time, photos, locations, comments, and where it was opened from.
  - **Albums:** per album, plus the most viewed photos.
  - **Music Listening:** per song: plays, listeners, avg listened, listened %, finished %, skips.
  - **Links Out:** clicks per link, plus Contact opens.
  - **Scroll Depth:** per page.
  - **Top Lists:** pages, where visits came from, Honoring Aiden entries, QR codes scanned, rocks followed.
- **Charts:** Recharts in the page's own lazy chunk, with fixed categorical colors per series and tooltips in ink colors.

**Deviations from plan:**
1. **Separate page:** the plan had panels on the Dashboard (see the decision above).
2. **Visitors by Day:** the plan said the new chart would sit next to the current `counter_tracking` one. The new data is in the Activity page's Visitors panel; the old chart stays on the Dashboard as agreed ("keep both for now").
3. **Top songs** are in Music Listening, and **new vs returning** is a Visitors tile, rather than both being in Top Lists.

**Issues/gotchas encountered:**
- `returning` is a reserved word in Postgres; the alias became `is_returning`.
- **pg rejects unused extra parameters.** Panels that don't group by day don't use `$4` (tz), so `run()` passes only the parameters a query actually references.

**Tests:**
- 11 new API tests (`activity-admin.test.mjs`). One realistic visit is sent through the real `/api/activity`, then every panel's numbers are checked, including names joined from albums, photos and music, a scroll view with two leaves, not-found searches, email links and form sources.
- 11 routes in the auth matrix.
- 1 new browser test: Dashboard Today row, then the link to the Activity page, every panel heading rendering, every range and both toggles, and no errors.
- Full regression passes: lint, 470 API tests and 67 browser tests.
- Bundle: the public download is unchanged (783.3 KB gzipped). The Activity page loads its own 3.4 KB chunk, and Recharts is shared with the Dashboard's admin chunk.

## Code review fixes (2026-10-16), 0.15.17
**Status:** Complete. A high-effort code review of the whole change, run at the user's request ("deep dive ... find any errors"), found 10 issues; I added one. Each was checked against the code, all 11 were real, and all are fixed with a test.

| # | Problem | Fix | Test |
|---|---|---|---|
| 1 | Whether an error group ever alerted was decided by its **first** occurrence. A group first seen on internal traffic, or from an upload failure (`alert: false`), never alerted for later public occurrences. | `errorGroups.noteError` decides per occurrence. It alerts for a New group not alerted since it became New (`last_alerted_at IS NULL`, or older than `status_changed_at` and 24 h). `status_changed_at` is now set when a group is created. | internal-first, then public: exactly one email |
| 2 | The admin panels cast event meta with `::int` / `::numeric` / `::boolean`. One malformed event sent to the public endpoint made a panel 500 for every range containing it. | `metaNum` / `metaBool` (`utils/activityFilters.js`): `CASE WHEN jsonb_typeof(...) = 'number'/'boolean' THEN ... END`, otherwise NULL. Used for every cast in `activityAdmin.js` and Site Health's slow/speed. | 8 malformed events; all 10 activity panels and 3 Site Health lists still return 200 |
| 3 | A **Fixed** group reopened (and re-alerted) on an occurrence from a version **older** than the fix, e.g. a tab left open since before the deploy. | It reopens only when the occurrence's version is at or after `fixed_in_version`. A missing or unknown version still reopens. | stale version stays Fixed; the fixed version reopens. The two phase 2 reopen tests now send a version after the fix. |
| 4 | A browser could put a `fingerprint` on a non-error event, and it counted toward that error's totals. | Ingest strips `fingerprint` from every event's meta before grouping. Error occurrences only count the error event types (`utils/errors/occurrences.js`, Site Health detail). | forged `page_view` is stored without it; the group's count is unchanged |
| 5 | An email failure inside a request was recorded twice (`server_email` from `sendEmail`, plus `server_request` from the 500), giving two groups and two alerts. | `recordServerError` marks the Error (`RECORDED` symbol, set synchronously). `errorCapture` skips a 5xx whose error is already recorded. | a mail-route 500 records only `email` |
| 6 | A map pin click fills the Rock # box, so 1.5 s later it was also counted as a typed search. | `RockMap` remembers the pin-filled value and skips it; typing clears that. | browser: type 999, click pin 101, still 2 searches |
| 7 | A body the beacon parser rejected (over 200 KB, bad charset) reached the global handler as a 500, which was recorded and alerted, and wasn't rate-limited. Malformed JSON bodies anywhere did the same. | The beacon parser answers its own errors (413/400). `errorCapture` doesn't record a 5xx whose error is a client error (`err.status` 4xx). | a 250 KB beacon gets 413 and no `server_error` row |
| 8 | The source-map cache destroyed an evicted map that a stack being resolved might still use. The version check allowed `..`. | Destroy after 60 s. Versions must be digits and dots. | `..` / `../..` leave the stack unchanged |
| 9 | The Visitors and Forms panels ran 4 queries one after another. | `Promise.all`. | covered by the activity-admin tests |
| 10 | Duplication: the version reader was in both Vite configs, and the error-occurrence query existed twice, counting the daily summary's Visitors differently from Site Health. | `client/appVersion.js` (shared by both configs). `occurrencesSql()` in `utils/errors/occurrences.js` is used by Site Health, the daily summary and the glance. | existing Site Health / summary tests |
| 11 *(mine)* | The Dashboard's red "new errors" count and the summary's "still New" included kinds only ever seen on internal traffic. | `NEW_ERRORS_SQL`: New groups with at least one non-internal occurrence. | an internal-only new kind doesn't change the count |

**Decided and done in 0.15.18 (see below):** the global error handler in `app.js` answered *every* error with 500, including body-parser client errors (malformed JSON 400, too large 413). Error tracking no longer records those, but visitors still get a 500 where a 400 or 413 is correct. Changing the status code is a change to existing behavior, so it was left for the user to decide.

**Files changed:**
- New:
  - Server: `server/src/utils/errors/occurrences.js`, `server/tests/api/tracking-review-fixes.test.mjs`
  - Client: `client/appVersion.js`
- Changed:
  - Server error tracking: `utils/errors/{errorGroups,errorEmails,recordServerError,resolveStack}.js`, `middleware/errorCapture.js`
  - Server routes: `routes/{activity,activityAdmin,siteHealthAdmin}.js`, `utils/activityFilters.js`
  - Client: `components/rock-map/RockMap.jsx`, `vite.config.js`, `vite.e2e.config.js`
  - Tests: `server/tests/api/error-tracking.test.mjs`, `client/e2e/activity-events.spec.js`
  - `VERSION`

**Tests:** 8 new API tests (`tracking-review-fixes.test.mjs`) and a stronger map browser test. Full regression passes: lint, 478 API tests and 67 browser tests.

## HTTP status codes for client errors (2026-10-16), 0.15.18
**Status:** Complete. Requested by the user after the review ("we might as well fix the codes").

- **Before:** the global error handler answered every error with `500 { error: 'Something broke!' }`, including requests the client got wrong.
- **Now:** it lives in `server/src/middleware/errorHandler.js`.
  - **Errors that already carry a 4xx status** keep it: body-parser's malformed JSON (400), too large (413), bad charset (415), and any http-errors error.
  - **Multer upload errors** (no status of their own): `LIMIT_FILE_SIZE` / `LIMIT_FIELD_VALUE` are 413, other limits (too many files, unexpected field) are 400.
  - **Everything else** is still 500 with the same body, and error tracking still records it.
  - The response body is still `{ error }`. Client errors show a safe message (`err.expose` / the multer message, otherwise "Bad request") and are logged with `console.warn`, not as failures.
- **Simpler `errorCapture`:** its 4xx skip (from the review fixes) is gone; client errors no longer reach it as 5xx. It still skips errors already recorded.
- **What visitors see:** nothing changes in the client. The upload form and Request a Rock still show their friendly message on any failure. The tracker already reports 413 and 400-on-submit as `load_error`, so these now show in Site Health as rejected requests instead of being hidden as 500s.
- **Tests:** 3 new API tests (`http-error-codes.test.mjs`): malformed JSON gets 400 and isn't recorded; a multer file-size error gets 413 and a file-count error 400; a real bug still gets 500 and is recorded once.

## Security and performance reviews (2026-10-16), 0.15.19
**Status:** Complete

**Security review:** no vulnerabilities at the reporting bar. It covered:
- SQL built from template strings (only constants are put into the SQL text; every request value is a `$n` parameter)
- source map path traversal (strict file and version patterns)
- the beacon's body token (verified like the header; `is_admin` comes only from the verified account)
- admin gating (`router.use(requireAdminAuth)` on both new admin routers)
- stored XSS in the alert emails (everything escaped) and in the admin UI (no `dangerouslySetInnerHTML`)
- data exposure (500s are generic; source maps are off the web root and blocked by nginx)

Noted below the bar: `isInternalRequest` trusts the `Origin` header, so a visitor can only hide their own traffic from the default view.

**Performance review:**
- **Load test:** one year of synthetic traffic in the test database: 50,000 visits, 25,000 devices, 504,941 events and 40 error groups. Every admin endpoint was timed at 30 days and at All.
- **Results before the fix:**
  - **30 days:** every panel under 100 ms, except Visitors at 264 ms.
  - **All:** every panel 9-300 ms, except **Visitors at 2,175 ms**.
  - Site Health: 10-56 ms. The Dashboard's Today row: 51 ms. The public `POST /api/activity` answers before inserting.
- **Fixed: the Visitors panel.** It ran four queries, each rescanning every event with `COUNT(DISTINCT ...)` (daily 829 ms, totals 566 ms, platforms 358 ms, lengths 257 ms). Now it's one query: events are collapsed to one row per visit (`per_visit AS MATERIALIZED`), and the days, totals and devices are counted from that, returned as JSON.
  - **Result:** All went from 2,175 ms to about 650 ms; 30 days from 264 ms to 119 ms.
  - **Trade-off:** a visit and its page views now count on the day the visit started. A visit that runs past midnight counts on its first day only, rather than on both.
  - `EVENTS` now also selects `v.started_at`.
- **Fixed: source map memory.** A parsed main-bundle map measured about 50 MB of server memory (load: 56 ms read and parse, 10 ms consumer, 27 ms first lookup). The cache kept up to 6 and never released them, so up to about 300 MB could sit idle. Now it keeps at most 3, and all are released after 10 minutes without an error being opened.
- **Checked, not an issue:**
  - **Tracker's per-event work in the browser:** a couple of `localStorage` reads and one write per event or API call. That's microseconds, never per scroll or keystroke, and it's what shares one visit across tabs.
  - **Bundle:** the public download is unchanged; the Activity page has its own 3.4 KB chunk.
  - **Error detail:** 25 occurrences × one trail query each, by `visit_id` index: 27-43 ms.
- **Watch as data grows:** events are kept forever, so the "All" range will slow roughly in step with total traffic (about 0.65 s per year at this volume for Visitors, about 0.3 s for the others). If it becomes noticeable, a nightly per-day summary table would fix it. Not needed now.

**Tests:** full API suite (481) and the Activity page browser test pass after both changes.

## Import of the old visit log (2026-10-16), 0.15.20
**Status:** Complete

Approved: copy the old Home-page visit log (`counter_tracking`) into `visit`, with one `page_view` each (option 1). Visit rows alone wouldn't show up, because every panel starts from `site_event`. Nothing else is copied: QR scans, bad URLs (`unmatched_path_hit`), `music.play_count` and `entry.view_count` stay where they are. The counts have no dates, and the rest wasn't asked for.

- **New step:** `05_oneserver_import_legacy_visits.sql`, data only, so it runs on Node A only after the code is live (DEPLOY.md section 9). Steps 01-04 now say "of 05".
- **Cutoff:** only rows from before the first non-imported visit, so nothing is counted twice.
- **Marking:** visits get `client_version = 'legacy-import'` and events get `meta.imported = true`. The file's header has the undo.
- **IDs:** derived from the old row (`md5(...)::uuid`), so re-running adds nothing.
- **Mapped like the new tracker:**
  - platform from the user agent, in the same order as `platformFromUserAgent.js`
  - `screen` "WxH" from the old JSON
  - path from `page_url`
  - same-site referrers dropped
  - bots skipped
  - private IPs, localhost and IP-literal hosts flagged internal
- **Decision (not asked, noted here):** a "device" is the same IP + user agent. The old session ID only lasted one tab, which would count every tab as a new visitor. `is_returning` is true from that device's second imported visit on. Unique visitors are an estimate either way.
- **Limits:** only Home-page landings exist in the old data, there's no visit length (one-event visits are left out of the averages), and old admin visits can't be told apart.
- **Test:** `server/tests/api/legacy-visit-import.test.mjs` (5) runs the step file against the test DB. It covers the cutoff, bots, mapping, device grouping, the Visitors panel and a re-run.

## Visitors panel: By Device chart (2026-10-16), 0.15.21
**Status:** Complete

Asked for: the Dashboard's Visitors by Day "By Platform" stacked chart on the Activity page's Visitors panel.

- **Server:** `/api/admin/activity/visitors` days now carry `platforms: { iPhone: { visitors, visits }, ... }`. It's counted from the same `per_visit` rows in the same query, and a day with no visits has `{}`.
- **Client:** the Visitors panel has a **Visitors | By Device** toggle above the chart. By Device has a **Visits | Visitors** count toggle and stacks each day by device.
  - "Device" is the Activity page's word for platform.
  - The colors are the Dashboard's fixed per-platform colors (`PLATFORM_COLORS` in `activityUi.jsx`).
  - Devices with nothing in the range are left out.
  - The tooltip lists the top segment first, skips empty ones and ends with the day's own total.
- **Shared chart changes:** `DayChart` series take an optional `color`. Stacked charts use the new tooltip order, which Activity by Day's stacked chart now also gets. `Segmented` moved into `activityUi.jsx`, with its styles in `Activity.module.css`.
- **Test:** `activity-admin.test.mjs` checks the per-day device counts and the empty-day `{}`.
