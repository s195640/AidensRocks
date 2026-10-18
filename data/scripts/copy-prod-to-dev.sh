#!/usr/bin/env bash
# Copy prod (database + media) down to the local dev stack
# (docker-compose-dev.yml). Prod is only read: pg_dump over the LAN and a tar
# of the media folder over ssh. Everything written is on the dev side.
#
#   bash data/scripts/copy-prod-to-dev.sh             # database + media (same as --all)
#   bash data/scripts/copy-prod-to-dev.sh --db-only
#   bash data/scripts/copy-prod-to-dev.sh --media-only
#   bash data/scripts/copy-prod-to-dev.sh --yes       # skip the confirm prompt
#
# Prod DB password: PROD_DB_PASSWORD env var, or it prompts.
# See data/ai-build-docs/prod-to-dev-copy/RUNBOOK.md.
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash: don't rewrite /backup/... container paths

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEV_ENV="$ROOT/data/docker-compose/.env"
INSTANCE="$ROOT/data/test_instance"

# Prod source -- node 1 (pglogical keeps both nodes' rows identical).
PROD_DB_HOST="${PROD_DB_HOST:-192.168.1.57}"
PROD_DB_PORT="${PROD_DB_PORT:-5432}"
PROD_DB_USER="${PROD_DB_USER:-postgres}"
PROD_DB_NAME="${PROD_DB_NAME:-aidensrocks}"
PROD_SSH="${PROD_SSH:-root@192.168.1.55}"      # Proxmox host (as in deploy.ps1)
PROD_CT="${PROD_CT:-1057}"                     # LXC container on that host
PROD_MEDIA="${PROD_MEDIA:-/mnt/aidensrocks/prod/media}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
PROD_IPS="192.168.1.57 192.168.1.47 192.168.1.40 192.168.1.55 192.168.1.65"

DO_DB=1; DO_MEDIA=1; YES=0
for a in "$@"; do
  case "$a" in
    --db-only)    DO_MEDIA=0 ;;
    --media-only) DO_DB=0 ;;
    --yes)        YES=1 ;;
    --all)        ;;
    *) echo "Unknown option: $a"; exit 1 ;;
  esac
done

die()  { echo "[copy] ERROR: $*" >&2; exit 1; }
info() { echo "[copy] $*"; }
envval() { grep -E "^$1=" "$DEV_ENV" | tail -1 | cut -d= -f2- | tr -d '\r'; }

# --- guards: only ever write to a dev stack that can't email real people ---
[ -f "$DEV_ENV" ] || die "no dev .env at $DEV_ENV"
DEV_DB_HOST=$(envval DB_HOST); DEV_DB_USER=$(envval DB_USER); DEV_DB_NAME=$(envval DB_NAME)
[ "$(envval MAILPIT_ENABLED)" = "true" ] \
  || die "dev .env must set MAILPIT_ENABLED=true (prod data has real visitors' email addresses)"
for ip in $PROD_IPS; do
  [ "$DEV_DB_HOST" != "$ip" ] || die "dev DB_HOST ($DEV_DB_HOST) is a prod address -- refusing"
done
docker inspect -f '{{.State.Running}}' database 2>/dev/null | grep -q true \
  || die "dev 'database' container isn't running (docker compose -f data/docker-compose/docker-compose-dev.yml up -d postgres)"
# The dev postgres is the stock image; prod's is built with pglogical.
docker exec database sh -c 'ls /usr/share/postgresql/*/extension/pglogical.control' >/dev/null 2>&1 \
  && die "the 'database' container has pglogical installed -- is this a prod container?"

TS=$(date +%F_%H-%M)
echo
echo "  From prod:  db $PROD_DB_NAME@$PROD_DB_HOST, media $PROD_SSH CT $PROD_CT:$PROD_MEDIA"
echo "  Onto dev:   db $DEV_DB_NAME in container 'database' ($DEV_DB_HOST), media $INSTANCE/media"
[ $DO_DB = 1 ]    && echo "  - dev database is REPLACED (a backup of it is saved first)"
[ $DO_MEDIA = 1 ] && echo "  - dev media is REPLACED (old copy moved to test_instance/media_before_prod_copy)"
echo
if [ $YES = 0 ]; then
  read -r -p "Continue? [y/N] " ok
  [ "$ok" = y ] || [ "$ok" = Y ] || { echo "Cancelled."; exit 1; }
fi

restart_server=0
if docker inspect -f '{{.State.Running}}' server 2>/dev/null | grep -q true; then
  info "stopping dev server container"
  docker stop server >/dev/null
  restart_server=1
fi

# --- database ---
if [ $DO_DB = 1 ]; then
  if [ -z "${PROD_DB_PASSWORD:-}" ]; then
    read -r -s -p "Prod DB password ($PROD_DB_USER@$PROD_DB_HOST): " PROD_DB_PASSWORD; echo
  fi
  DEV_DB_PASSWORD=$(envval DB_PASSWORD)
  PROD_DUMP="/backup/prod_copy_${TS}.dump"   # /backup = data/test_instance/sql_backup
  DEV_DUMP="/backup/dev_before_prod_copy_${TS}.dump"

  info "dumping prod ($PROD_DB_HOST) -> data/test_instance/sql_backup/$(basename "$PROD_DUMP")"
  docker exec -e PGPASSWORD="$PROD_DB_PASSWORD" database \
    pg_dump -h "$PROD_DB_HOST" -p "$PROD_DB_PORT" -U "$PROD_DB_USER" -Fc -f "$PROD_DUMP" "$PROD_DB_NAME"

  info "backing up current dev DB -> data/test_instance/sql_backup/$(basename "$DEV_DUMP")"
  docker exec -e PGPASSWORD="$DEV_DB_PASSWORD" database \
    pg_dump -U "$DEV_DB_USER" -Fc -f "$DEV_DUMP" "$DEV_DB_NAME"

  info "recreating dev database $DEV_DB_NAME"
  docker exec -e PGPASSWORD="$DEV_DB_PASSWORD" database psql -U "$DEV_DB_USER" -d postgres -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS \"$DEV_DB_NAME\" WITH (FORCE);" \
    -c "CREATE DATABASE \"$DEV_DB_NAME\";"

  # Restore everything except pglogical's extension/schema/objects (prod-only
  # replication plumbing; the dev postgres doesn't have it).
  info "restoring (without pglogical)"
  docker exec -e PGPASSWORD="$DEV_DB_PASSWORD" database sh -c "
    set -e
    pg_restore -l '$PROD_DUMP' | grep -vi pglogical > /tmp/restore.list
    pg_restore -U '$DEV_DB_USER' -d '$DEV_DB_NAME' --no-owner --no-acl --exit-on-error -L /tmp/restore.list '$PROD_DUMP'
    rm /tmp/restore.list"

  docker exec -e PGPASSWORD="$DEV_DB_PASSWORD" database psql -U "$DEV_DB_USER" -d "$DEV_DB_NAME" -At -c \
    "SELECT 'journey: ' || count(*) FROM journey UNION ALL SELECT 'journey_image: ' || count(*) FROM journey_image UNION ALL SELECT 'account: ' || count(*) FROM account;" \
    | sed 's/^/[copy]   /'
fi

# --- media ---
if [ $DO_MEDIA = 1 ]; then
  NEW="$INSTANCE/media_incoming"
  OLD="$INSTANCE/media_before_prod_copy"
  rm -rf "$NEW"; mkdir -p "$NEW"
  info "copying prod media over ssh (can take a while)"
  # temp/ and .staging/ are in-flight uploads, not content.
  ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$PROD_SSH" \
    "pct exec $PROD_CT -- tar -C $PROD_MEDIA --exclude=./temp --exclude=./.staging -cf - ." \
    | tar -xf - -C "$NEW"
  [ -d "$NEW/rocks" ] || die "prod media copy has no rocks/ folder -- left dev media untouched ($NEW kept for a look)"

  # Swap contents (not the folder itself: it's a bind-mounted volume path).
  rm -rf "$OLD"; mkdir -p "$OLD"
  find "$INSTANCE/media" -mindepth 1 -maxdepth 1 -exec mv {} "$OLD"/ \;
  find "$NEW" -mindepth 1 -maxdepth 1 -exec mv {} "$INSTANCE/media"/ \;
  mkdir -p "$INSTANCE/media/temp" "$INSTANCE/media/.staging"
  rmdir "$NEW"
  info "media in place ($(du -sh "$INSTANCE/media" | cut -f1))"
fi

if [ $restart_server = 1 ]; then
  info "starting dev server container"
  docker start server >/dev/null
fi

echo
info "done. Dev now matches prod's schema: re-run any data/sql/migrations/*.sql"
info "that aren't deployed to prod yet against the dev DB before testing them."
