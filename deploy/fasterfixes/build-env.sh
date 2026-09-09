#!/bin/sh
# Valores usados SOMENTE durante o `next build`: o Next avalia os módulos de servidor
# ao coletar dados das rotas e vários deles exigem variáveis presentes na importação.
# Em runtime valem os secrets do Fly (fly secrets set), nunca estes valores.
ZERO_KEY=0000000000000000000000000000000000000000000000000000000000000000
export DATABASE_URL="postgresql://build:build@localhost:5432/build"
export BETTER_AUTH_SECRET="build-placeholder-secret-not-used-at-runtime"
export JIRA_TOKEN_ENCRYPTION_KEY="$ZERO_KEY"
export LINEAR_TOKEN_ENCRYPTION_KEY="$ZERO_KEY"
export SLACK_TOKEN_ENCRYPTION_KEY="$ZERO_KEY"
export GITHUB_APP_ID="0"
export GITHUB_PRIVATE_KEY="build-placeholder"
export GITHUB_WEBHOOK_SECRET="build-placeholder"
export STORAGE_HOST="localhost:9000"
export STORAGE_ACCESS_KEY_ID="build"
export STORAGE_SECRET_ACCESS_KEY="build"
export STORAGE_BUCKET_NAME="build"
export INNGEST_EVENT_KEY="build"
export INNGEST_SIGNING_KEY="$ZERO_KEY"
export LINEAR_WEBHOOK_SIGNING_SECRET="build"
export JIRA_CLIENT_ID="build"
export JIRA_CLIENT_SECRET="build"
export LINEAR_CLIENT_ID="build"
export LINEAR_CLIENT_SECRET="build"
export SLACK_CLIENT_ID="build"
export SLACK_CLIENT_SECRET="build"
