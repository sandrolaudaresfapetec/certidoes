This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Integração SIGEF/INCRA

O sistema consulta as parcelas georreferenciadas do solicitante no **SIGEF** (Sistema de Gestão Fundiária do INCRA) a partir do CPF/CNPJ, por meio da API oficial **SIGEFGEO** do [Conecta gov.br](https://www.gov.br/conecta/catalogo/apis/sigef-geo).

### Como funciona

- Na tela **Novo Processo**, o bloco "Integração SIGEF/INCRA" permite consultar as parcelas do CPF/CNPJ do interessado e vincular uma parcela ao processo (código do imóvel, área em hectares, município/UF, situação no SIGEF).
- Os dados vinculados aparecem na página de detalhe do processo, e cada consulta é registrada na tabela `SigefConsulta` (auditoria).
- A API oficial exige **adesão do órgão ao Conecta gov.br** (credenciais OAuth2). Enquanto as credenciais não estiverem configuradas — ou se a API falhar — o sistema retorna **dados simulados** (determinísticos) e sinaliza a origem na interface ("Dados simulados").

### Configuração

Copie `.env.example` para `.env` e ajuste:

| Variável | Descrição |
| --- | --- |
| `SIGEF_MOCK` | `true` (padrão) força dados simulados; `false` tenta a API real |
| `SIGEF_CLIENT_ID` / `SIGEF_CLIENT_SECRET` | Credenciais OAuth2 do Conecta gov.br |
| `SIGEF_BASE_URL` | Endpoint da API SIGEFGEO (produção já preenchido) |
| `SIGEF_TOKEN_URL` | Endpoint do token OAuth2 |

Endpoint interno: `POST /api/sigef/consulta` com `{ "cpfCnpj": "...", "processId": "..." }`.

---

## Portal do Solicitante (gov.br)

Portal público em `/portal` para o cidadão solicitar certidões com identidade validada pelo gov.br (decisões da reunião com clientes de 31/07/2026):

- **Login gov.br** (`/portal/login`): CPF validado com checksum oficial. Em homologação roda com `GOVBR_MOCK=true`; quando o Keycloak OIDC estiver ativo, apenas o callback muda — a sessão (cookie assinado HMAC-SHA256) é a mesma.
- **Complemento de cadastro** (`/portal/completar-cadastro`): apenas **e-mail e telefone** para contato. Município/RA **não** fazem parte do cadastro do usuário — pertencem ao imóvel de cada certidão.
- **Dashboard** (`/portal`): contadores de solicitações pendentes, aprovadas e devolvidas + histórico completo com protocolo `CERT-ANO-NNNNNN`.
- **Nova Solicitação** (`/portal/nova-solicitacao`): ao abrir, busca **automaticamente** no SIGEF/INCRA os imóveis vinculados ao CPF do login; o usuário seleciona a parcela e envia — **sem documentos** quando o imóvel vem do SIGEF.
- **Imóvel sem registro no INCRA**: a solicitação é aberta mesmo assim; os dados do imóvel são preenchidos **internamente pelo funcionário** e o solicitante anexa **planta do imóvel** e **comprovante de propriedade** (matrícula não é exigida).
- **Procurador**: entra com o gov.br dele, informa CPF/nome do proprietário e anexa a **procuração**.
- Uploads: PDF/JPG/PNG até 10 MB (`POST /api/portal/documentos`), tipos `PLANTA`, `DOC_PROPRIEDADE`, `PROCURACAO`.

### Variáveis de ambiente adicionais

| Variável | Descrição |
| --- | --- |
| `PORTAL_SESSION_SECRET` | Segredo HMAC da sessão do portal (trocar em produção) |
| `GOVBR_MOCK` | `true` = login gov.br simulado (homologação); `false` = OIDC Keycloak |

Endpoints do portal: `POST /api/portal/login`, `POST /api/portal/logout`, `POST /api/portal/cadastro`, `GET /api/portal/me`, `GET|POST /api/portal/solicitacoes`, `POST /api/portal/documentos`.

---

## Módulo de Geometria de Divisas (tela `/geometria`)

Corte automático do polígono do imóvel (vindo do SIGEF) pelas **linhas de divisa validadas**:

- **Classificação automática**: FACIL (fora do corredor de 1 km), MEDIO (no corredor, sem corte), DIFICIL (divisa simples, 2 municípios), PIOR_CASO (divisa tríplice/quádrupla ou rio — com *extend* da linha e *merge* automático de microfragmentos).
- **Tela de mapa** (`/geometria`): Leaflet + OpenStreetMap; cola-se o GeoJSON do imóvel, calcula o corte e exibe fragmentos coloridos + tabela de áreas/percentuais por município para conferência do técnico.
- **Rastreabilidade**: cada corte grava linha utilizada, banco de origem e data (`CorteDivisa`).
- Endpoints: `GET|POST /api/geometria/linhas`, `POST /api/geometria/corte`, `POST /api/geometria/seed` (dados demo DF).
- Geometrias em GeoJSON/TEXT (funciona no SQLite); migração para **PostgreSQL/PostGIS** documentada em `docs/MIGRACAO-POSTGIS.md`.

### Migração para PostgreSQL/PostGIS (Fase 2)

Pronta no repositório: adapter dual em `src/lib/prisma.ts` (SQLite em dev, Postgres em produção),
migrations convertidas em `prisma-postgres/`, colunas PostGIS com índices GIST, script de migração
de dados `scripts/sqlite-to-postgres.ts` e Dockerfile/fly.toml **sem Litestream**.
Passo a passo completo em `docs/MIGRACAO-POSTGIS.md`.

---

## Migrations em produção (sem SSH)

- **A cada deploy:** o `release_command` no `fly.toml` roda `prisma migrate deploy`
  numa VM de release descartável, antes da nova versão entrar no ar. Se falhar,
  o deploy aborta e a versão atual continua no ar.
- **Comandos pontuais** (ex.: sincronizar schema com `db push`): use
  `./scripts/fly-db-push.sh <senha>` — abre túnel WireGuard (`fly proxy`) e roda
  da sua máquina, sem SSH.

### Enriquecimento da simulacao SIGEF com CAR/SICAR

Com `SIGEF_CAR=true` (padrao), as parcelas simuladas usam **geometrias reais** de
imoveis do CAR, via GeoServer publico (`geoserver.car.gov.br/geoserver/sicar/wfs`,
camada `sicar:sicar_imoveis_<uf>`). Isso alimenta o modulo de corte de divisas
(`/geometria`) com poligonos reais do estado de Sao Paulo. O CAR nao expoe CPF do titular, entao
a associacao CPF -> imovel segue simulada. Endpoint auxiliar: `GET /api/car/imoveis?uf=SP`.
