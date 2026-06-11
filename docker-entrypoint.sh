#!/bin/sh
set -e

cd /app
node migrate.js

exec "$@"
