# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

"Journey Through the World With Aiden's Rocks" is a memorial site built in honor of Aiden Asher Armitage, who passed away in May 2025 at 2.5 years old. Aiden loved adventure — swimming, hiking, national parks, and collecting rocks to throw into water or at trees. His parents promised him a life of exploration, and this site continues that promise: rocks collected in his memory travel to new places (national parks, countries, landmarks), and their journeys are documented and shown on an interactive map, so Aiden's adventurous spirit keeps growing even though he isn't here to grow with it.

The public site shares these rock journeys with family and visitors. The `/admin` section is where the family manages and uploads new rock journey content (photos, locations, journal entries).

This is a deeply personal, emotionally significant project, not just a technical one. When touching user-facing copy, tone, or content presentation, keep that context in mind — the engineering conversation itself should stay normal and direct.

## Project shape

Two independent apps, no root-level `package.json`/workspace — run commands from inside each directory:

- `client/` — Vite + React 18 SPA (public site + an `/admin` section), plain CSS Modules per component.
- `server/` — Express REST API (`src/app.js`), PostgreSQL via raw SQL (`pg.Pool`), file-based media storage under `server/media`.

Quality gates: `client` ESLint, a server API suite (Vitest + supertest, `server/tests/`) and a browser suite (Playwright, `client/e2e/`), both run against a throwaway docker Postgres + Mailpit -- never the dev DB or Gmail. One command runs all three: `bash data/scripts/run-regression.sh`. See `data/ai-build-docs/regression-testing/RUNBOOK.md` (how it works, seed data, how to extend it).

## Version & Git Conventions

**VERSION file.** Repo root has a `VERSION` file (`X.Y.Z`), bumped as part of every change — a task is incomplete if it isn't:

- **X (major):** manual only — never bump without explicit user instruction.
- **Y (feature):** bump when starting work on a new feature folder under `data\ai-build-docs\<feature-slug>\`, reset Z to 0.
- **Z (patch):** every other change not tied to the start of a new feature folder.

**Git: read-only freely, never write.** `git status`, `git diff`, `git log`, `git show`, `git branch -l` are always fine to run. Never run any command that writes to the repo (`git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git checkout`/`git switch` that changes branch or working-tree state) unless the user explicitly asks for that specific action in that session.

## When Uncertain, Ask

If a requirement is ambiguous, or a decision isn't covered by this file or the relevant feature's `data\ai-build-docs\<feature-slug>\` doc, stop and ask rather than assuming. Minor naming or ordering calls can be made and noted in that feature's `summary-issue-log.md`. Anything touching rock upload/visibility behavior, the data model, or existing behavior needs explicit approval before proceeding.

## Commands

Client (`cd client`):
- `npm run dev` — Vite dev server (configured for a specific LAN/Nginx setup, see Dev server gotcha below).
- `npm run build` — production build.
- `npm run lint` — ESLint (`--max-warnings 0`, fails on any warning).
- `npm run preview` — serve the production build.

Tests (needs Docker; see the runbook above):
- `bash data/scripts/run-regression.sh` -- lint + API + browser, with a PASS/FAIL summary.
- `server`: `npm run test:db:up` / `test:db:down` (test stack on 5433/1026/8026), `npm test`.
- `client`: `npm run test:e2e`.
- Adding an API route? Add it to `server/tests/api/auth-matrix.test.mjs` with its auth gate.

Server (`cd server`):
- `npm run dev` — nodemon with `--legacy-watch` (polling-based watch, for WSL2/Docker).
- `npm start` — plain `node src/app.js`.
- DB connection is configured via env vars consumed by `src/db/pool.js` (`DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`) and loaded from a `.env` file (gitignored).

## Architecture notes

**Database access** is raw SQL through `server/src/db/pool.js` (a plain `pg.Pool`), inline in the route handlers (see `routes/rockPosts.js`, `routes/rocks.js`, etc.). The unused Prisma client and dependencies were removed. Use one checked-out client (`pool.connect()`) for transactions, never `pool.query('BEGIN')`, and `utils/db/safeRollback.js` in catch blocks. `data/sql/createdb.sql` must stay a complete fresh install; the test suite builds its DB from it.

**Rock upload is a multi-stage pipeline**, not a single request: `routes/uploadRock.js` accepts the upload (multer), inserts a summary row inside a transaction, saves original images synchronously, then kicks off `utils/rock-upload/processImagesInBackground.js` **without awaiting it** — that background task converts originals to WebP, generates thumbnails, flips `show` flags on the `journey`/`journey_image` tables once processing finishes, and emails a notification. Anything touching rock images/journey visibility needs to account for this async gap between "upload accepted" and "rock visible in the journey/map". Each file is processed on its own: a file that fails stays hidden, the rest publish, and the admin is emailed the failures. "Publicly visible stop" has one definition, `utils/visibleJourneySql.js` (`journey.show` AND at least one visible image), used by every public rock query. `metadata.txt` and the `o/` originals under `media/rocks` are never served (see `app.js`).

**Auth is account-based JWT (visitors and admin share one sign-in).**
- **Accounts:** they live in the `account` table. Email is the username. `access_level` is 10 unverified, 20 user, 30 creator, or 50 admin. "Locked (40)" is the separate `is_locked` flag, not a stored level. 5 bad passwords lock an account, and a password reset unlocks it.
- **Sign-in:** `POST /api/auth/login` issues a JWT `{sub: accountId, ver: token_version}` (`JWT_EXPIRES_IN`, 90d). Bumping `account.token_version` (password reset, account locked) signs that account out everywhere. `client/src/admin/context/AuthContext.jsx` stores it in `localStorage` (`authToken`) and attaches it to every axios request as `Authorization: Bearer <token>`.
- **Client session:** on load it re-checks the token via `/api/auth/me`. It signs out on any 401, but not on a 403. It exposes `account`/`isUser`/`isAdmin`.
- **Server gates:** `server/src/middleware/requireAuth.js` provides `requireAuth(minLevel)`, which re-reads the account on every request, and `optionalAuth`. `requireAdminAuth.js` is just `requireAuth(50)`. New admin endpoints should use it (`router.use(requireAdminAuth)`), and admin client code can call `axios` without adding headers.
- **Client routes:** `PrivateRoute` takes `minLevel` (default 50).
- **Creating an admin:** there is no env-var admin login. Run `npm run create-admin -- you@email.com` in `server/`.
- **Admin-created accounts:** Admin → Accounts → Add Account (`POST /api/admin/accounts`) creates an account **locked** with an unusable random password hash. It can't be signed into until the person sets a password through a reset link (optionally emailed on create), which also unlocks and verifies it. See `data/ai-build-docs/admin-create-account/`.
- **Email links:** verify/reset/rock-moved links are built from `PUBLIC_SITE_URL`.
- See `data/ai-build-docs/user-accounts/`.

**Generic settings store.** The `setting` table (`name` unique, `value` jsonb, `type`, `description`) is read and written through `GET`/`PUT /api/admin/settings/:name` (`server/src/routes/settingsAdmin.js`). It's the place for admin-managed preferences such as a job's last-used controls (e.g. `qr-center-label`), so don't create a one-off table for that kind of data. Site-wide values visitors need (currently `contact-email`, edited in Admin → Settings) are exposed by the public `GET /api/site-settings`, which returns only the allow-list in `server/src/utils/siteSettings.js`; the client reads them through `useSiteSettings()` (`client/src/context/SiteSettingsContext.jsx`). **Never hard-code an email address:** visitor-facing contact info comes from the `contact-email` setting (the Contact Email chip in page text, `{CONTACT_EMAIL}` in email templates), and who an email is from/to comes from its template (below).

**The interactive rock map (`client/src/components/rock-map/RockMap.jsx`) has a recurring footgun with `react-leaflet`'s `<Marker icon>` prop**: `updateMarker` in `react-leaflet` only calls `setIcon` when the new `icon` prop is non-null (`props.icon != null`). That means conditionally omitting the `icon` prop (or passing `icon={undefined}`) when you want "no custom icon" does **not** fall back to Leaflet's default icon — it leaves the marker on whatever icon it last had, or crashes if it never had one. Always pass an explicit icon value (e.g. a `defaultIcon` and a `greenIcon`, never `undefined`) for both states you're toggling between.

**CSS stacking contexts are easy to break across this app's fixed-position layers** (navbar, footer, the `Dialog` modal, the map's settings dialog, Leaflet's own panes). A `position: relative` + `z-index` on an ancestor (e.g. `RockMap`'s `.mapContainer`) creates a local stacking context that caps everything inside it — including `position: fixed` descendants — below sibling elements elsewhere in the tree (like the navbar) regardless of their own `z-index` value. When a fixed overlay/modal isn't appearing on top of something it should, suspect an ancestor's stacking context before bumping the overlay's own `z-index`. The app's established z-index tiers: page content controls ~`1000`, navbar ~`1100`, true full-screen modals ~`2000`.

**Outbound email (`server/src/utils/sendEmail.js`) is routed by a `MAILPIT_ENABLED` flag**, not by `NODE_ENV`. When unset/`false` (the prod default — prod's `.env` never sets it) mail goes through the real Gmail account (`EMAIL_USER`/`EMAIL_PASSWORD`). When `true` it goes to a Mailpit SMTP catcher instead (`MAILPIT_HOST`/`MAILPIT_PORT`, no auth), viewable at Mailpit's web UI (`:8025`). `data/docker-compose/docker-compose-dev.yml` runs a `mailpit` service and its `.env` sets the flag to `true`; `docker-compose-prod.yml` has no mailpit service at all. A bare local (non-docker) `npm run dev` in `server/` also needs `MAILPIT_ENABLED=true` in `server/.env` plus Mailpit reachable at that host/port (e.g. `docker run -p 1025:1025 -p 8025:8025 axllent/mailpit`) to avoid emailing the real Gmail account during dev. With the flag off, setting `SMTP_HOST` (+ `SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`) switches from Gmail to any SMTP provider, and `EMAIL_FROM` / `EMAIL_REPLY_TO` override the sender and add a Reply-To. That's the config-only path to sending from the site's own domain (see `data/ai-build-docs/email-deliverability/`). `sendEmail` also wraps HTML fragments in a full document and adds an auto-generated plain-text part (`html-to-text`) to every HTML email. Both are spam-filter signals, so don't bypass `sendEmail` with a raw transporter. **Sender / Reply-To / Send To are per template** (Page Details, `page_content.{draft,published}_email_{from,reply_to,to}`, draft until Publish): `renderEmailTemplate` returns `{ from, replyTo, to }`, and callers pass `from`/`replyTo` to `sendEmail` (blank falls back to `EMAIL_FROM`/`EMAIL_REPLY_TO`). Send To only exists on the 4 emails sent to the family (`ADMIN_RECIPIENT_SLUGS`: new request, new journey, both upload failures); blank falls back to the template's Sender address. `ADMIN_ALERT_EMAIL` (.env, optional) is the last-resort recipient for an upload-failure note whose template couldn't be read. See `data/ai-build-docs/email-senders-and-site-settings/`.

**Dev server HMR is configured for a specific LAN setup.** `client/vite.config.js` hardcodes `server.hmr.host` to a LAN IP (`192.168.1.50`) and `clientPort: 80`, intended for an Nginx-fronted deployment. Running the dev server in any other network context (e.g. a sandboxed/headless test environment) will spam `WebSocket connection ... failed` / `server connection lost. Polling for restart...` in the browser console — this is expected noise from HMR trying to reach that LAN IP, not an application bug. It can occasionally cause the page to hard-reload mid-test, which looks like flaky state.

## UI verification workflow

When a change affects the UI, let the user do their own manual verification first. After implementing a UI change, ask the user whether you should also run automated UI verification (e.g. spinning up the dev server and driving it with Playwright/chromium) before doing so — don't launch browser-based verification unprompted.