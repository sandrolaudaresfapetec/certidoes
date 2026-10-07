#!/bin/sh
# Sobe o MinIO e garante (idempotente) o bucket público de leitura usado pelo FasterFixes,
# para que um volume recém-criado já aceite uploads sem provisionamento manual.
set -eu

BUCKET="${MINIO_BUCKET:-fasterfixes}"

minio server /data --address ":9000" --console-address ":9001" &
MINIO_PID=$!

i=0
until mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "minio não respondeu em 60s" >&2
    exit 1
  fi
  sleep 1
done

mc mb --ignore-existing "local/$BUCKET"
mc anonymous set download "local/$BUCKET"
echo "==> bucket '$BUCKET' pronto (leitura anônima)"

wait "$MINIO_PID"
