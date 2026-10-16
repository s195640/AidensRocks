# Deploying the Request A Rock dialog settings (0.16.0) to prod

Prod's two database nodes replicate to each other with pglogical (Node A, Node B). Schema changes run on **both** nodes; data changes run on **one** node only.

| Step | File (`data/sql/migrations/0.16-request-rock-dialog/`) | Run on | When |
|---|---|---|---|
| 01 | `01_bothservers_add_page_content_settings_columns.sql` | **both** servers | before the code |
| 02 | `02_oneserver_add_request_a_rock_dialog.sql` | **Node A only** | after the code is live on both |

**Order: step 01 (both) → code → step 02 (Node A).**
- The new code reads the new columns, so step 01 must come first.
- Step 02 must come after the code: the old code would list the new row as a page in the public navbar.
- Until step 02 runs, the dialog shows its built-in wording, with the usual 100-rock limit.

## 1. Pre-checks (both nodes)

```sql
SELECT subscription_name, status FROM pglogical.show_subscription_status();  -- 'replicating'
SELECT column_name FROM information_schema.columns
WHERE table_name = 'page_content' AND column_name LIKE '%_settings';           -- 0 rows
```

Back up `page_content` on each node: `pg_dump -U <user> -d aidensrocks -t page_content > pre-0.16-<node>.sql`

## 2. Step 01 on Node A, then Node B

Check on each (expect 2 rows):
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'page_content' AND column_name IN ('draft_settings', 'published_settings');
```

## 3. Deploy the code (both servers)

Smoke check: the Request A Rock dialog opens and looks the same as before.

## 4. Step 02 on Node A only

Check on **both** nodes (expect 1 row each, replicated to Node B):
```sql
SELECT page_slug, published_settings FROM page_content WHERE page_slug = 'request-a-rock';
```

Then check Admin → Page Details: a **Dialogs** table with Request A Rock, and nothing new in the public navbar.

## Rollback

- Code: redeploy the previous release. It ignores the new columns.
- Data: `DELETE FROM page_content WHERE page_slug = 'request-a-rock';` on Node A only. This has to happen **before** the old code is back, or the row shows in the navbar.
- The columns can stay. To drop them, run `ALTER TABLE page_content DROP COLUMN draft_settings, DROP COLUMN published_settings;` on both nodes after the rollback.
