# Deploying Site Tracking (0.15.x) to prod

Prod runs two database nodes that **replicate to each other** with pglogical (call them **Node A** and **Node B**). pglogical copies row changes, not schema changes, so:

- **Schema changes (CREATE TABLE / INDEX)** must be run by hand on **both** nodes.
- **Replication-set registration** of a new table must also be done on **both** nodes. Each node only sends changes for tables in its own set, and the new tables are written on whichever node handles the request.
- **Data changes (INSERT/UPDATE)** must be run on **one** node only; replication copies them to the other. Running them on both creates the same rows twice and conflicts.
- A node must have the new tables **before** it receives replicated rows for them. So: schema on both, then registration on both, then data on one.

The database changes are five step files in **`data/sql/migrations/0.15-site-tracking/`**. The file name says the order and where it runs:

| Step | File | Run on |
|---|---|---|
| 01 | `01_bothservers_create_site_tracking_tables.sql` (`visit`, `site_event`) | **both** servers |
| 02 | `02_bothservers_create_error_tracking_tables.sql` (`server_error`, `error_group`) | **both** servers |
| 03 | `03_bothservers_add_tables_to_replication.sql` | **both** servers |
| 04 | `04_oneserver_add_error_email_templates.sql` (2 email templates) | **Node A only** |
| 05 | `05_oneserver_import_legacy_visits.sql` (old Home-page visits) | **Node A only**, after the code is live (section 9) |

**The rule:** run each step on every server its name says (Node A, then Node B). Check it, and only then start the next step. Each file does one kind of thing: schema only, replication only, or data only.

The old code never touches the new tables, so the database can be migrated while the current version is running. The new code works without them too: tracking inserts and error recording fail quietly into the server log, and nothing a visitor sees breaks. But until the tables exist, nothing is recorded and Site Health shows an error. Order: **database (steps 01–04) → env → code → step 05**.

---

## 0. Before you start

1. Commit/tag the release so you can roll back to a known version.
2. Back up the one existing table this touches, on **each** node:
   ```
   pg_dump -U <user> -d aidensrocks -t page_content > pre-0.15-<node>.sql
   ```
3. Pick a quiet time. Nobody should be editing Page Details during the window.

## 1. Pre-checks (read-only, on BOTH nodes)

```sql
-- Replication healthy? Both should show status = 'replicating'.
SELECT subscription_name, status FROM pglogical.show_subscription_status();

-- Not already migrated? Expect 0 rows on each node.
SELECT tablename FROM pg_tables
WHERE tablename IN ('visit', 'site_event', 'server_error', 'error_group');

-- Templates not already there? Expect 0 rows on each node.
SELECT page_slug FROM page_content
WHERE page_slug IN ('error-new-email', 'error-daily-summary-email');
```

**Stop here if:**
- Replication isn't healthy.
- The two nodes give different answers. Find out why first.

## 2. Step 01, on BOTH servers

Run `01_bothservers_create_site_tracking_tables.sql` on **Node A**, then on **Node B**.

Check on each server (expect 2 rows):
```sql
SELECT tablename FROM pg_tables WHERE tablename IN ('visit', 'site_event');
```

## 3. Step 02, on BOTH servers

Run `02_bothservers_create_error_tracking_tables.sql` on **Node A**, then on **Node B**.

Check on each server (expect 2 rows, then 1 row):
```sql
SELECT tablename FROM pg_tables WHERE tablename IN ('server_error', 'error_group');
SELECT indexname FROM pg_indexes WHERE indexname = 'idx_site_event_error_fingerprint';
```

## 4. Step 03, on BOTH servers

Only after steps 01 and 02 are done on **both** servers. Run `03_bothservers_add_tables_to_replication.sql` on **Node A**, then on **Node B**.

Check on each server (expect all 4 names):
```sql
SELECT DISTINCT set_reloid::regclass AS tbl FROM pglogical.replication_set_table
WHERE set_reloid::regclass::text IN ('visit', 'site_event', 'server_error', 'error_group');
```

If a server says a table is already in the set, that one is done: run the file's remaining lines.

## 5. Step 04, on Node A ONLY

Run `04_oneserver_add_error_email_templates.sql` on **Node A only**. **Never on Node B.**

Wait about a minute, then check on **both** servers. The results should be identical: 2 rows, each with a Send To of `failures@aidensrocks.com`.
```sql
SELECT page_slug, nav_label, published_email_to FROM page_content
WHERE page_slug IN ('error-new-email', 'error-daily-summary-email')
ORDER BY page_slug;
```

**If Node B doesn't have the rows after a few minutes:** don't run step 04 on Node B. Check replication status (step 1) and wait. Running it there would create the rows twice.

## 6. Env

On **one** node's `.env` only (say Node A), add:
```
RUN_SCHEDULED_JOBS=true
```
This node sends the daily error summary. If both nodes had it, the summary would go out twice.

Optional, on that same node:
```
SITE_TIMEZONE=America/New_York   # timezone for the daily summary (default America/New_York)
DAILY_SUMMARY_HOUR=8             # local hour it goes out (default 8)
```

## 7. Code

Rebuild and restart **both** images on each node: server (new `source-map` dependency) and client (version baked into the build, source maps, nginx config).
```
docker compose -f docker-compose-prod.yml up -d --build server client
```
This creates the new `volume-sourcemaps` volume the first time. The client container copies its source maps into it on start, and the server reads them from there.

## 8. Smoke checks

1. **Tracking:** open the site on your phone and click through a couple of pages, then check on **both** nodes. Expect your visit, on both nodes (replication works both ways for the new tables):
   ```sql
   SELECT id, landing_path, platform, is_internal, started_at FROM visit ORDER BY started_at DESC LIMIT 3;
   SELECT type, path FROM site_event ORDER BY created_at DESC LIMIT 10;
   ```
   A visit from your home network shows `is_internal = true`. That's expected; turn on **Include internal** on the dashboard to see it.
2. **Site Health:** Admin → Dashboard → Site Health loads. It's probably empty, which is fine.
3. **Source maps:**
   - They're private: `https://aidensrocks.com/assets/<any .js file>.map` must return **404**.
   - They reached the server: `docker exec server ls /app/sourcemaps` lists this version.
4. **Emails:** Page Details shows the two new templates. Use **Send** on each to check they arrive in Gmail.
5. **Daily summary:** on the node with `RUN_SCHEDULED_JOBS=true`, the server log says `Scheduled jobs running (daily error summary).` The other node must **not** say it.

## 9. Step 05, on Node A ONLY: import the old visits

Run this after smoke check 1 has shown your visit, so the new tracker has started recording. The step copies only old `counter_tracking` rows from **before** the new tracker's first visit, so the two never count the same visit twice.

Run `05_oneserver_import_legacy_visits.sql` on **Node A only**. **Never on Node B.** Re-running it on Node A adds nothing.

Wait about a minute, then check on **both** servers. The numbers should be identical:
```sql
SELECT COUNT(*) AS visits, MIN(started_at) AS first, MAX(started_at) AS last
  FROM visit WHERE client_version = 'legacy-import';
SELECT COUNT(*) AS page_views FROM site_event WHERE meta->>'imported' = 'true';
```
`visits` and `page_views` match. They're a little under the old `counter_tracking` count, because bots are skipped. Admin → Activity → Visitors on **All** now goes back to the first old visit.

## Rollback

- **Code:** redeploy the previous tag. The old code ignores the new tables, so they can stay.
- **Templates:** if you need them gone, delete the two `page_content` rows on **one** node only (they replicate). Back up first.
- **Imported visits:** run the two `DELETE`s in step 05's header on **one** node only (they replicate).
- **Tables:** leave them. Dropping them needs the replication-set removal on both nodes first, and there's no need while the old code ignores them.

## Notes on the two-way replication

- `visit`, `site_event` and `server_error` are insert-only with random UUID keys, so the two nodes can never write the same row.
- `error_group` is keyed by the error's fingerprint. If **both** nodes saw the same brand-new error at the same instant, both would insert it. pglogical's conflict handling keeps one row (it doesn't stop replication), and at worst the new-error email goes out twice. That's only possible if both nodes take traffic at once.
- Status changes on the dashboard (`error_group` updates) are last-writer-wins, which is harmless for a status.
- The daily-summary "last run" date is a `setting` row written only by the node with `RUN_SCHEDULED_JOBS=true`.
