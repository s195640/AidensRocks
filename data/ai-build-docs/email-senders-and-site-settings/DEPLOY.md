# Deploying 0.12.x to prod (from 0.11.2)

Prod runs two database nodes that **replicate to each other** with pglogical (call them **Node A** and **Node B**). pglogical copies row changes, not schema changes, so:

- **Schema changes (ALTER TABLE)** must be run by hand on **both** nodes.
- **Data changes (INSERT/UPDATE)** must be run on **one** node only; replication copies them to the other.
- A node must have the new columns **before** it receives replicated rows that use them. That's why schema goes on both nodes first, then data.

The new columns are nullable and the 0.11.2 code never reads them, so the database can be migrated while 0.11.2 is still running. The new code **does** need them: deploying it first would break every email send and Page Details. Order: **database → env → code**.

---

## 0. Before you start

1. Commit/tag `0.12.x` so you can roll back to a known version.
2. Resend: `aidensrocks.com` shows **Verified**, and you have a **new** API key. Rotate the one that was shared in chat.
3. Domain forwarding: send a normal email to `requests@`, `journeys@`, `failures@` and `aidensfamily@aidensrocks.com` from any mailbox and check that all four arrive in Gmail. **This step matters:** the admin alerts will go to these addresses.
4. Back up the two tables this touches, on **each** node:
   ```
   pg_dump -U <user> -d aidensrocks -t page_content -t setting > pre-0.12-<node>.sql
   ```
5. Pick a quiet time. Nobody should be editing Page Details during the window.

## 1. Pre-checks (read-only, on BOTH nodes)

```sql
-- Replication healthy? Both should show status = 'replicating'.
SELECT subscription_name, status FROM pglogical.show_subscription_status();

-- 0.11.2's migration present? Expect 2 rows on each node.
SELECT page_slug FROM page_content
WHERE page_slug IN ('upload-files-failed-email', 'upload-processing-failed-email');

-- page_content and setting are replicated? Expect both names on each node.
SELECT DISTINCT set_reloid::regclass AS tbl FROM pglogical.replication_set_table
WHERE set_reloid::regclass::text IN ('page_content', 'setting');
```

**Stop here if:**
- Replication isn't healthy.
- Either node is missing the 0.11.2 rows. Run `add_upload_failure_email_templates.sql` on **one** node, wait, and re-check.
- `setting` isn't in the replication set on both nodes. Register it first, the same way `add_setting_table.sql` did, on whichever node lacks it.

## 2. Schema: PART 1 of the migration, on BOTH nodes

Run only the **PART 1** section of `data/sql/migrations/add_email_sender_columns.sql` (the 6 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` lines): first on Node A, then on Node B.

Check on each node (expect 6 rows):
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'page_content'
  AND column_name IN ('draft_email_from', 'published_email_from', 'draft_email_reply_to',
                      'published_email_reply_to', 'draft_email_to', 'published_email_to');
```

## 3. Data: PART 2 of the migration, on ONE node only

Run only the **PART 2** section (the `UPDATE ... FROM (VALUES ...)` and the `INSERT INTO public.setting`) on **Node A only**.

Wait about a minute, then check on **both** nodes. The results should be identical:
```sql
SELECT page_slug, published_email_from, published_email_reply_to, published_email_to
FROM page_content WHERE published_email_from IS NOT NULL ORDER BY page_slug;   -- 11 rows

SELECT name, value FROM setting WHERE name = 'contact-email';                   -- 1 row
SELECT subscription_name, status FROM pglogical.show_subscription_status();     -- still 'replicating'
```

If Node B is missing the rows, don't re-run PART 2 there. Check `show_subscription_status()` and the Postgres log for a replication error first.

## 4. Env: prod `data/docker-compose/.env`

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASSWORD=<new Resend API key>
EMAIL_FROM=Aiden's Rocks <noreply@aidensrocks.com>
ADMIN_ALERT_EMAIL=AidensRocks.AAA@gmail.com
```
- Remove `EMAIL_USER`, `EMAIL_PASSWORD` and `EMAIL_REPLY_TO`.
- `EMAIL_FROM` has **no quotes**; docker compose rejects a quoted name followed by `<…>`.
- Make sure `MAILPIT_ENABLED` is **not** set in prod.
- Check that compose reads the file without errors:
  ```
  docker compose -f docker-compose-prod.yml config > /dev/null && echo OK
  ```

## 5. Code: deploy 0.12.x

From `data/docker-compose/`, on each app server:
```
docker compose -f docker-compose-prod.yml up -d --build server client
```
`--build` is required: the image must install the new `html-to-text` package and include the new client build. `up -d` also picks up the `.env` changes.

Check that the server started: `docker compose -f docker-compose-prod.yml logs --tail=50 server`. There should be no `Cannot find module` or SQL errors.

## 6. Smoke test (about 10 minutes)

1. **Admin → Page Details → Emails:** the Sender / Reply-To / Send To columns show the seeded values.
2. **Admin → Settings:** Contact email shows `aidensfamily@aidensrocks.com`.
3. **Contact Us** popup on the public site shows `aidensfamily@aidensrocks.com`.
4. **Test sends:** test-**Send** "Verify Account Email" to your own Gmail. Then open it → ⋮ → **Show original**:
   - From is `noreply@aidensrocks.com`.
   - **SPF, DKIM and DMARC: PASS**.
5. **Request path:** submit a real Request A Rock. It should arrive from `Aiden's Rocks – Requests` via `requests@` forwarding. Then delete the test request in admin.
6. **Spam score:** send a verify email to the address **mail-tester.com** gives you. Aim for 9/10 or higher.
7. Resend dashboard → **Emails** shows them as delivered.

## 7. After it's working

- **Share Your Rock:** Page Details → Share Your Rock → replace the typed Gmail address with **Insert ▾ → Contact Email (link)**, then Save and Publish.
- **Old Gmail app password:** revoke it in your Google Account → Security → App passwords.
- **Watch for a day or two:** Resend dashboard (bounces/complaints), and that admin alerts arrive.

## Rollback

| Problem | Fix |
|---|---|
| Emails not sending after step 5 | Check `logs server` for the SMTP error. To go back to Gmail fast: restore the old `.env` lines (`EMAIL_USER`/`EMAIL_PASSWORD`), remove `SMTP_HOST`, then `up -d --force-recreate server`. |
| Something broken in the new code | Redeploy the `0.11.2` commit (`up -d --build`). The new columns and setting row are additive, and 0.11.2 ignores them, so **no database rollback is needed**. |
| Data looks wrong | Fix it in Page Details / Admin → Settings. Or, as a last resort, restore `page_content`/`setting` from step 0's backup on **one** node and let it replicate. Don't restore on both. |

Don't drop the new columns as a rollback. They're harmless to old code, and dropping them on one node while the other still has them would break replication.
