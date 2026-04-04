#!/bin/sh
set -e

INTERVAL="${BACKUP_INTERVAL:-1}"
OFFSET="${BACKUP_OFFSET:-0}"

# Write the cron job
cat > /etc/crontabs/root << EOF
0 */${INTERVAL} * * * /usr/local/bin/backup.sh
EOF

# Write the backup script
cat > /usr/local/bin/backup.sh << 'SCRIPT'
#!/bin/sh
set -e

OFFSET="${BACKUP_OFFSET:-0}"
sleep "$OFFSET"

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
mkdir -p /backup/"$TIMESTAMP"
rsync -av --chmod=D777,F777 --perms /data/ /backup/"$TIMESTAMP"/

# Only run purge on the non-offset instance (i.e., the primary run)
if [ "$OFFSET" = "0" ]; then
  NOW=$(date +%s)
  DAYS_7=$((NOW - 604800))
  DAYS_60=$((NOW - 5184000))

  ls /backup/ | sort | while read DIR; do
    DIR_TIME=$(date -d "${DIR%_*}" +%s 2>/dev/null) || continue

    if [ "$DIR_TIME" -lt "$DAYS_60" ]; then
      KEEP_KEY=$(echo "$DIR" | cut -c1-7)    # keep one per week (YYYY-Www)
    elif [ "$DIR_TIME" -lt "$DAYS_7" ]; then
      KEEP_KEY=$(echo "$DIR" | cut -c1-10)   # keep one per day (YYYY-MM-DD)
    else
      KEEP_KEY="$DIR"                         # keep all recent backups
    fi

    echo "$KEEP_KEY $DIR"
  done | awk 'seen[$1]++ { print $2 }' | while read DEL; do
    rm -rf /backup/"$DEL"
    echo "Purged: $DEL"
  done
fi
SCRIPT

chmod +x /usr/local/bin/backup.sh

exec crond -f -L /dev/stdout
