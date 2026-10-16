# Deploying the bug sweep to prod (0.12.9 → 0.13.x)

Everything fixed so far in `todo.md`: **#1, #2, #3, #4, #5, #6, #15**. The rest (#7–#14) isn't done yet and isn't part of this deploy.

| # | What | Where it lives | Deploy step |
|---|---|---|---|
| 1 | Rock originals no longer reachable with `//` or `./` in the URL | server (`app.js`) | 3 |
| 2 | Honoring Aiden + album originals (`o/`) no longer served | server (`app.js`) | 3 |
| 3 | Music uploads no longer break after the staging cleanup | server (`uploadRock.js`, `middleware/upload.js`) | 3 |
| 4 | Server sees the visitor's real IP, not Cloudflare's | client image (`data/nginx/nginx.conf`) | 3 |
| 5 | Several mid-sized videos in one upload no longer hit Cloudflare's 100MB cap | client (`UploadRockForm.jsx`) | 3 |
| 6 | Rock numbers must be unique | database (both nodes) + server + client | 2, 3 |
| 15 | Fill in the blank visitor locations saved so far | one-time script (one node) | 5 |

Prod runs two database nodes that replicate to each other with pglogical (**Node A** and **Node B**). Same rules as every deploy:

- **Schema changes** (the #6 constraint) run by hand on **both** nodes. pglogical doesn't copy them.
- **Data changes** (the #15 backfill) run on **one** node only. Replication copies them.

Nothing changes on Cloudflare, and there are no `.env` changes.

Order: **database → code → checks → backfill.**

---

## 0. Before you start

1. Commit/tag `0.13.x` (see `VERSION`) so you can roll back to a known version. The last deployed version is `0.12.9`.
2. Pick a quiet time. Nobody should be adding rocks in Admin → Rocks during step 2.
3. Back up the three tables this touches, on **each** node:
   ```bash
   docker exec database sh -c 'pg_dump -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -t catalog -t counter_tracking -t journey_tracking' > pre-0.13-<node>.sql
   ```

## 1. Pre-checks (read-only, on BOTH nodes)

Open psql on each node:
```bash
docker exec -it database sh -c 'psql -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT"'
```
```sql
-- Replication healthy? Should show status = 'replicating'.
SELECT subscription_name, status FROM pglogical.show_subscription_status();

-- Any duplicate rock numbers? Expect 0 rows. (Node A returned 0 on 2026-10-16.)
SELECT rock_number, COUNT(*) FROM catalog GROUP BY rock_number HAVING COUNT(*) > 1;
```

**Stop here if** replication isn't healthy, or either node returns duplicate rows. Duplicates have to be cleaned up first; send the results over and we'll pick which copy to keep.

## 2. Schema: the #6 constraint, on BOTH nodes

From the repo root, first on Node A, then on Node B:
```bash
docker exec -i database sh -c 'psql -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT"' < data/sql/migrations/add_catalog_rock_number_unique.sql
```
It's safe to re-run. It fails, changing nothing, if duplicates exist.

Check on each node (expect 1 row):
```sql
SELECT conname FROM pg_constraint WHERE conname = 'catalog_rock_number_key';
```

The current 0.12.9 code works fine with the constraint in place: a duplicate rock just fails to save instead of being created. So this can go in before the code.

## 3. Code: deploy 0.13.x, one app server at a time

From `data/docker-compose/`, on the first app server:
```bash
docker compose -f docker-compose-prod.yml up -d --build server client
```
`--build` is required for both:
- **server:** the fixes for #1, #2, #3 and #6, and the image now also includes `scripts/` (needed for step 5, and for `npm run create-admin`).
- **client:** the #5 upload change, the #6 error message, and the **nginx config** for #4. nginx.conf is built into the client image.

Check it before doing the second server:
```bash
docker compose -f docker-compose-prod.yml ps                      # server and client are "Up", not restarting
docker exec client nginx -t                                       # "syntax is ok" / "test is successful"
docker compose -f docker-compose-prod.yml logs --tail=50 server   # no "Cannot find module" or SQL errors
docker compose -f docker-compose-prod.yml logs --tail=50 client   # no nginx "emerg" errors
```
The `listen ... http2 is deprecated` warnings were already there; ignore them.

Then repeat on the second app server.

## 4. Smoke test (about 15 minutes)

`<rock>`, `<uuid>` and `<name>` come from any real photo: open Track the Rocks, right-click a photo → Copy image address. It looks like `/media/rocks/<rock>/<uuid>/webp/<name>.webp`.

1. **#4 — real visitor IP.** Open `https://aidensrocks.com/api/location`. `ip` should be **your own** public IP (compare with any "what is my IP" site), with `country`/`city` filled in. Before this deploy it showed a Cloudflare address (`162.159.x.x`) with blank fields.
2. **#1 — rock originals stay hidden.** Each of these should print `404`:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" --path-as-is "https://aidensrocks.com/media/rocks//<rock>/<uuid>/o/<name>.jpg"
   curl -s -o /dev/null -w "%{http_code}\n" --path-as-is "https://aidensrocks.com/media/rocks/<rock>/<uuid>/./o/<name>.jpg"
   curl -s -o /dev/null -w "%{http_code}\n" --path-as-is "https://aidensrocks.com/media/rocks//<rock>/<uuid>/metadata.txt"
   ```
   If the original wasn't a jpg, try `.jpeg`/`.png`/`.mov`; every one should be 404. The normal `.../webp/<name>.webp` URL should still load.
3. **#2 — Honoring Aiden and album originals stay hidden.**
   - Open an Honoring Aiden page and copy an image address (`/media/honoring-aiden/<id>/webp/image.webp`). Swap the end for `o/original.jpg` (also try `.jpeg`/`.png`/`.heic`): every one should be **404**.
   - Do the same for an album photo: `/media/albums/<album>/o/<photo>.jpg` → **404**.
   - The Honoring Aiden pages and the Photos page still show all their photos and videos.
4. **#3 and #5 together — staging cleanup + mid-sized videos.** Run the `docker exec` commands on the app server that's **currently serving the site** (the one holding the keepalived address), since that's where the upload lands.
   1. Age the music temp folder so the cleanup would have deleted it:
      ```bash
      docker exec server touch -d '2 days ago' /app/media/.staging/temp
      ```
   2. From a **phone**, on the real site, share a rock with **rock number 0** and two or three **40–70MB videos**. Rock 0 stays hidden and emails no followers or submitter; the family's New Rock Journey email still comes. This upload also runs the staging cleanup.
   3. It should finish with the thank-you message. In **Admin → Journey**, the rock-0 post should list every video, each processed (thumbnail showing).
   4. The music temp folder must still exist:
      ```bash
      docker exec server ls -ld /app/media/.staging/temp
      ```
   5. Optional: in Admin → Music, edit a song and re-upload its current cover image. It should save.
   6. Delete the test post in Admin → Journey (that also removes its files).
   7. Share one ordinary photo the same way (rock 0) to confirm the everyday path still works, then delete it.
5. **#6 — duplicate rock numbers.** In Admin → Rocks → Add, add one rock using a number that **already exists**, with any photo. It should say **"Rock number N already exists."**, nothing is created, and that rock's existing photo is unchanged.

## 5. Data: the #15 location backfill, on ONE node only

Only after step 4.1 passes. That confirms new visits get real locations, and the saved IPs being looked up here are the same kind.

On **Node A only**:

1. **Preview** (writes nothing):
   ```bash
   docker exec -it server npm run backfill-geo
   ```
   For site visits and rock uploads it prints how many locations are blank, how many **can be filled**, how many have no IP saved, and how many have an IP that can't be placed. Most blank rows should be "can be filled". If most are "IP can't be placed", stop and send the numbers over.
2. **Apply:**
   ```bash
   docker exec -it server npm run backfill-geo -- --apply
   ```
3. **Check it replicated.** Wait about a minute, then on **both** nodes the counts should match:
   ```sql
   SELECT
     (SELECT COUNT(*) FROM counter_tracking WHERE geo->>'backfilled' = 'true') AS visits,
     (SELECT COUNT(*) FROM journey_tracking WHERE geo->>'backfilled' = 'true') AS uploads;
   SELECT subscription_name, status FROM pglogical.show_subscription_status();  -- still 'replicating'
   ```
   If Node B is behind, don't run the script there. Check `show_subscription_status()` and the Postgres log first.

## 6. After it's working

- Check off the Manual checks in `todo.md` (#1, #2, #3, #4, #5, #6, #15).
- **Once a year:** compare the `set_real_ip_from` list in `data/nginx/nginx.conf` with https://www.cloudflare.com/ips/. If Cloudflare adds a range, visitors coming through it would show as Cloudflare again (and share a rate limit) until it's added.

## Rollback

| Problem | Fix |
|---|---|
| Site down after step 3 (client restarting) | Almost certainly nginx. `docker compose -f docker-compose-prod.yml logs client` shows the line. Redeploy the `0.12.9` commit's client: `up -d --build client`. |
| Something else broken in the new code | Redeploy the `0.12.9` commit (`up -d --build server client`). **No database rollback is needed:** 0.12.9 works with the constraint, and with backfilled locations. |
| Backfilled locations look wrong | On **one** node: `UPDATE counter_tracking SET geo = NULL WHERE geo->>'backfilled' = 'true';` and the same for `journey_tracking`. Replication copies it. Only the backfilled rows are touched. |
| Need to remove the #6 constraint | On **both** nodes: `ALTER TABLE catalog DROP CONSTRAINT catalog_rock_number_key;` |

Don't restore the step-0 backups on both nodes. If a restore is ever needed, do it on **one** node and let it replicate.

---

# Part 2: 0.13.8 → 0.13.10 (#7–#14)

**Code only.** No database changes, no backfill, no nginx or Cloudflare changes, no `.env` changes. Nothing to run on the database nodes.

| # | What |
|---|---|
| 7 | Rock edit: a photo whose QR code is for a different rock is refused (it used to show the wrong number, then save onto the rock being edited) |
| 8 | Map: the year comes from the server (January 1 stops no longer land in the previous year), and there's one "Show YYYY Rocks" switch per year that has pins (2027 appears on its own) |
| 9 | My Rocks "last location" only uses stops the public can see |
| 10 | Track the Rocks no longer shows a rock twice when someone posts while you scroll |
| 11 | Deleting an album renumbers hidden albums too (no duplicate positions) |
| 12 | Deleting one photo from a journey (Admin → Journey) also deletes its files |
| 13 | A bad date or non-numeric id gets a 400 "invalid" reply instead of a 500 |
| 14 | The public counters (visits, path hits, song plays, Honoring Aiden views) are limited to 120 per visitor per 15 minutes |

## 1. Deploy, one app server at a time

From `data/docker-compose/`:
```bash
docker compose -f docker-compose-prod.yml up -d --build server client
```
Same checks as Part 1, step 3 (`ps`, `docker exec client nginx -t`, server and client logs), then the second server.

## 2. Smoke test (about 5 minutes)

1. **#8 — Map.** Open the map → ⚙ Map Filters. There's a "Show YYYY Rocks" switch for each year that has pins (today 2025 and 2026). Turning one off hides that year's pins.
2. **#7 — Rock edit.** Admin → Rocks → edit a rock → choose a photo of a *different* rock's QR code. It says "This photo's QR code is for rock N, but you're editing rock M…", the number shown doesn't change, and Save doesn't replace the photo. Cancel.
3. **#9 — My Rocks.** Signed in, My Rocks shows each followed rock's last location as before.
4. **#12 — Journey photo delete** (only if you have a photo you want gone anyway). Admin → Journey → open a post → delete one photo. The others stay, and the deleted one no longer appears anywhere.
5. **#14 — counter limits.** This hits a page that doesn't exist, so it counts nothing:
   ```bash
   curl -s -D - -o /dev/null -X POST https://aidensrocks.com/api/honoring-aiden/entries/no-such-entry/view | grep -i ratelimit
   ```
   It should print `RateLimit-Policy` / `RateLimit` lines.

#10, #11 and #13 are covered by the automated tests and need no manual check.

## Rollback

Redeploy the `0.13.8` commit (`up -d --build server client`). Nothing in the database depends on 0.13.10.
