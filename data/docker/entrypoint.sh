#!/bin/sh
set -e

INTERVAL="${BACKUP_INTERVAL:-1}"
OFFSET="${BACKUP_OFFSET:-0}"

# Write the cron job
cat > /etc/crontabs/root << EOF
0 */${INTERVAL} * * * /usr/local/bin/backup.sh >> /tmp/backup.log 2>&1
EOF

# Write the backup script
cat > /usr/local/bin/backup.sh << 'SCRIPT'
#!/bin/sh
set -e

LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

log() {
  echo "${LOG_PREFIX} $1"
}

OFFSET="${BACKUP_OFFSET:-0}"

if [ "$OFFSET" != "0" ]; then
  log "INFO  Sleeping for offset: ${OFFSET}s"
  sleep "$OFFSET"
fi

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
DEST="/backup/$TIMESTAMP"

log "INFO  ========================================="
log "INFO  Backup started"
log "INFO  Destination: $DEST"
log "INFO  ========================================="

mkdir -p "$DEST"

log "INFO  Starting rsync from /data/ to $DEST"
RSYNC_START=$(date +%s)

rsync -av --chmod=D777,F777 --no-perms --no-owner --no-group --stats /data/ "$DEST"/ 2>&1 | while read LINE; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] RSYNC $LINE"
done

RSYNC_END=$(date +%s)
RSYNC_DURATION=$((RSYNC_END - RSYNC_START))
DEST_SIZE=$(du -sh "$DEST" 2>/dev/null | cut -f1)

log "INFO  Rsync completed in ${RSYNC_DURATION}s"
log "INFO  Backup size: $DEST_SIZE"

# Only run purge on the non-offset instance (i.e., the primary run)
if [ "$OFFSET" = "0" ]; then
  log "INFO  ========================================="
  log "INFO  Starting purge of old backups"
  log "INFO  ========================================="

  NOW=$(date +%s)
  DAYS_7=$((NOW - 604800))
  DAYS_60=$((NOW - 5184000))
  PURGE_COUNT=0

  ls /backup/ | sort | while read DIR; do
    DIR_TIME=$(date -d "${DIR%_*}" +%s 2>/dev/null) || continue

    if [ "$DIR_TIME" -lt "$DAYS_60" ]; then
      KEEP_KEY=$(echo "$DIR" | cut -c1-7)    # keep one per week (YYYY-Www)
      POLICY="older than 60 days, keeping one per week"
    elif [ "$DIR_TIME" -lt "$DAYS_7" ]; then
      KEEP_KEY=$(echo "$DIR" | cut -c1-10)   # keep one per day (YYYY-MM-DD)
      POLICY="older than 7 days, keeping one per day"
    else
      KEEP_KEY="$DIR"                         # keep all recent backups
      POLICY="recent, keeping all"
    fi

    echo "$KEEP_KEY $DIR $POLICY"
  done | awk 'seen[$1]++ { print $2, $3, $4, $5 }' | while read DEL POLICY; do
    DIR_SIZE=$(du -sh /backup/"$DEL" 2>/dev/null | cut -f1)
    rm -rf /backup/"$DEL"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO  Purged: $DEL (${DIR_SIZE}, $POLICY)"
  done

  TOTAL_SIZE=$(du -sh /backup/ 2>/dev/null | cut -f1)
  log "INFO  Purge complete. Total backup storage used: $TOTAL_SIZE"
fi

log "INFO  ========================================="
log "INFO  Backup finished successfully"
log "INFO  ========================================="
SCRIPT

chmod +x /usr/local/bin/backup.sh

exec crond -f -L /dev/stdout