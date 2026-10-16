# Bug Sweep — To-Do

Findings from a full read-through of the server and the main client flows (2026-10-16). Ranked by severity; check items off as they land. Things only a person can check (prod, real phones, Cloudflare) are in **Manual checks** at the bottom. **Deploying:** follow `DEPLOY.md`. #1–#6 and #15 were deployed to prod as 0.13.8 and checked on 2026-10-16. #7–#14 are fixed in 0.13.10, not yet deployed (DEPLOY.md, Part 2).

**Needs approval before starting** (CLAUDE.md: visibility / data model / existing behavior): none left.

## High

- [x] **1. `/media` guard bypass — rock originals are publicly reachable.**
  `server/src/app.js:24-34`. The `o/` / `metadata.txt` check runs on the raw path, but `express.static` normalizes it. Verified against the real app: `/media/rocks/1/u/o/x.jpg` → 404, but `/media/rocks//1/u/o/x.jpg` and `/media/rocks/1/u/./o/x.jpg` → **200** with the original (EXIF GPS intact). nginx's `proxy_pass http://server:8000` (no URI) forwards the path unchanged.
  Fix: normalize the path the same way (`path.posix.normalize`, collapse `//`) before the regex. Add a regression test for both bypass forms.

- [x] **2. Honoring Aiden and album originals are served publicly.** *(approved 2026-10-16)*
  The guard only covers `rocks/*/*/o/`. Public `body_json` exposes `/media/honoring-aiden/<uuid>/webp/image.webp`, so `/media/honoring-aiden/<uuid>/o/original.<ext>` is trivially guessable (verified 200). Album originals at `media/albums/<name>/o/` are guessable from the webp names. The webp copies have metadata stripped; the originals keep GPS.
  Fix: block `o/` under `honoring-aiden` and `albums` too (or every `/o/` segment under `/media`).

- [x] **3. Music uploads break after ~24h of no music activity.**
  `server/src/routes/uploadRock.js:39-57` (`cleanupStaleStaging`) deletes every entry in `media/.staging` older than 24h — including the `temp/` folder `server/src/middleware/upload.js:8-9` creates once at startup. multer doesn't create a function-supplied destination, so music create/edit fails with ENOENT until restart.
  Fix: skip known subfolders (`temp`, `honoring-aiden`) in the cleanup, and/or `ensureDir` in the multer destination callback.

## Medium

- [x] **4. Rate limits key on Cloudflare's edge IP, not the visitor.** *(confirmed 2026-10-16: server saw 162.159.114.9; approved — fixed in `data/nginx/nginx.conf` with `real_ip_header CF-Connecting-IP`, aidensrocks.com block only)*
  `app.set('trust proxy', 1)` behind Cloudflare → nginx (no `real_ip` config) makes `req.ip` the Cloudflare edge. Nearby visitors share one bucket (30 auth attempts / 20 uploads per 15 min), and `/api/location` geolocates the edge. Assumes the domain is proxied (orange cloud).
  Fix: nginx `real_ip_header CF-Connecting-IP` + Cloudflare ranges, or `trust proxy` 2.

- [x] **5. Uploads with several mid-sized videos fail at Cloudflare's 100MB cap.**
  `client/src/components/upload-rock-form/UploadRockForm.jsx` (~line 165). Only files > 80MB are chunked; all others go inline in one request, so two 60MB videos = 120MB → 413.
  Fix: stage files until the inline total fits under the cap.

- [x] **6. `catalog.rock_number` has no unique constraint.** *(approved 2026-10-16; prod had 0 duplicates)*
  `data/sql/createdb.sql:78`; `POST /api/rocks` doesn't check (only the client's batch dialog does). A duplicate doubles that rock's artists, inflates totals, duplicates Follow Rocks rows.
  Fix: server-side duplicate check (409) and a unique index (check prod for existing duplicates first; update `createdb.sql` + a migration).

- [x] **7. Rock edit dialog can attach a photo to the wrong rock.**
  `client/src/admin/pages/rocks/rock-create-edit-dlg/RockCreateEditDlg.jsx:191-197`, `server/src/routes/rocks.js` PUT. A new image whose QR decodes to a different rock changes the displayed (disabled) number and the "saved" message, but PUT ignores `rock_number` and stores the image under the original rock.
  Fix: don't apply the QR number in edit mode (or warn on mismatch).

## Low

- [x] **8. Map year filter.** `client/src/pages/map/Map.jsx:22`, `client/src/components/rock-map/RockMap.jsx`. `new Date(row.date).getFullYear()` on a UTC-midnight timestamp puts Jan 1 stops in the previous year for US browsers. Only 2025/2026 toggles exist — 2027 pins can't be filtered.
- [x] **9. Follow Rocks "last location" ignores the visibility rule.** `server/src/routes/follows.js` (~line 45) uses `j.show = TRUE` instead of `visibleJourneySql`, so it can show a stop the public can't see.
- [x] **10. Track the Rocks can render a rock twice.** `client/src/components/rock-journey/rock-table/RockTable.jsx`. A new upload while scrolling shifts page offsets → duplicate card + duplicate React key. Dedupe by rock number when merging pages.
- [x] **11. Album `reorder-all` skips hidden albums.** `server/src/routes/albums.js:155`. Renumbers only visible albums from 0; hidden ones keep their old `order_num` and can collide.
- [x] **12. Deleting a journey image leaves its files.** `server/src/routes/journeyAdmin.js` DELETE `/images/:rpi_key` removes the row only (o/, webp/, sm/, video/ stay on disk).
- [x] **13. Bad input returns 500 instead of 400.** `server/src/routes/uploadRock.js:117` — date is regex-checked only (`2025-02-30` → 500). Non-numeric path ids (e.g. `/api/rock-requests/abc`, journey-admin, albums) → 500.
- [x] **14. Unthrottled public write endpoints.** `/api/rock-count`, `/api/unmatched-path`, `/api/music/:m_key/increment-play`, `/api/honoring-aiden/entries/:slug/view` have no rate limit (counts can be inflated).
- [x] **15. Visitor locations saved so far are blank.** *(approved 2026-10-16 — script `server/scripts/backfillGeo.js`, `npm run backfill-geo`; run it in prod, see Manual checks)* The `geo` saved with each visit (`counter_tracking`) and rock upload (`journey_tracking`) came from `/api/location`, which looked up Cloudflare's address (no location found). #4 fixes new rows. The saved `ip_address` values are correct (they come from `/api/ip`, which reads the visitor from X-Forwarded-For), so old rows' `geo` could be backfilled with geoip-lite. Also: Admin statistics' "no location" count is off, since blank geo is saved as an object of nulls, not NULL.

## Manual checks

Things the automated suite can't cover: they need prod, Cloudflare, a real phone, or a decision. `<site>` = the public domain.

### Verify the fixes (after deploying)

- [x] **#1 — originals stay hidden through the double-slash path.** Open any rock photo on Track the Rocks, copy its image URL (`/media/rocks/<rock>/<uuid>/webp/<name>.webp`), then run:
  `curl -s -o /dev/null -w "%{http_code}\n" --path-as-is "https://<site>/media/rocks//<rock>/<uuid>/o/<name>.jpg"`
  `curl -s -o /dev/null -w "%{http_code}\n" --path-as-is "https://<site>/media/rocks/<rock>/<uuid>/./o/<name>.jpg"`
  `curl -s -o /dev/null -w "%{http_code}\n" --path-as-is "https://<site>/media/rocks//<rock>/<uuid>/metadata.txt"`
  All three should print `404`. (Try `.jpeg`/`.png` if the original wasn't a jpg; a 404 for every extension is the pass.) The normal webp URL should still load.
- [x] **#3 — music uploads survive the staging cleanup.** On the server, age the temp folder: `touch -d '2 days ago' server/media/.staging/temp`. Trigger the cleanup by uploading a rock with one video over 80MB (that goes through the chunked path). Then confirm `server/media/.staging/temp` still exists, and that adding a song (or changing a song's image) in Admin → Music works.
- [x] **#5 — several mid-sized videos in one upload.** From a phone, through the real site (so Cloudflare is in the path), share a rock with two or three 40–70MB videos. It should succeed, and every video should appear on the journey once processing finishes. Also share a rock with just one or two normal photos, to confirm the everyday path still works.

### Look-ups and decisions needed before the open items

- [x] **#2 — decide on hiding the originals.** Approved: blocked.
- [x] **#2 — confirm after deploying.** Open an Honoring Aiden page, copy an image URL (`/media/honoring-aiden/<id>/webp/image.webp`), swap the end for `o/original.jpg` (try `.jpeg`/`.png`/`.heic` too): every one should be `404`, while the page itself still shows its photos and videos. Same for an album: `/media/albums/<album>/o/<photo>.jpg` → `404`, Photos page still fine.
- [x] **#4 — is Cloudflare proxying the site?** Yes (`Server: cloudflare`; server saw 162.159.114.9 instead of the visitor).
- [x] **#4 — deploy the nginx change on BOTH nodes.** `nginx.conf` is baked into the `client` image, so rebuild/restart it on each node, e.g. `docker compose -f docker-compose-prod.yml up -d --build client`. Nothing changes on Cloudflare; the app server needs no restart. Then open `https://aidensrocks.com/api/location`: `ip` should be your own public IP and `country`/`city` filled in.
- [ ] **#4 — yearly:** compare the `set_real_ip_from` list in `nginx.conf` with https://www.cloudflare.com/ips/.
- [x] **#6 — any duplicate rock numbers in prod?** (0 rows, 2026-10-16) On the prod DB:
  `SELECT rock_number, COUNT(*) FROM catalog GROUP BY rock_number HAVING COUNT(*) > 1;`
  Any rows returned have to be cleaned up before a unique index can be added. Then approve (or not) the unique index.

- [x] **#6 — apply the migration to prod, on BOTH nodes.** It's a schema change, and pglogical doesn't replicate schema changes (see `email-senders-and-site-settings/DEPLOY.md`). First re-run the duplicate check on the node you didn't check (expect 0 rows). Then run `data/sql/migrations/add_catalog_rock_number_unique.sql` on each node, e.g.
  `docker exec -i database sh -c 'psql -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT"' < data/sql/migrations/add_catalog_rock_number_unique.sql`
  Then in Admin → Rocks, try adding a rock number that already exists: it should say "Rock number N already exists." and the existing rock's photo should be unchanged.

- [x] **#15 — run the location backfill, on ONE node only** (it's a data change; pglogical copies it). Do it **after** the #4 nginx deploy, and after the server image is rebuilt (the prod image now includes `scripts/`).
  1. Back up the two tables: `docker exec database sh -c 'pg_dump -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t counter_tracking -t journey_tracking' > pre-geo-backfill.sql`
  2. Preview (writes nothing): `docker exec -it server npm run backfill-geo`. Check the counts look sensible: most blank rows should be "can be filled".
  3. Apply: `docker exec -it server npm run backfill-geo -- --apply`
  4. To undo just the filled rows: `UPDATE counter_tracking SET geo = NULL WHERE geo->>'backfilled' = 'true';` (and the same for `journey_tracking`).

### UI items to eyeball once deployed (Part 2)

- [ ] **#7** — In Admin → Rocks, edit a rock and pick a photo whose QR code is for a *different* rock. The number shown, and the rock the photo is saved under, should both be the rock being edited.
- [ ] **#8** — Map page: pins show and filter correctly by year, including a stop dated January 1, and any new year that appears.
- [ ] **#10** — Track the Rocks: scroll partway down, have someone post a new stop for a rock further down the list, keep scrolling. No rock should appear twice.
