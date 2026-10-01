-- Adds the setting table (App Settings feature): a generic key/value store
-- for admin-managed settings, one row per named setting. value is jsonb so
-- any JSON shape (object, string, number, boolean) fits without a separate
-- parse-type column; `type` instead says what kind of setting a row is
-- (e.g. 'admin-job'). First user: the "Create QR Codes (Center Label)" job
-- saves its controls under name 'qr-center-label' so they survive a reload.
-- Read/written via server/src/routes/settingsAdmin.js.
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent) if a deploy step fails partway through.

CREATE TABLE IF NOT EXISTS public.setting (
    id           serial PRIMARY KEY,
    name         character varying(100) NOT NULL UNIQUE,
    value        jsonb NOT NULL,
    type         character varying(50) NULL,
    description  text NULL,
    create_dt    timestamptz DEFAULT CURRENT_TIMESTAMP,
    update_dt    timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- pglogical replication set: settings should be identical on both nodes, so
-- this brand-new table needs a one-time registration, distinct from the
-- CREATE TABLE step above. Per this repo's established pattern (see
-- add_path_display_name_table.sql), run this once, on the PROVIDER node
-- only, after CREATE TABLE has been applied on both nodes.
--
-- synchronize_data := false is explicit and intentional: this table has
-- zero rows at creation time, so there's nothing to sync.
-- SELECT pglogical.replication_set_add_table('default', 'setting', synchronize_data := false);
