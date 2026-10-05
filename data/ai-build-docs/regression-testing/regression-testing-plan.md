# Regression audit and test suite: findings and fix plan

## Context
You asked for a full regression pass over the site, plus a test suite that future AI sessions can rerun. There are no tests today: `server` has a placeholder `npm test` and `client` has ESLint only, which currently passes clean.

I did a full read-through audit of the server (every route, middleware and util, checked against `createdb.sql`), the public client and the admin client. I also checked every client API call against the server's routes and mount prefixes, and every route against its auth gate.

- **No broken wiring:** no 404-bound calls, wrong methods, dead links or leftovers from the deleted Login page.
- **Real problems found:** unauthenticated dangerous endpoints, one admin data-loss bug, broken transactions, schema drift, and a group of UI logic bugs.

**What you chose:** API tests plus E2E tests, run against a throwaway docker Postgres with Mailpit.

**Approach:** build the harness first. Write tests that pin the *correct* behaviour, so the known bugs show as red. Then fix in priority order until everything is green.

**Approval:** several fixes change existing behaviour or rock visibility, so CLAUDE.md requires your approval. Approving this plan covers the items listed. Anything marked **(ASK)** I'll confirm with you before changing.

## Bookkeeping
- New feature folder `data/ai-build-docs/regression-testing/`, so VERSION goes `0.8.31 → 0.9.0`. Every later step bumps Z.
- That folder holds:
  - `regression-testing-plan.md` (this plan)
  - `summary-issue-log.md` (one line per finding: status and test name)
  - `RUNBOOK.md` (how a future AI runs the suite)
- Add a "Tests" entry to the CLAUDE.md Commands section that points to the runbook.

---

## Phase 1: Test harness

**Test environment**
- `data/docker-compose/docker-compose-test.yml`:
  - `postgres:17` on port 5433, using a tmpfs volume.
  - `mailpit` on ports 1026/8026.
  - No nginx, no backups.

**Make the server testable**
- Split `server/src/app.js` into two files:
  - `app.js` builds and exports `app`.
  - `server.js` calls `listen` and `recordAppVersion`.
- Update `package.json` `start`/`dev` and the two `data/docker/docker-server-*` files to run `src/server.js`.

**Server tests: `server/tests/`** (Vitest + supertest, new devDeps)
- **`globalSetup`**
  - Drops and recreates the `public` schema.
  - Runs `data/sql/createdb.sql`. After the Phase 2 fix this file is the source of truth, so the test also proves a fresh install works.
  - Runs `tests/fixtures/seed.sql`: artists, rocks, journeys and images, including one with `show=false`, one with no images and one with null coordinates. Also pages, an album and photos, a song, and Honoring Aiden entries.
- **`.env.test`**
  - Points `DB_*` at port 5433.
  - Sets `MAILPIT_ENABLED=true` and `PUBLIC_SITE_URL`.
  - Points media at a temp dir. This needs a small `MEDIA_ROOT` env override wherever `media` is hard-coded (`app.js` static path, `uploadRock`, the albums, music and honoringAiden routes, and the rock-upload utils).
- **Helpers**
  - `tests/helpers/accounts.js` creates accounts at levels 10/20/30/50, plus a locked one, by direct SQL with bcrypt. It also returns tokens from `/api/auth/login`.
  - `tests/helpers/mailpit.js` lists and clears messages through the Mailpit REST API.
  - `tests/helpers/waitFor.js` polls until the background image job flips `show`.
- **Scripts:** `npm test` (`vitest run`) and `npm run test:db:up` / `test:db:down`.

**E2E tests: `client/e2e/`** (`@playwright/test`, chromium only)
- `client/vite.e2e.config.js` is a separate config, so the dev and HMR setup is untouched. It is `preview` plus a proxy for `/api` and `/media` to the test server.
- Playwright `webServer` starts both the test API and `vite build && vite preview -c vite.e2e.config.js`.
- `storageState` fixtures cover anonymous, user and admin sessions.
- Scripts: `npm run test:e2e`.

**Single entry point**
- `data/scripts/run-regression.sh` (plus a `.ps1` twin):
  - compose up
  - client lint
  - server tests
  - e2e tests
  - compose down
- It prints a summary. Future AI sessions just run this and read `RUNBOOK.md`.

## Phase 2: Test catalogue

Each test is tagged with the finding ID it guards, e.g. `[S1]`.

**API: auth matrix (`auth-matrix.test.js`)**
- Table-driven over the full route inventory: for each `METHOD path`, the expected status for anon, L20 and L50 users.
- Mutations are sent with no body, so only the gate is tested.
- This one test catches any future route mounted without a guard.

**API: auth flows**
- signup, verify, resend, login, `/me`
- lockout after 5 tries, then reset unlocks
- a `token_version` bump invalidates old tokens
- expired or reused reset tokens are rejected
- the enumeration-safe response shape

**API: public reads**
- rock-posts (paging totals equal returned rows, hidden posts excluded)
- `/:rockNumber`, `locations/all`
- ar-details (counts exclude hidden posts, no null state)
- albums and music (hidden items excluded), pages (unpublished slug gives 404)
- honoring-aiden, follows CRUD

**API: upload pipeline**
- stage-chunk, then upload-rock.
- Assert the original saved and the summary row present with `show=false`.
- Wait for the background job, then assert webp/sm files exist and `show=true`.
- Assert emails arrive in Mailpit.
- Negative cases:
  - a corrupt video still publishes the rest, or fails visibly, per S9
  - `stagingId="."` is rejected
  - a bad email gives 400

**API: admin CRUD**
One file per admin router: artists, rocks (including delete atomicity), albums and photos, journey, music, rock-requests, pages (draft, publish, render, send), jobs, settings, path-display-names, honoring-aiden (including a "rename keeps body" test), and accounts.

**E2E smoke (public)**
- Every public route renders without console errors. HMR noise is filtered out, and the build doesn't include HMR anyway.
- The navbar is built from pages.
- Map pins render, and clicking one opens the popup with the correct start and latest dates.
- Track the Rocks infinite scroll stops at the end.
- All Rocks shows an error state when the API fails.
- Share-your-rock: the upload form defaults to the local date, and the overlay sits above the navbar.
- Sign-up, verify (link taken from Mailpit), sign-in, follow a rock, sign-out.

**E2E flows (admin)**
- A non-admin is redirected.
- Every admin page loads.
- Honoring Aiden rename keeps content.
- Rock-request email edits survive the "Saved" refresh.
- Error toasts show on music, artist and album failures.
- The journey dialog resets when stepping to Next.
- Server Health renders with one DB node.

## Phase 3: Fixes, in priority order

### P0: Security and data loss
| ID | Issue | Fix |
|---|---|---|
| S1 | `createImages.js:13`: no auth, and the caller picks any path. Recursive `rm` is possible. | Admin-gate it and lock the path to `MEDIA_ROOT/rocks`. Skip non-image files. **(ASK)** Or delete it, since it's a legacy batch tool. |
| S2 | `fileSystem.js` write/read-file has no auth, so stored XSS via `/media` is possible. | Delete the route and its dead test components (`BTester`, `TestFile`, `TestDatabase`). Same for `testData.js` (the table doesn't exist). |
| S3 | `metadata.txt` (email, IP, geo) and original EXIF/GPS are publicly served under `/media/rocks/<n>/<uuid>/`. | Write the metadata outside the static root, or block `metadata.txt` in the static middleware. **(ASK)** Strip GPS EXIF from served originals, or stop serving `o/` publicly. |
| S4 | `serverHealth`, `statistics`, `unmatched-path` GET have no auth. | `requireAdminAuth` on GET. The unmatched-path POST stays public. |
| S5 | `rocks.js:145-173` delete runs BEGIN/COMMIT on the pool. | Use `pool.connect()`, the client, and release in `finally`. |
| S6 | `albums.js:451` returns 404 after BEGIN with no ROLLBACK, which leaks the open transaction. | ROLLBACK before returning. |
| A1 | Honoring Aiden sidebar rename wipes `body_json` (`EntryFormModal.jsx:54`, plus the list endpoint omits `body_json`). | Server: PUT only updates the fields that were provided (COALESCE, or build SET from present keys). Client: the rename sends only `title`. |
| S8 | OpenCage API key is hard-coded in `journeyAdmin.js:20`. | Move it to the `OPENCAGE_API_KEY` env var and rotate the key (you do the rotation). |

### P1: Correctness
| ID | Issue | Fix |
|---|---|---|
| S9 | One failed file in `processImagesInBackground` leaves the journey hidden forever and sends no admin email. | Try/catch per file. Always flip `show` for the files that succeeded. Send the admin email with the failure list. **(ASK)** Whether a partial failure should still publish. |
| S15 | `createdb.sql` drift: missing `draft_/published_email_subject`, `music.play_count`, and a duplicate `music_m_key_seq` that errors on fresh install. | Fold the migrations into `createdb.sql`. `droptables.sql` updated to match. |
| S16 | Hidden albums, photos, songs and unpublished pages are returned by public APIs. | Filter `show`/`published` on the server. Public `pages/:slug/content` returns 404 for invisible pages, unless the preview path is admin-authed. |
| S20 | `display_name \|\| ' (' \|\| relation \|\| ')'` returns NULL when `relation` is null (`rockPosts.js:97,145`). | `COALESCE` / `concat_ws`. |
| C1 | `RockJourney.jsx:11-14` and `RockPopupByNumber.jsx:32` swap start and latest dates because the server sorts newest first. Distance is also wrong, and NaN with null coordinates. | Derive dates from min/max. Sort ascending for the distance path. Skip null coordinates. |
| C3 | `RockTable.jsx:59-81` infinite paging loop (on error, or when the count includes journeys without images). | Stop when a page returns fewer rows than `pageSize` or errors. Make the server count query match the rows query's image join. |
| C-pin | Map pin for a journey with no visible images says "not found". | Make `locations/all` and `/:rockNumber` use the same visibility rule (LEFT JOIN images). |
| C-stats | `ar-details` counts hidden posts and returns a null state row. | `WHERE show = TRUE`, and exclude null state. |
| C4 | `AllRocks.jsx` renders blank on any error. | Error state with a retry. |
| C5 | Upload form defaults to the UTC date ("tomorrow" in the evening). | Use the local date. |
| A2 | Detail-view save reverts a sidebar rename. | Fixed by A1's partial-update approach, plus a refetch after rename. |
| A3 | Rock-request email dialog resets while you type. | Effect keyed on `[isOpen, request.rq_key]`. |
| A4–A6 | Music, artist and album save/delete errors are swallowed, and dialogs close anyway. | Rethrow, keep the dialog open, show the server's error. Artist delete with rocks returns 409 with a clear message. |
| A7 | Rock with no artist can't be saved (`[null]` keys). | Filter nulls client-side, and validate server-side. |
| A8 | Journey dialog carries `newImages` over to the next journey, which can upload to the wrong journey. | `key={post.rps_key}` on the dialog. |
| A-auth | `authFetch` ignores 401. Startup signs out on network or 500 errors. | Route 401 through the shared sign-out. Only clear the session on 401. |
| S-music | Music delete uses the wrong path (`src/media`). | Use `MEDIA_ROOT`. |
| S12 | ROLLBACK in catch can throw, causing unhandled rejections. Express 4 doesn't catch async throws. | Small `asyncHandler` wrapper plus a `safeRollback(client)` util, applied across routes. Add a `process.on('unhandledRejection')` logger. |

### P2: Hardening and UX polish
- **Public upload limits:**
  - per-request size limits on stage-chunk and multer
  - validate `stagingId` as a UUID
  - validate the email
  - rate limit
- **Rock-requests POST:** rate limit, length and email checks, and 400 instead of 500.
- **Auth:**
  - **(ASK)** uniform login error to stop user enumeration
  - dummy bcrypt for unknown emails
- **journeyAdmin:**
  - deleting a journey removes its image and tracking rows and its folder
  - the rename is moved before the DB commit
  - fix the int/string comparison
- **Z-index:** upload overlay, comment dialog and search dialog move to the modal tier (about 2000). Rename the clashing global `.dialog-overlay` classes.
- **Dialog and preview:**
  - `Dialog.jsx` only registers its Escape and overflow handlers while open
  - `PreviewContext` reads the preview flag via `useLocation`
- **Rich-text pages:** no fallback-copy flash while loading (render nothing until loaded).
- **Small UI fixes:**
  - `RockMapPopup` double fetch
  - `EntryDetailView` race condition and its 404-vs-500 message
  - `PhotoAlbum` error handling
  - `PhotoEditDialog` date format
  - Server Health with one node
  - "Delete this user?" text on the music delete prompt
  - music drag-reorder disabled (no server support)
- **Dead code:**
  - Prisma deps and `config/database.js`
  - unused components (`ImageItem`, `PhotoUploader`, `photos.js`, `albumtestdata.js`, `UploadRockButton`)
  - `constants/httpStatus.js`
  - stale "sessionStorage" comments

Deferred, logged only: lockout as a denial-of-service vector, open CORS and the 100 MB body limit, email attachment size, the spoofable `/ip` header, and the order of "email sent, then DB update".

## Critical files
- **Server:**
  - `server/src/app.js` (split into a new `server.js`)
  - `routes/{createImages,fileSystem,testData,serverHealth,statistics,unmatchedPath,rocks,albums,music,journeyAdmin,rockPosts,arDetails,pages,honoringAidenAdmin,uploadRock,rockRequests,auth}.js`
  - `utils/rock-upload/processImagesInBackground.js`
  - `data/sql/createdb.sql`
- **Client:**
  - `components/rock-journey/{RockJourney.jsx,rock-table/RockTable.jsx}`
  - `pages/all-rocks/AllRocks.jsx`
  - `components/upload-rock-form/*`
  - `admin/pages/honoring-aiden/EntryFormModal.jsx`
  - `admin/pages/rock-requests/rock-requests-edit-dlg/SendRockRequestEmailDialog.jsx`
  - `admin/pages/{music,users,albums,rocks,journey}/*`
  - `admin/utils/authFetch.js`
  - `admin/context/AuthContext.jsx`
- **Reused, not rewritten:**
  - `middleware/requireAuth.js` / `requireAdminAuth.js` for every new gate
  - the existing `express-rate-limit` setup from `auth.js`
  - `utils/sendEmail.js` (Mailpit flag) for email assertions

## Verification
1. `bash data/scripts/run-regression.sh`: lint, Vitest and Playwright all pass against a fresh docker DB built from `createdb.sql`.
2. Before the Phase 3 fixes, the suite shows the known failures listed in `summary-issue-log.md`. After the fixes it is all green, and each finding links to its test.
3. Per CLAUDE.md, you do your own manual pass on the UI fixes (map popup dates, Track the Rocks scrolling, upload dialog, Honoring Aiden rename, rock-request email dialog) before I run any extra browser checks.
4. `npm run lint` and `npm run build` in `client` stay clean.
