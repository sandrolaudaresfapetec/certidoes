#!/bin/sh
set -e

PGDATA="/data/postgresql"
PGRUN="/var/run/postgresql"

# Ensure runtime dir exists and is owned by postgres
mkdir -p "$PGRUN"
chown postgres:postgres "$PGRUN"

# Initialize PostgreSQL data directory if it doesn't exist
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "Initializing PostgreSQL data directory..."
  mkdir -p "$PGDATA"
  chown postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  su postgres -c "initdb -D $PGDATA --encoding=UTF8 --locale=C"

  # Configure pg_hba.conf for local trust auth
  echo "local all all trust" > "$PGDATA/pg_hba.conf"
  echo "host all all 127.0.0.1/32 trust" >> "$PGDATA/pg_hba.conf"
  echo "host all all ::1/128 trust" >> "$PGDATA/pg_hba.conf"

  # Configure postgresql.conf
  echo "listen_addresses = '127.0.0.1'" >> "$PGDATA/postgresql.conf"
  echo "port = 5432" >> "$PGDATA/postgresql.conf"
  echo "unix_socket_directories = '$PGRUN'" >> "$PGDATA/postgresql.conf"
  echo "shared_buffers = 64MB" >> "$PGDATA/postgresql.conf"
  echo "work_mem = 4MB" >> "$PGDATA/postgresql.conf"
  echo "max_connections = 20" >> "$PGDATA/postgresql.conf"
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
su postgres -c "pg_ctl -D $PGDATA -l /data/postgresql.log start -w -t 30"

# Create database and user if they don't exist
su postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='certidoes'\" | grep -q 1 || psql -c \"CREATE USER certidoes WITH PASSWORD 'certidoes2026';\""
su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='certidoes'\" | grep -q 1 || psql -c \"CREATE DATABASE certidoes OWNER certidoes;\""

# Set DATABASE_URL for the app
export DATABASE_URL="postgresql://certidoes:certidoes2026@127.0.0.1:5432/certidoes"

echo "Running Prisma migrations..."
cd /app
npx prisma migrate deploy

echo "Generating Next.js build..."
npx next build --experimental-build-mode generate

echo "Starting application..."
exec "$@"
