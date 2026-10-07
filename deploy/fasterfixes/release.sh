#!/bin/sh
# Executado pelo Fly como release_command antes de trocar as máquinas.
set -eu
cd /src/packages/database
echo "==> prisma migrate deploy"
exec pnpm exec prisma migrate deploy
