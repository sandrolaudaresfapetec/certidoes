#!/bin/sh
# Migrations rodam uma vez por deploy via `release_command` (fly.toml), que chega aqui como argumento.
set -eu
if [ "$#" -gt 0 ]; then
  exec "$@"
fi
cd /src/apps/web
echo "==> next start em ${HOSTNAME}:${PORT}"
exec pnpm exec next start -H "$HOSTNAME" -p "$PORT"
