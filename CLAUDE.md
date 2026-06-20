# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

Two independent apps, no root-level `package.json`/workspace — run commands from inside each directory:

- `client/` — Vite + React 18 SPA (public site + an `/admin` section), plain CSS Modules per component.
- `server/` — Express REST API (`src/app.js`), PostgreSQL via raw SQL (`pg.Pool`), file-based media storage under `server/media`.

There is no test suite in either app (`server`'s `npm test` is a placeholder; `client` has no test script at all). `client`'s only quality gate is ESLint.

## Commands

Client (`cd client`):
- `npm run dev` — Vite dev server (configured for a specific LAN/Nginx setup, see Dev server gotcha below).
- `npm run build` — production build.
- `npm run lint` — ESLint (`--max-warnings 0`, fails on any warning).
- `npm run preview` — serve the production build.

Server (`cd server`):
- `npm run dev` — nodemon with `--legacy-watch` (polling-based watch, for WSL2/Docker).
- `npm start` — plain `node src/app.js`.
- DB connection is configured via env vars consumed by `src/db/pool.js` (`DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`) and loaded from a `.env` file (gitignored).

## Architecture notes

**Database access is split across two unused-in-practice layers.** `server/src/config/database.js` sets up a Prisma client and `@prisma/client`/`prisma` are real dependencies, but there is no `prisma/schema.prisma` in the repo and no route actually imports it. Every route instead imports `server/src/db/pool.js` (a plain `pg.Pool`) and writes raw SQL directly inline in the route handlers (see `routes/rockPosts.js`, `routes/rocks.js`, etc.). Treat the Prisma client as dead/vestigial unless you find a schema — don't assume Prisma is the real data layer.

**Rock upload is a multi-stage pipeline**, not a single request: `routes/uploadRock.js` accepts the upload (multer), inserts a summary row inside a transaction, saves original images synchronously, then kicks off `utils/rock-upload/processImagesInBackground.js` **without awaiting it** — that background task converts originals to WebP, generates thumbnails, flips `show` flags on the `journey`/`journey_image` tables once processing finishes, and emails a notification. Anything touching rock images/journey visibility needs to account for this async gap between "upload accepted" and "rock visible in the journey/map".

**Admin auth is a stub, not a real auth system.** `client/src/admin/context/AuthContext.jsx` checks a hardcoded `admin`/`1154` credential pair in-memory (`useState`), with no persistence/token/session — a page refresh logs the admin out. `PrivateRoute` just gates on that in-memory flag. Don't extend this expecting JWTs, cookies, or a backend session check; that infrastructure doesn't exist yet.

**The interactive rock map (`client/src/components/rock-map/RockMap.jsx`) has a recurring footgun with `react-leaflet`'s `<Marker icon>` prop**: `updateMarker` in `react-leaflet` only calls `setIcon` when the new `icon` prop is non-null (`props.icon != null`). That means conditionally omitting the `icon` prop (or passing `icon={undefined}`) when you want "no custom icon" does **not** fall back to Leaflet's default icon — it leaves the marker on whatever icon it last had, or crashes if it never had one. Always pass an explicit icon value (e.g. a `defaultIcon` and a `greenIcon`, never `undefined`) for both states you're toggling between.

**CSS stacking contexts are easy to break across this app's fixed-position layers** (navbar, footer, the `Dialog` modal, the map's settings dialog, Leaflet's own panes). A `position: relative` + `z-index` on an ancestor (e.g. `RockMap`'s `.mapContainer`) creates a local stacking context that caps everything inside it — including `position: fixed` descendants — below sibling elements elsewhere in the tree (like the navbar) regardless of their own `z-index` value. When a fixed overlay/modal isn't appearing on top of something it should, suspect an ancestor's stacking context before bumping the overlay's own `z-index`. The app's established z-index tiers: page content controls ~`1000`, navbar ~`1100`, true full-screen modals ~`2000`.

**Dev server HMR is configured for a specific LAN setup.** `client/vite.config.js` hardcodes `server.hmr.host` to a LAN IP (`192.168.1.50`) and `clientPort: 80`, intended for an Nginx-fronted deployment. Running the dev server in any other network context (e.g. a sandboxed/headless test environment) will spam `WebSocket connection ... failed` / `server connection lost. Polling for restart...` in the browser console — this is expected noise from HMR trying to reach that LAN IP, not an application bug. It can occasionally cause the page to hard-reload mid-test, which looks like flaky state.

## UI verification workflow

When a change affects the UI, let the user do their own manual verification first. After implementing a UI change, ask the user whether you should also run automated UI verification (e.g. spinning up the dev server and driving it with Playwright/chromium) before doing so — don't launch browser-based verification unprompted.
