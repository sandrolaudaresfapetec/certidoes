#!/usr/bin/env bash
# One-off: sincroniza o schema no Postgres da Fly SEM SSH, via tunel WireGuard.
# Uso:  ./scripts/fly-db-push.sh <senha_do_banco>
# (A senha foi exibida no `fly postgres create`; ou recupere com:
#   fly ssh console -a certidoes-pg -C "printenv OPERATOR_PASSWORD")
set -e
APP_PG="certidoes-pg"
DB="certidoes_app"
SENHA="${1:?Uso: $0 <senha_do_banco>}"

echo "1/3 Abrindo tunel WireGuard (fly proxy)..."
fly proxy 15432:5432 -a "$APP_PG" &
PROXY_PID=$!
trap "kill $PROXY_PID 2>/dev/null" EXIT
sleep 5

echo "2/3 Sincronizando schema (prisma db push)..."
DATABASE_URL="postgres://certidoes_app:${SENHA}@localhost:15432/${DB}?sslmode=disable" \
  npx prisma db push --config prisma.config.postgres.ts --skip-generate

echo "3/3 Concluido. Reinicie o app: fly machine restart -a certidoes-app"
