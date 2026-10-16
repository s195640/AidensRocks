#!/bin/sh
# Copies this build's private source maps (baked into the image at
# /sourcemaps/<version>/, see docker-client-prod) into the volume the server
# reads them from (/shared-sourcemaps -> server's /app/sourcemaps), so the
# admin Site Health panel can show readable stack traces. Older versions
# already in the volume are kept, so their errors still resolve.
# The maps are never in the public web root. Runs on container start (the
# nginx image runs /docker-entrypoint.d/*.sh); never blocks nginx starting.
if [ -d /sourcemaps ] && [ -d /shared-sourcemaps ]; then
  cp -R /sourcemaps/. /shared-sourcemaps/ || echo "copy-sourcemaps: copy failed (stack traces stay minified)"
fi
exit 0
