#!/bin/sh
set -e

# Run migrations on startup
cd /app
npx prisma migrate deploy 2>/dev/null || echo "Migration skipped or already applied"

exec "$@"
