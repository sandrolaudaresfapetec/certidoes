#!/bin/sh
set -e

PG_BIN="/usr/lib/postgresql/15/bin"
PGDATA="/data/postgresql"
PGRUN="/var/run/postgresql"
PGLOG="/data/postgresql.log"

# Ensure runtime dir exists and is owned by postgres
mkdir -p "$PGRUN"
chown postgres:postgres "$PGRUN"

# Ensure /data is writable by postgres for logs
chown postgres:postgres /data 2>/dev/null || true
touch "$PGLOG"
chown postgres:postgres "$PGLOG"

# Clean up partial PostgreSQL init (if previous attempt failed)
if [ -d "$PGDATA" ] && [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "Cleaning up failed PostgreSQL initialization..."
  rm -rf "$PGDATA"
fi

# Initialize PostgreSQL data directory if it doesn't exist
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "Initializing PostgreSQL data directory..."
  mkdir -p "$PGDATA"
  chown postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  su postgres -c "$PG_BIN/initdb -D $PGDATA --encoding=UTF8 --locale=C"

  # Configure pg_hba.conf for local trust auth
  echo "local all all trust" > "$PGDATA/pg_hba.conf"
  echo "host all all 127.0.0.1/32 trust" >> "$PGDATA/pg_hba.conf"
  echo "host all all ::1/128 trust" >> "$PGDATA/pg_hba.conf"

  # Configure postgresql.conf
  cat >> "$PGDATA/postgresql.conf" <<PGEOF
listen_addresses = '127.0.0.1'
port = 5432
unix_socket_directories = '$PGRUN'
shared_buffers = 64MB
work_mem = 4MB
max_connections = 20
PGEOF
else
  # Ensure correct ownership on existing data
  chown -R postgres:postgres "$PGDATA"
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
su postgres -c "$PG_BIN/pg_ctl -D $PGDATA -l $PGLOG start -w -t 30"

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
