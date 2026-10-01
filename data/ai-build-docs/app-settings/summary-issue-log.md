# App Settings — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase.

## Phase 1 — Generic `setting` table + saved QR Center Label controls (2026-10-01)
**Status:** Complete (migration must be run by hand; awaiting manual testing)
**Files changed:**
- New: `data/sql/migrations/add_setting_table.sql`, `server/src/routes/settingsAdmin.js`, this file
- Changed: `data/sql/createdb.sql`, `server/src/app.js`, `client/src/admin/components/create-qr-codes-center-label/CreateQRCodesCenterLabel.jsx` (+ `.module.css`), `CLAUDE.md`, `VERSION`

**Summary:**
- New generic key/value table `setting` with columns `id`, `name` (unique, max 100 chars), `value` (jsonb), `type` (a category like `admin-job`, not a parse type), `description`, `create_dt` and `update_dt`. It is replicated via pglogical; the migration has the usual commented `replication_set_add_table` line, run on the provider only.
- New admin-only API (`requireAdminAuth`):
  - `GET /api/admin/settings/:name` returns the row, or 404 if it has never been saved.
  - `PUT /api/admin/settings/:name` takes `{ value, type?, description? }` and upserts with `ON CONFLICT (name)`. If `type` or `description` is omitted, the existing values are kept.
  - Validation: names must match `[a-z0-9._-]{1,100}`, the value is required, and it is capped at 64KB.
- The "Create QR Codes (Center Label)" job loads the `qr-center-label` setting on open and auto-saves 1 second after any change. A small "Saved" / "Couldn't save settings" note appears next to the buttons.
  - Saving waits until the load finishes, so the starting defaults never overwrite stored values.
  - Loaded values pass through `sanitizeSaved`. Only known keys of the right type are kept, and choice fields (fonts, shape, error-correction level) must be a currently valid option. Anything else falls back to `DEFAULTS`, so new controls or removed fonts can't break the page.
  - Start rock is not saved; it still defaults to the highest rock number + 1. "How many" is saved. Reset restores the defaults, which are then saved.
- CLAUDE.md: replaced the outdated "Admin auth is a stub" note with the current JWT setup, and added a note pointing to the settings store.
- **VERSION:** `0.6.3` → `0.7.0` (new feature folder).

**Deploy steps:**
1. Run `add_setting_table.sql` (the CREATE TABLE part) on the provider node, then on the subscriber node.
2. Run the commented `SELECT pglogical.replication_set_add_table('default', 'setting', synchronize_data := false);` on the provider only.

**Issues/gotchas encountered:** None.
