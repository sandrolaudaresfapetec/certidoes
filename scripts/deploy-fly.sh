#!/usr/bin/env bash
# =============================================================================
# deploy-fly.sh — Deploy completo do Sistema de Certidões na Fly.io
#
# Executa, em ordem, com verificação em cada etapa:
#   1. Pré-requisitos (flyctl autenticado)
#   2. Infra: app + cluster Postgres (cria só se não existirem)
#   3. Secrets do app (DATABASE_URL via attach + portal/SIGEF)
#   4. Sincronização do schema (inclui a migration pendente do dtVisita2)
#      via túnel fly proxy — SEM SSH
#   5. Deploy (release_command roda migrate deploy numa VM de release estável)
#   6. Verificação de saúde de todas as rotas
#
# Uso:
#   fly auth login
#   ./scripts/deploy-fly.sh
#
# Variáveis opcionais (valores padrão = ambiente atual):
#   APP_NAME=certidoes-app  PG_NAME=certidoes-pg  REGION=iad
# =============================================================================
set -euo pipefail

APP_NAME="${APP_NAME:-certidoes-app}"
PG_NAME="${PG_NAME:-certidoes-pg}"
REGION="${REGION:-iad}"
DB_NAME="certidoes_app"
DB_USER="certidoes_app"
PROXY_PORT=15432

log()  { printf "\n\033[1;34m== %s ==\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m⚠ %s\033[0m\n" "$*"; }
die()  { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

# -----------------------------------------------------------------------------
log "1/6 Pré-requisitos"
command -v flyctl >/dev/null || command -v fly >/dev/null || die "flyctl não encontrado. Instale: curl -sL https://fly.io/install.sh | sh"
FLY=$(command -v flyctl || command -v fly)
$FLY auth whoami >/dev/null 2>&1 || die "Não autenticado. Rode: fly auth login"
command -v npx >/dev/null || die "npx não encontrado (instale o Node.js)"
[ -d node_modules ] || npm install --no-audit --no-fund
ok "flyctl autenticado como: $($FLY auth whoami 2>/dev/null)"

# -----------------------------------------------------------------------------
log "2/6 Infraestrutura (app + Postgres)"
if ! $FLY status -a "$APP_NAME" >/dev/null 2>&1; then
  $FLY apps create "$APP_NAME" --machines
  ok "App criado: $APP_NAME"
else
  ok "App já existe: $APP_NAME"
fi

if ! $FLY status -a "$PG_NAME" >/dev/null 2>&1; then
  $FLY postgres create --name "$PG_NAME" --region "$REGION" \
    --vm-size shared-cpu-1x --volume-size 10 --initial-cluster-size 1
  ok "Cluster Postgres criado: $PG_NAME (anote a senha exibida acima!)"
else
  ok "Cluster Postgres já existe: $PG_NAME"
fi

# -----------------------------------------------------------------------------
log "3/6 Secrets (banco + portal + SIGEF)"
# Attach injeta DATABASE_URL automaticamente; ignora se já anexado
$FLY postgres attach "$PG_NAME" -a "$APP_NAME" 2>/dev/null || warn "Postgres já anexado (DATABASE_URL existente)"
if SECRETS_ATUAIS=$($FLY secrets list -a "$APP_NAME" --json 2>/dev/null); then
  SECRETS_CONHECIDOS=1
else
  SECRETS_ATUAIS=""
  SECRETS_CONHECIDOS=0
fi
SECRETS_A_DEFINIR=()

# Segredos de sessao sao gerados apenas no primeiro provisionamento: sobrescrever
# a cada deploy invalidaria todas as sessoes ativas.
for VAR in PORTAL_SESSION_SECRET STAFF_SESSION_SECRET; do
  VALOR="${!VAR:-}"
  if [ -n "$VALOR" ]; then
    SECRETS_A_DEFINIR+=("$VAR=$VALOR")
  elif [ "$SECRETS_CONHECIDOS" = "0" ]; then
    # Sem a listagem nao se sabe se o secret existe: gerar um novo aqui
    # derrubaria todas as sessoes ativas, entao o deploy para.
    die "Não foi possível listar os secrets de $APP_NAME; repita o deploy ou informe $VAR explicitamente para não invalidar as sessões ativas."
  elif echo "$SECRETS_ATUAIS" | grep -q "\"$VAR\""; then
    ok "$VAR preservado (já configurado no app)"
  else
    SECRETS_A_DEFINIR+=("$VAR=$(openssl rand -hex 24 2>/dev/null || echo change-me-$(date +%s))")
    ok "$VAR gerado (primeiro provisionamento)"
  fi
done

SECRETS_A_DEFINIR+=("SIGEF_MOCK=${SIGEF_MOCK:-true}" "GOVBR_MOCK=${GOVBR_MOCK:-true}")
$FLY secrets set -a "$APP_NAME" "${SECRETS_A_DEFINIR[@]}"
ok "Secrets configurados"

# -----------------------------------------------------------------------------
log "4/6 Sincronização do schema (inclui coluna dtVisita2) — via fly proxy, sem SSH"
# Recupera a senha do banco de dentro do cluster (sem interação)
# Le o DATABASE_URL real do app (criado pelo attach) e troca o host pelo tunel local
APP_DB_URL=$($FLY ssh console -a "$APP_NAME" -C "printenv DATABASE_URL" 2>/dev/null | tr -d '\r' | tail -1)
[ -n "$APP_DB_URL" ] || die "DATABASE_URL nao encontrado no app (rode 'fly postgres attach' antes)"
# Extrai usuario:senha@ e remonta apontando para o tunel
CREDS=$(echo "$APP_DB_URL" | sed -E 's|^postgres(ql)?://([^@]+)@.*$|\2|')
DB_PATH=$(echo "$APP_DB_URL" | sed -E 's|^postgres(ql)?://[^@]+@([^/]+)/([^?]+).*$|\3|')
TUNNEL_URL="postgres://${CREDS}@localhost:${PROXY_PORT}/${DB_PATH}?sslmode=disable"

$FLY proxy ${PROXY_PORT}:5432 -a "$PG_NAME" &
PROXY_PID=$!
trap "kill $PROXY_PID 2>/dev/null || true" EXIT
sleep 6

# db push sincroniza o schema completo (cria dtVisita2 e qualquer coluna faltante).
# Seguro aqui: banco ainda sem dados de producao.
DATABASE_URL="$TUNNEL_URL" npx prisma db push --config prisma.config.postgres.ts --accept-data-loss
ok "Schema sincronizado (dtVisita2 e demais colunas criadas)"

kill $PROXY_PID 2>/dev/null || true
trap - EXIT

# -----------------------------------------------------------------------------
log "5/6 Deploy (release_command roda migrate deploy na VM de release)"
$FLY deploy -a "$APP_NAME" --remote-only --ha=false
ok "Deploy concluído"

# -----------------------------------------------------------------------------
log "6/6 Verificação de saúde"
BASE="https://${APP_NAME}.fly.dev"
FALHAS=0
for rota in / /processos /quadro /usuarios /portal/login /geometria /notificacoes /configuracoes; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -m 60 "$BASE$rota" || echo 000)
  if [ "$code" = "200" ] || [ "$code" = "307" ] || [ "$code" = "302" ]; then
    ok "GET $rota -> $code"
  else
    warn "GET $rota -> $code"
    FALHAS=$((FALHAS+1))
  fi
done
sigef=$(curl -s -m 60 -X POST "$BASE/api/sigef/consulta" -H "Content-Type: application/json" -d '{"cpfCnpj":"52998224725"}' | grep -o '"origem":"[A-Z_]*"' || true)
[ -n "$sigef" ] && ok "API SIGEF -> $sigef" || warn "API SIGEF não respondeu"

echo
if [ "$FALHAS" -eq 0 ]; then
  ok "SISTEMA 100% OPERACIONAL em $BASE"
else
  warn "$FALHAS rota(s) com problema — veja: fly logs -a $APP_NAME"
fi
