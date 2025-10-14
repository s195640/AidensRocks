#!/bin/bash

# ============================================================
# Script: renew-immich-cert.sh
# Purpose: Auto-renew Let's Encrypt certificate for Immich,
#          copy it to Docker-mounted cert folders, and reload Nginx.
# Features:
#   - Works with Immich running inside Docker.
#   - Copies renewed certs to Docker-mounted folders.
#   - Reloads Nginx inside Docker container.
#   - Supports passing extra Certbot options (e.g., --force-renewal) for testing.
# Usage:
#   sudo ./renew-immich-cert.sh          # normal renewal
#   sudo ./renew-immich-cert.sh --force-renewal --dry-run   # test renewal
# Docker:
#   - Docker Compose file: /root/AidensRocks/data/docker-compose/docker-compose-prod.yml
#   - Nginx service: client
# Certificate paths:
#   - Official Certbot path: /etc/letsencrypt/live/immich.aidensrocks.com/
#   - Docker-mounted paths:
#       /mnt/aidensrocks/prod/immich/webroot/certs/fullchain.pem
#       /mnt/aidensrocks/prod/immich/webroot/private/privkey.pem
# ============================================================

# Set variables
WEBROOT="/mnt/aidensrocks/prod/immich/webroot"
CERT_DIR="$WEBROOT/certs"
KEY_DIR="$WEBROOT/private"
CERTBOT_DOMAIN="immich.aidensrocks.com"
DOCKER_COMPOSE_FILE="/root/AidensRocks/data/docker-compose/docker-compose-prod.yml"
DOCKER_SERVICE="client"

# ------------------------------------------------------------
# Run Certbot renew with any additional options passed to script
# ------------------------------------------------------------
certbot renew --webroot -w "$WEBROOT" "$@" \
  --deploy-hook "bash -c '\
    echo \"Deploy hook running: copying renewed certs and reloading Nginx\"; \
    cp /etc/letsencrypt/live/$CERTBOT_DOMAIN/fullchain.pem $CERT_DIR/fullchain.pem; \
    cp /etc/letsencrypt/live/$CERTBOT_DOMAIN/privkey.pem $KEY_DIR/privkey.pem; \
    docker compose -f $DOCKER_COMPOSE_FILE exec $DOCKER_SERVICE nginx -s reload'"

# ------------------------------------------------------------
# Notes:
# 1. To test renewal without waiting for expiration:
#      sudo ./renew-immich-cert.sh --force-renewal --dry-run
# 2. Cron example to auto-renew daily at 3am:
#      0 3 * * * /root/AidensRocks/data/immich/renew-immich-cert.sh >> /var/log/immich-cert-renew.log 2>&1
# 3. This script handles copying the certs to the Docker volumes and reloading Nginx.
# ------------------------------------------------------------
