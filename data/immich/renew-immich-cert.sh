#!/bin/bash

# ============================================================
# Script: renew-immich-cert.sh
# Purpose: Auto-renew Let's Encrypt certificate for Immich,
#          copy it to Docker-mounted cert folders, and reload Nginx.
#
# Usage:
#   sudo ./renew-immich-cert.sh           # normal renewal (only if near expiration)
#   sudo ./renew-immich-cert.sh --force  # force renewal for testing
#
# Notes:
# 1. Certificates are stored in /etc/letsencrypt/live/immich.aidensrocks.com/
# 2. After renewal, certs are copied to Docker volumes:
#    - /mnt/aidensrocks/prod/immich/webroot/certs/fullchain.pem
#    - /mnt/aidensrocks/prod/immich/webroot/private/privkey.pem
# 3. Nginx inside Docker (service "client") is reloaded automatically.
# 4. You can schedule this script in cron to run daily:
#      0 3 * * * /root/AidensRocks/data/immich/renew-immich-cert.sh >> /var/log/immich-cert-renew.log 2>&1
# ============================================================

# -----------------------------
# Config variables
# -----------------------------
WEBROOT="/mnt/aidensrocks/prod/immich/webroot"
CERT_DIR="/etc/letsencrypt/live/immich.aidensrocks.com"
DOCKER_COMPOSE="/root/AidensRocks/data/docker-compose/docker-compose-prod.yml"
DOCKER_SERVICE="client"

# -----------------------------
# Parse optional --force argument
# -----------------------------
FORCE=""
if [[ "$1" == "--force" ]]; then
    FORCE="--force-renewal"
    echo "[INFO] Forcing renewal (for testing purposes)"
fi

# -----------------------------
# Run Certbot renewal
# -----------------------------
echo "[INFO] Running Certbot renewal..."
sudo certbot renew --webroot -w "$WEBROOT" $FORCE \
  --deploy-hook "bash -c '
    echo \"[INFO] Copying renewed certificate files...\"
    cp $CERT_DIR/fullchain.pem $WEBROOT/certs/fullchain.pem
    cp $CERT_DIR/privkey.pem $WEBROOT/private/privkey.pem
    echo \"[INFO] Reloading Nginx inside Docker service $DOCKER_SERVICE...\"
    docker compose -f $DOCKER_COMPOSE exec $DOCKER_SERVICE nginx -s reload
  '"

echo "[INFO] Certificate renewal process completed."
