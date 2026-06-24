#!/bin/sh
set -e

echo "Running Prisma migrations..."
cd /app
npx prisma migrate deploy

echo "Generating Next.js build..."
npx next build --experimental-build-mode generate

echo "Starting application..."
exec "$@"
