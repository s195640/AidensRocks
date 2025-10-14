#!/bin/bash

# ============================================================
# Script: renew-immich-cert.sh
# Purpose: Auto-renew Let's Encrypt certificate for Immich,
#          copy it to Docker-mounted cert folders, and reload Nginx.
# Usage: sudo /root/AidensRocks/data/immich/renew-immich-cert.sh
# ============================================================

# ------------------------------------------------------------
# Step 1: Renew certificate using Certbot with webroot
# - Uses your Immich webroot for HTTP challenge
# - Certbot stores the official certs in /etc/letsencrypt/live/immich.aidensrocks.com/
# - Renewal only happens if the cert is near expiration (30 days before)
# ------------------------------------------------------------
certbot renew --webroot -w /mnt/aidensrocks/prod/immich/webroot \
  --deploy-hook "\
# ------------------------------------------------------------
# Step 2: Copy renewed certificate and private key
# - Copies fullchain.pem to the Docker-mounted cert folder
# - Copies privkey.pem to the Docker-mounted private key folder
# ------------------------------------------------------------
cp /etc/letsencrypt/live/immich.aidensrocks.com/fullchain.pem /mnt/aidensrocks/prod/immich/webroot/certs/fullchain.pem && \
cp /etc/letsencrypt/live/immich.aidensrocks.com/privkey.pem /mnt/aidensrocks/prod/immich/webroot/private/privkey.pem && \

# ------------------------------------------------------------
# Step 3: Reload Nginx inside Docker
# - Ensures Nginx picks up the new certificate immediately
# ------------------------------------------------------------
/usr/bin/docker compose exec client nginx -s reload \
"

# ------------------------------------------------------------
# Notes:
# 0. make script executeable 
#     sudo chmod +x /root/AidensRocks/data/immich/renew-immich-cert.sh
# 1. Deploy hook runs only if a renewal actually occurs.
# 2. Certificates in /mnt/aidensrocks/prod/immich/webroot/certs
#    and /private are what Nginx uses inside your Docker container.
# 3. Test with --dry-run before relying on automation:
#      sudo /root/AidensRocks/data/immich/renew-immich-cert.sh --dry-run
# 4. Schedule in cron to run daily:
#      0 3 * * * /root/AidensRocks/data/immich/renew-immich-cert.sh >> /var/log/immich-cert-renew.log 2>&1
# ------------------------------------------------------------
