# Regression Testing — Summary Issue Log

Plan: `regression-testing-plan.md` (IDs below refer to it).

## Session 1 (2026-10-05) — harness + P0 + part of P1. IN PROGRESS
**Decisions (with the user):**
- S1: Create Images tool deleted.
- S3: stop serving rock `o/` and `metadata.txt`.
- S9: publish the files that processed, and email the admin about the failures.
- Login: one uniform failure message.

**Deviations:**
- `app.js` exports `app` and only listens when `require.main === module`, instead of a new `server.js`; no start scripts changed.
- Tests `chdir` into `server/tests/.tmp`, instead of a `MEDIA_ROOT` env var; the media paths that used `__dirname` were made cwd-relative.
- Visibility rule (C3/C-pin): a public stop = `journey.show` AND at least 1 visible image (`utils/visibleJourneySql.js`), used everywhere.

**Done:**
- **Harness:** `docker-compose-test.yml` (5433/1026/8026), vitest + supertest, seed, helpers, `tests/api/auth-matrix.test.mjs` (270 tests; 13 were red before the fixes, all green now).
- **createdb.sql:** drift fixed (`play_count`, email-subject cols, duplicate sequence, 12 missing `page_content` rows). Verified: the schema now matches the dev DB.
- **Fixes:**
  - S1/S2/S10 endpoints and dead test components removed.
  - S4/S18 gated.
  - S3 static block.
  - S5 and S6 transactions.
  - S12 `safeRollback`.
  - A1/A2 partial entry PUT.
  - S8 `OPENCAGE_API_KEY` env.
  - S9.
  - S16 albums/photos/music/email slugs (admin uses `?includeHidden=1`).
  - S20, C-stats, C3/C-pin server side.
  - S-music delete path; music temp moved to `media/.staging/temp`.
  - S21 album names.
  - A6 album save errors.
  - Login uniform error + dummy bcrypt.
  - A-auth (`authFetch` 401, startup only clears on 401).
  - EntryDetailView race and load-error message.

**Not done yet:**
- **Server:**
  - API tests beyond the matrix (auth flows, public reads, upload pipeline, admin CRUD)
  - A3, A4/A5, A7, A8
  - C1, C3 client paging stop, C4, C5
  - P2 list (upload/rock-request validation and limits, journeyAdmin cleanup, z-index, Dialog, PreviewContext, small UI items, dead code/Prisma)
  - `unhandledRejection` logger
- **E2E:** Playwright E2E (`client/e2e`, `vite.e2e.config.js`), `tests/e2eServer.mjs` (the `test:serve` script references it; not written yet), `run-regression.sh/.ps1`, RUNBOOK.md, CLAUDE.md Tests entry.

**Action for the user:**
- Rotate the OpenCage key (it was in git) and add `OPENCAGE_API_KEY` to the prod `.env`.
- `data/docker-compose/demo` is tracked and holds DB passwords and a Cloudflare token: rotate them and untrack the file.

## Session 2 (2026-10-05) — remaining fixes, full suite, runbook. COMPLETE (pending your manual UI check)

**Result:** `bash data/scripts/run-regression.sh` is all green.
- Client lint: PASS.
- API: 337 tests in 5 files.
- Browser: 48 tests (44 desktop + 4 mobile).

**Fixes added this session:**
- **C1:** `utils/journeyStats.js` is shared by RockJourney and RockPopupByNumber. Start/latest dates are in the right order, and the distance is measured chronologically and skips stops with no coordinates.
- **C3 (client):** Track the Rocks stops paging after a short page or an error, and shows "Try again", which re-fetches the failed page.
- **C4:** All Rocks shows an error state with a retry.
- **C5:** the upload form date uses the local day (`utils/localDate.js`).
- **A3:** the rock-request email dialog prefills once per open (keyed on `rq_key`).
- **A4:** music save errors keep the dialog open and are shown. Delete and toggle errors raise an alert, and the prompt now says "Delete this song?". The no-op music drag-reorder was removed (a real reorder needs a server endpoint; not built).
- **A5:**
  - Artist save errors are shown in the dialog.
  - The server now checks for duplicate names on create and edit; the old 23505 handler could never fire because there's no unique constraint.
  - Deleting an artist still linked to rocks returns 409 with a message.
- **A7:** rocks with no artist: null artist keys are dropped on both client and server; bad `artist_keys` returns 400.
- **A8:** the journey dialog remounts per journey, and Prev/Next asks before discarding unsaved edits.
- **P2 server:**
  - **Public upload:** staging ids validated (S11 `"."` sweep), 2 GB cap per staged file, email validated and normalized, 255-character field caps, rate limits (`middleware/publicFormLimiter.js`), and an uncommitted upload folder is removed on failure.
  - **Rock-request form:** type and length checks, email check, at most 100 rocks, rate limit.
  - **Reset-password:** the `connect()` call is now guarded.
  - **Entry create:** title must be a string.
  - **Logging:** an `unhandledRejection` logger (only when run directly).
- **Journey admin:**
  - Delete also removes the image and tracking rows and the media folder.
  - A rock-number change moves the folder *before* the DB update, and moves it back if the update fails.
  - The rock-number comparison is now string-based, so an unchanged number no longer triggers a move.
- **Rock delete:** folder removal is best-effort after the commit.
- **P2 client:**
  - **Overlays:** the upload overlay, upload result, HEIC spinner, rock-collection dialog and Track the Rocks dialog moved to the modal tier; the clashing global `.dialog-*` classes were renamed (`upload-result-*`, `rock-collection-overlay`).
  - **`Dialog.jsx`:** Escape and the scroll lock only apply while open, and the previous overflow is restored.
  - **`PreviewContext`:** follows `useLocation`.
  - **Home, SUDC, Birthdays, Share:** no fallback-copy flash while loading.
  - **RockMapPopup:** single fetch, and a late response for a closed rock is ignored.
  - **PhotoAlbum:** error message, `tag` dependency, cancellation.
  - **PhotoEditDialog:** the date input value now shows.
  - **Server Health:** handles a single DB node.
- **Dead code removed:**
  - Prisma deps and `config/database.js`
  - `constants/httpStatus.js`
  - `ImageItem`, `PhotoUploader`, `photo-album/photos.js`, `albumtestdata.js`, `upload-rock-form/UploadRockButton.jsx`
  - stale "sessionStorage" comments; admin preview tabs now open with `noopener`

**Suite added:**
- Vitest API files:
  - `auth-matrix`: every route × anon/user/admin
  - `auth-flows`: sign-up/verify via Mailpit, lockout/reset, uniform login error, expired/reused tokens
  - `public-reads`: visibility rules, stats, hidden content, pages, follows
  - `upload-pipeline`: hidden → processed → published, S9 partial and total failure, S3 private files, validation, rock-request form
  - `admin-crud`: one block per admin router
- Playwright specs: `public-smoke`, `rocks`, `upload`, `account`, `admin`, `mobile`.
- `data/scripts/run-regression.sh` / `.ps1`, `RUNBOOK.md`, and a CLAUDE.md Tests section.

**Deviations / decisions made here:**
- The DB and media are reset per *test file* (`tests/setup/resetState.mjs`), not once per run, so files can't affect each other.
- S9 is tested by calling `processImagesInBackground` directly on a prepared folder; sharp tolerates truncated images, so a real upload can't be made to fail mid-processing on demand.
- Server Health's version/ip_addr/replication_status rows were left as they are; they're intentional per `recordAppVersion.js`.
- ESLint now ignores `dist-e2e`, `playwright-report` and `test-results`.

**Still deferred (logged, not done):**
- the lockout-as-denial-of-service risk
- open CORS and the 100 MB JSON body limit
- size cap on admin email attachments
- the spoofable `/api/ip` header
- "email sent before DB update" ordering in rock-request and catch-up sends
- `album reorder-all` ignoring hidden albums
- `journeyAdmin` toggle not validating `show`
- album originals (`media/albums/*/o`) are still publicly served with their EXIF data (only rock uploads were in scope)

**Action for the user:** unchanged from session 1 (rotate the OpenCage key and the secrets in `data/docker-compose/demo`), plus your manual UI pass.
