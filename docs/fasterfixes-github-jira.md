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
   - Permissions: `Issues: Read & write`, `Metadata: Read`
   - Events: `Issues`
   - Copiar `App ID`, gerar `Private key` e `Webhook secret` → `GITHUB_APP_ID`,
     `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`.
2. Instalar o App **uma vez, no nível da organização** (cobre todos os repositórios).
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
