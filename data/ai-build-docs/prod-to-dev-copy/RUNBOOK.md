# Copy Prod Down to Dev — Runbook

One command copies the prod database and media onto the local dev stack
(`docker-compose-dev.yml`, data under `data/test_instance/`):

```bash
bash data/scripts/copy-prod-to-dev.sh             # database + media
bash data/scripts/copy-prod-to-dev.sh --db-only
bash data/scripts/copy-prod-to-dev.sh --media-only
```

Run it from Git Bash on the dev machine. It asks for the prod DB password (or
reads `PROD_DB_PASSWORD`) and confirms before changing anything.

## Before you run it

- Start the dev database: `docker compose -f data/docker-compose/docker-compose-dev.yml up -d postgres`.
- Set up key-based ssh as root to the Proxmox host (`root@192.168.1.55`). `deploy.ps1` uses the same setup.
- Set `MAILPIT_ENABLED=true` in `data/docker-compose/.env`. The script refuses to run without it.

## What it does

1. **Guards.** It stops before touching anything when:
   - dev mail isn't routed to Mailpit;
   - dev `DB_HOST` is a prod address;
   - the target `database` container has pglogical installed (that means it's a prod container).
2. **Stops the dev `server` container** if it's running, and starts it again at the end.
3. **Database.**
   - Runs `pg_dump -Fc` from prod node 1 (`192.168.1.57`), using the dev container's own `pg_dump`.
   - Backs up the current dev DB.
   - Drops and recreates the dev DB, then runs `pg_restore`. Every `pglogical` item is filtered out, because dev's stock postgres doesn't have it.
   - Both dumps go to `data/test_instance/sql_backup/`: `prod_copy_<ts>.dump` and `dev_before_prod_copy_<ts>.dump`.
4. **Media.**
   - Streams `tar` of `/mnt/aidensrocks/prod/media` from CT 1057 over ssh into `test_instance/media_incoming`. It skips `temp/` and `.staging/`.
   - Checks that the copy has a `rocks/` folder.
   - Moves the old dev media to `test_instance/media_before_prod_copy`, replacing the previous one, then moves the new media in.

Prod is read-only throughout: a `pg_dump` and a `tar` read. Nothing is written there.

## After a copy

- **Schema.** Dev now has prod's schema. Re-run any `data/sql/migrations/*.sql`
  that isn't deployed to prod yet.
- **Accounts.** Prod accounts come across, with their password hashes. You sign
  in on dev with your prod password. Old dev-only accounts are gone. Prod JWTs
  don't work on dev because dev uses a different `JWT_SECRET`.
- **Email.** The data has real visitors' email addresses. Every email dev sends
  (scheduled jobs, rock-moved notices, resets) lands in Mailpit at `:8025`.
  That's why the Mailpit guard exists.
- **Keys.** Dev doesn't replicate, so the prod key ranges don't matter there.
  `sequenceOffset.sql` isn't needed.

## Rolling back dev

```bash
docker exec database psql -U postgres -d postgres -c 'DROP DATABASE aidensrocks WITH (FORCE);' -c 'CREATE DATABASE aidensrocks;'
docker exec database pg_restore -U postgres -d aidensrocks --no-owner /backup/dev_before_prod_copy_<ts>.dump
```

To roll back media, swap `test_instance/media_before_prod_copy` back into `test_instance/media`.

## Overrides (env vars)

| Var | Default |
| --- | --- |
| `PROD_DB_HOST` / `PROD_DB_PORT` / `PROD_DB_USER` / `PROD_DB_NAME` | `192.168.1.57` / `5432` / `postgres` / `aidensrocks` |
| `PROD_SSH` / `PROD_CT` | `root@192.168.1.55` / `1057` (node 2: `root@192.168.1.65` / `1067`) |
| `PROD_MEDIA` | `/mnt/aidensrocks/prod/media` |
| `SSH_KEY` | `~/.ssh/id_ed25519` |
