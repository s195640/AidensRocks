# Prod to Dev Copy — Summary Issue Log

## Session 1 (2026-10-18) — script + runbook. NOT YET RUN AGAINST PROD
**Done:**
- `data/scripts/copy-prod-to-dev.sh` and `RUNBOOK.md`. VERSION 0.17.0.

**Choices made without asking (minor, revisit if wrong):**
- The source is node 1, for both the DB (`192.168.1.57`) and the media (CT 1057).
- The pglogical extension/schema is filtered out at restore time with a `pg_restore -L` list. That works with any pg_dump version, unlike `--exclude-extension`.
- No data scrubbing. Dev is guarded by `MAILPIT_ENABLED=true` instead, so real addresses never get mail from dev.
- Media is a full `tar` over ssh each run, not an incremental copy. Git Bash on Windows has no rsync.
- The dev DB and media are backed up before they're replaced. Only one old media copy is kept.

**Open:**
- Verified only with `bash -n`. The first real run should be watched.
