#!/bin/bash

# ============================================================
# Script: renew-immich-cert.sh
# Purpose: Auto-renew Let's Encrypt certificate for Immich,
#          copy it to Docker-mounted cert folders, and reload Nginx.
#
# How it works:
# 1. Certbot renews the certificate using the Immich webroot
#    for HTTP challenge validation.
# 2. If a renewal occurs, the deploy-hook copies:
#      - fullchain.pem -> /mnt/aidensrocks/prod/immich/webroot/certs/
#      - privkey.pem  -> /mnt/aidensrocks/prod/immich/webroot/private/
# 3. Nginx inside the Docker 'client' container is reloaded
#    to immediately use the new certificates.
#
# Usage:
#   sudo /root/AidensRocks/data/immich/renew-immich-cert.sh
#
# Dry-run test:
#   sudo /root/AidensRocks/data/immich/renew-immich-cert.sh --dry-run
#
# Cron setup example (daily at 3 AM):
#   0 3 * * * /root/AidensRocks/data/immich/renew-immich-cert.sh >> /var/log/immich-cert-renew.log 2>&1
#
# Notes:
# - Make script executable: sudo chmod +x /root/AidensRocks/data/immich/renew-immich-cert.sh
# - Ensure the full path to docker is correct: which docker (typically /usr/bin/docker)
# - The deploy-hook runs only if a certificate is actually renewed.
# ============================================================

# Full path to docker binary (adjust if needed)
DOCKER_BIN="/usr/bin/docker"

# Run Certbot renewal with deploy-hook
certbot renew --webroot -w /mnt/aidensrocks/prod/immich/webroot \
  --deploy-hook "$DOCKER_BIN compose exec client nginx -s reload && \
cp /etc/letsencrypt/live/immich.aidensrocks.com/fullchain.pem /mnt/aidensrocks/prod/immich/webroot/certs/fullchain.pem && \
cp /etc/letsencrypt/live/immich.aidensrocks.com/privkey.pem /mnt/aidensrocks/prod/immich/webroot/private/privkey.pem"
