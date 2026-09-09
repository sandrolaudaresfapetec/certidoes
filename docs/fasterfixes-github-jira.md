# FasterFixes → GitHub → Jira (sem custo de licença)

Pipeline de feedback/bugs do sistema de certidões:

```text
Cliente/QA reporta bug na tela (widget FasterFixes)
        │
        ▼  [1] FasterFixes → GitHub (GitHub App do FasterFixes)
GitHub Issue criada automaticamente (print, URL, seletor CSS, console/network,
navegador/SO/viewport, componente React)
        │
        ▼  [2] "truque": workflow deste repo cria o card SC-xx no Jira e escreve a
           chave no título e num comentário da issue
        │
        ▼  [3] GitHub → Jira (app gratuito "GitHub for Jira")
Issue, branch, commit e PR vinculados ao card SC-xx
```

Licenças: FasterFixes dashboard é AGPL-3.0 (self-hosted, grátis); widget
`@fasterfixes/react` é MIT; GitHub for Jira é gratuito no Atlassian Marketplace.
Os serviços externos usados pelo FasterFixes têm plano gratuito (Inngest, Resend,
Cloudflare R2) — ou podem ser substituídos por MinIO no próprio servidor.

## 0. O que já está pronto neste repositório

| Item | Onde |
| --- | --- |
| Widget FasterFixes (só ativa quando há `NEXT_PUBLIC_FASTERFIXES_PROJECT_ID`) | `src/components/feedback-widget.tsx`, `src/app/layout.tsx` |
| Workflow que cria o card Jira e injeta a chave na issue | `.github/workflows/fasterfixes-jira-triage.yml` |

Variáveis do app (staging apenas — **não** configurar em produção sem decisão):

```text
NEXT_PUBLIC_FASTERFIXES_PROJECT_ID=proj_...        # Project settings no dashboard FasterFixes
NEXT_PUBLIC_FASTERFIXES_API_ORIGIN=https://<host do FasterFixes>
```

Staging do sistema de certidões com o widget ativo: app Fly `certidoes-staging`
(https://certidoes-staging.fly.dev, `fly.staging.toml`), banco `certidoes_staging` no
cluster `certidoes-pg`, SIGEF/gov.br simulados (`SIGEF_MOCK=true`, `GOVBR_MOCK=true`).
As duas variáveis acima entram como secrets desse app; a produção (`certidoes-app`)
segue sem widget. Deploy: `fly deploy -c fly.staging.toml --ha=false`.

Secrets do repositório GitHub usados pelo workflow (Settings → Secrets and variables → Actions):

```text
JIRA_BASE_URL     = https://grupoge21.atlassian.net
JIRA_USER_EMAIL   = e-mail da conta Atlassian dona do token
JIRA_API_TOKEN    = token gerado em https://id.atlassian.com/manage-profile/security/api-tokens
```

Variables opcionais: `JIRA_PROJECT_KEY` (padrão `SC`), `JIRA_ISSUE_TYPE` (padrão `Bug`;
o projeto SC aceita `Tarefa`, `Subtarefa`, `História`, `Bug`, `Epic`).

## 1. Subir o FasterFixes (self-hosted)

Guia oficial: https://www.faster-fixes.com/docs/self-hosting

### 1a. Instância no Fly.io (staging usada pelo projeto)

Tudo fica em `deploy/fasterfixes/`, na mesma conta Fly do `certidoes-app`:

| App Fly | Papel | Custo |
| --- | --- | --- |
| `certidoes-fasterfixes` | dashboard + API do widget (`https://certidoes-fasterfixes.fly.dev`) | 1 máquina shared-cpu-1x/1 GB, para quando ociosa |
| `certidoes-minio` | bucket S3 (`fasterfixes`, leitura pública, criado por `minio/start.sh` no boot) com volume de 3 GB | 1 máquina 512 MB + volume |
| `certidoes-inngest` | Inngest self-hosted (`inngest start`, SQLite em volume) | 1 máquina 512 MB + volume |
| `certidoes-pg` | banco `fasterfixes` (role própria) no cluster já existente | zero adicional |

A imagem é construída pelo `Dockerfile` a partir do upstream fixado
(`FASTERFIXES_COMMIT`) com o patch `patches/self-hosted-pg-s3.patch`, que:
usa `@prisma/adapter-pg` quando `DATABASE_ADAPTER=pg` (o upstream assume Neon em
produção), aceita qualquer S3 via `STORAGE_HOST`, não cria cliente Stripe fora da
nuvem, lê as credenciais do GitHub App só quando usadas e acrescenta o mailer
`console` (`MAILER_PROVIDER=console`, nunca inferido): sem Resend/Plunk, os e-mails
de verificação/reset saem no log do app (`fly logs -a certidoes-fasterfixes`), de
onde se copia o link. Quem lê o log do Fly consegue usar esses links (expiram em
1 h), por isso é um modo de bootstrap: antes de abrir o dashboard a outras pessoas,
troque para Resend/Plunk (linha "opcional" abaixo). `build-env.sh` fornece placeholders que o `next build` exige
na importação dos módulos; em runtime valem apenas os secrets do Fly.

Primeiro acesso: cadastre-se em `/signup`, pegue o link "Verify your email" no
log e conclua o onboarding (organização → projeto). O `projectId` do widget fica
em Settings → Widget do projeto.

```bash
cd deploy/fasterfixes
fly deploy -c minio/fly.toml     # secrets: MINIO_ROOT_USER, MINIO_ROOT_PASSWORD
fly deploy -c inngest/fly.toml   # secrets: INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
fly secrets set -a certidoes-fasterfixes DATABASE_URL=... BETTER_AUTH_SECRET=... \
  STORAGE_ACCESS_KEY_ID=... STORAGE_SECRET_ACCESS_KEY=... \
  INNGEST_EVENT_KEY=... INNGEST_SIGNING_KEY=... \
  JIRA_TOKEN_ENCRYPTION_KEY=... LINEAR_TOKEN_ENCRYPTION_KEY=... SLACK_TOKEN_ENCRYPTION_KEY=... \
  GITHUB_APP_ID=... GITHUB_PRIVATE_KEY=... GITHUB_WEBHOOK_SECRET=...
fly deploy                       # release_command roda `prisma migrate deploy`
# opcional: fly secrets set -a certidoes-fasterfixes MAILER_PROVIDER=resend RESEND_API_KEY=...
```

Chaves de criptografia: `openssl rand -hex 32`. As chaves do Inngest são as
mesmas nos dois apps (`--event-key`/`--signing-key` do servidor e do SDK).

### 1b. Em qualquer outro servidor

```bash
git clone https://github.com/manucoffin/faster-fixes.git
cd faster-fixes
pnpm install
cp apps/web/.env.example apps/web/.env.local   # preencher
cd packages/database && npx prisma migrate deploy && npx prisma generate
cd ../../apps/web && pnpm build && pnpm start
```

Dependências e alternativa gratuita:

| Dependência | Opção sem custo |
| --- | --- |
| PostgreSQL | banco `fasterfixes` no cluster `certidoes-pg` do Fly já existente, ou Postgres local |
| Bucket S3 | Cloudflare R2 (10 GB grátis) **ou** MinIO no próprio servidor (`STORAGE_HOST`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_FORCE_PATH_STYLE=true`) |
| Inngest (filas: processar screenshot, sincronizar GitHub) | plano Hobby gratuito em https://app.inngest.com → `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` |
| E-mail transacional (verificação de conta, convites) | Resend free (3 000 e-mails/mês) → `RESEND_API_KEY`, ou Plunk |
| Stripe | não é necessário (`NEXT_PUBLIC_IS_CLOUD=false`) |

Variáveis mínimas (`apps/web/.env.local`):

```text
DOMAIN_NAME=fasterfixes.exemplo.gov.br
BASE_URL=https://fasterfixes.exemplo.gov.br
BETTER_AUTH_URL=https://fasterfixes.exemplo.gov.br
BETTER_AUTH_SECRET=<openssl rand -base64 32>
NEXT_PUBLIC_FF_API_ORIGIN=https://fasterfixes.exemplo.gov.br
NEXT_PUBLIC_IS_CLOUD=false
DATABASE_URL=postgresql://...
STORAGE_REGION=auto
STORAGE_BUCKET_NAME=fasterfixes
NEXT_PUBLIC_STORAGE_BASE_URL=https://<host publico do bucket>/fasterfixes
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
RESEND_API_KEY=...
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=...
GITHUB_WEBHOOK_SECRET=...
```

Primeiro acesso: `/login` → criar conta → verificar e-mail → criar projeto →
copiar o **Project ID** (`proj_...`) para `NEXT_PUBLIC_FASTERFIXES_PROJECT_ID` do
sistema de certidões (staging).

## 2. Integração 1 — FasterFixes → GitHub

Doc: https://www.faster-fixes.com/docs/integrations/github

1. Criar um GitHub App na organização `sandrolaudaresfapetec`
   (Settings → Developer settings → GitHub Apps → New GitHub App):
   - Webhook URL: `https://<host do FasterFixes>/api/webhooks/github`
   - Setup URL (marcar "Redirect on update"): `https://<host do FasterFixes>/api/github/setup`
   - Permissions: `Issues: Read & write`, `Metadata: Read`
   - Events: `Issues`
   - Copiar `App ID`, gerar `Private key` e `Webhook secret` → `GITHUB_APP_ID`,
     `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` (secrets do app Fly
     `certidoes-fasterfixes`). O nome (slug) do App vai em
     `NEXT_PUBLIC_GITHUB_APP_NAME` — é lido no build, então exige rebuild da imagem;
     sem ele o botão "Connect GitHub" do dashboard não abre, mas a instalação
     manual em `https://github.com/apps/<slug>/installations/new` funciona igual.
   - Atalho: o [manifest flow](https://docs.github.com/apps/sharing-github-apps/registering-a-github-app-from-a-manifest)
     cria o App com tudo preenchido; o `code` devolvido é trocado em
     `POST https://api.github.com/app-manifests/{code}/conversions` por App ID,
     private key e webhook secret (vale 1 h, sem autenticação).
2. Instalar o App **uma vez, no nível da organização** (cobre todos os repositórios).
   O GitHub redireciona para o Setup URL, que exige sessão no dashboard FasterFixes
   e grava a instalação na organização ativa.
3. No dashboard do FasterFixes: Project → Integrations → GitHub → vincular o
   repositório `sandrolaudaresfapetec/certidoes`, ativar **auto-create issues** e
   definir labels padrão: `faster-fixes`, `client-feedback`, `bug`.

A partir daí cada feedback do widget vira uma issue com: texto, URL da página,
link de volta ao dashboard, screenshot, seletor CSS, componente React,
coordenadas do clique, navegador/SO/viewport e console/network logs. O status é
sincronizado nos dois sentidos (feedback resolvido fecha a issue; reaberto reabre).

## 3. Integração 2 — GitHub → Jira (GitHub for Jira)

Doc: https://support.atlassian.com/jira-cloud-administration/docs/link-github-workflows-and-deployments-to-jira-issues/

1. No Jira (admin do site): Apps → Explore more apps → **GitHub for Jira** → Get app (gratuito).
2. Apps → Manage apps → GitHub for Jira → Get started → **Connect GitHub organization**
   → autorizar a org `sandrolaudaresfapetec` (instala o GitHub App da Atlassian).
3. Confirmar que o repositório `certidoes` aparece em "Connected repositories" e
   que o backfill terminou.

Regra do vínculo: o GitHub for Jira só associa quando encontra a chave do card
(`SC-123`) em **branch**, **commit**, **título do PR** ou **comentário/título da issue**.

## 4. Integração 3 — o "truque": a issue nasce linkada ao card

O workflow `.github/workflows/fasterfixes-jira-triage.yml` roda quando uma issue é
aberta/rotulada com `faster-fixes` ou `client-feedback` e:

1. cria o card no projeto `SC` (tipo `Bug`) com o corpo da issue + link para ela;
2. renomeia a issue para `SC-xx <título original>`;
3. comenta na issue com o link do card e a instrução de usar `SC-xx` em branch, commit e PR.

Se a issue já mencionar `SC-\d+` no título/corpo, o workflow não cria card duplicado.

Fluxo do desenvolvedor a partir daí:

```bash
git checkout -b SC-42-corrigir-mapa      # branch com a chave
git commit -m "SC-42 corrige popup do CAR"
gh pr create --title "SC-42 corrige popup do CAR"
```

O GitHub for Jira mostra no card SC-42: a issue (via comentário/título), a
branch, os commits e o PR — e, ao mergear, fecha o ciclo com o FasterFixes
quando a issue for fechada.

## 5. Bug piloto (validação end-to-end)

1. Subir staging do sistema de certidões com `NEXT_PUBLIC_FASTERFIXES_PROJECT_ID`
   e `NEXT_PUBLIC_FASTERFIXES_API_ORIGIN` (nunca produção sem decisão).
2. Abrir `/geometria` em staging, clicar no botão flutuante do widget, marcar um
   elemento e enviar "Piloto: teste de integração FasterFixes".
3. Verificar no dashboard FasterFixes o feedback com screenshot e contexto.
4. Verificar a issue criada em `sandrolaudaresfapetec/certidoes` com label `faster-fixes`.
5. Verificar que o workflow renomeou a issue para `SC-xx ...` e criou o card em
   https://grupoge21.atlassian.net/jira/software/projects/SC/boards/318.
6. Abrir branch/commit/PR com `SC-xx` e conferir o painel "Desenvolvimento" do card.
7. Resolver o feedback no FasterFixes → issue fecha → mover o card para Concluído.
