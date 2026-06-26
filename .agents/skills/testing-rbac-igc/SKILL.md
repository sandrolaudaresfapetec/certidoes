---
name: testing-rbac-igc
description: Test RBAC filtering, authentication, Solicitacao workflow, and UI theme for the IGC SP certification system. Use when verifying role-based access control, process visibility, navigation filtering, Solicitacao-to-Process conversion, or visual/branding changes.
---

# Testing RBAC & UI — IGC SP Certification System

## Prerequisites

- App deployed at https://certidoes.fly.dev/ (Fly.io)
- Database seeded via `POST /api/seed` (creates 10 users + 10 processes)
- All test user passwords: `igc2026`

## Devin Secrets Needed

- `FLY_API_TOKEN` (org-level) — for deploying to Fly.io if redeployment is needed

## Test Users & Expected Access

| Email | Role | Expected Processes | Nav Items | Notes |
|-------|------|-------------------|-----------|-------|
| admin@igc.sp.gov.br | ADMIN | All (10) | All 9 | Full access including Usuarios/Configuracoes |
| gerente@igc.sp.gov.br | GERENTE | All (10) | 7 (no Usuarios/Config) | Same data as ADMIN, fewer nav items |
| diretor@igc.sp.gov.br | DIRETOR | All (10) | 7 (no Usuarios/Config) | Same as GERENTE |
| thiago@igc.sp.gov.br | TECNICO | 3 (#1,#4,#7) | 6 (no Novo Processo/Usuarios/Config) | Only tecnicoRespId-assigned |
| ana@igc.sp.gov.br | TECNICO | 3 (#2,#6,#9) | 6 | Different assigned set |
| pedro@igc.sp.gov.br | TECNICO | 2 (#8,#10) | 6 | Different assigned set |
| marcos@igc.sp.gov.br | CONFERENTE | Varies | 6 | Sees conferencia-stage + assigned |
| sdtc@igc.sp.gov.br | SDTC | All (10) | 7 (includes Novo Processo) | Created all seed processes |
| gdtac@igc.sp.gov.br | GDTAC | Varies | 7 | Sees distribuicao_gdat + analise_tecnica stages |
| cliente@email.com | CLIENTE | Own solicitacoes | 4 (Dashboard, Minhas Solicitacoes, Nova Solicitacao, Notificacoes) | NO Processos/Quadro/Fluxo/SIGEF |

## RBAC Filtering Logic

The core filter is in `src/lib/auth.ts` → `getProcessFilter(userId, role)`:
- ADMIN/GERENTE/DIRETOR: `{}` (no filter — see all)
- SDTC: `{ criadoPorId: userId }` (only created by them)
- TECNICO: `{ tecnicoRespId: userId }` (only assigned to them)
- CLIENTE: `{ clienteId: userId }` (only their own)
- CONFERENTE: `{ OR: [tecnicoConfId, situacao=conferencia] }`
- GDTAC: `{ OR: [situacao in distribuicao_gdat/analise_tecnica, criadoPorId] }`

## Navigation Filtering

Defined in `src/components/sidebar.tsx`. Items with `roles` array are only shown to those roles:
- "Novo Processo": ADMIN, SDTC only
- "SIGEF": All except CLIENTE and CONFERENTE
- "Usuarios": ADMIN only
- "Configuracoes": ADMIN only
- Other items (Dashboard, Processos, Quadro, Notificacoes, Fluxo): visible to all

## Test Procedure

### 1. Invalid Credentials
- Navigate to /login
- Enter valid email with wrong password
- Expect: red error banner "Credenciais invalidas"

### 2. Role-Based Login Tests
For each role (at minimum ADMIN, TECNICO, CLIENTE, SDTC):
1. Login with credentials from table above
2. Check dashboard "Total de Processos" matches expected count
3. Check sidebar nav items match expected set
4. Navigate to /processos and verify process count
5. Logout (click "Sair" in sidebar)

### 3. Unauthenticated Redirect
- After logout, navigate directly to https://certidoes.fly.dev/
- Expect: redirect to /login

### 4. Process Creation (SDTC/ADMIN only)
- Login as SDTC or ADMIN
- Click "Novo Processo" in sidebar
- Verify form loads with fields: Tipo de Servico, Expediente, Interessado, etc.

## Troubleshooting

- **App not responding:** Fly.io might have `auto_stop_machines` enabled. The first request may timeout; retry after ~10 seconds for cold start.
- **Seed data missing:** Call `POST https://certidoes.fly.dev/api/seed` to repopulate. This might reset existing data.
- **Process counts don't match:** Seed data assigns processes via `tecnicoRespId`, `criadoPorId`, `clienteId`. If seed was run multiple times, counts may differ. Re-seed to reset.
- **Gov.br OAuth:** Requires external Gov.br credentials and callback URL configuration. Skip unless specifically testing OAuth flow.
- **No CI configured:** This repo has no CI pipeline. All testing is manual via browser.

## UI Theme Testing

The app uses an institutional light theme (no dark mode). When testing UI/branding changes:

### Visual Assertions
- **Login page:** Background should be light gray (bg-gray-50), white card, no dark gradient
- **Sidebar:** White background (bg-white) with gray-200 right border, gray nav text
- **Logos:** IGC logo (logoIGC.png) + SP logo (logoSP.png) should appear in sidebar header and login page
- **Active nav state:** Gray-100 background with gray-700 left border (not blue)
- **Buttons:** Gray-700/gray-800, never blue (#1351B4)
- **Headings:** text-gray-800 throughout, never #071D41

### Forbidden Colors
These old institutional blues should NOT appear anywhere:
- `#071D41` (dark SP blue) — was used for backgrounds
- `#1351B4` (bright blue) — was used for buttons/accents
- `#0C2D6B`, `#0C326F` — were used for gradients

### UI Test Procedure
1. Navigate to /login — verify light bg, white card, both logos, gray buttons
2. Login as ADMIN — verify white sidebar, gray nav, logos in sidebar header
3. Check dashboard — headings are gray-800, stat cards are neutral
4. Navigate to each page (/processos, /fluxo, /sigef, /quadro) — verify consistent gray palette
5. Login as different role (e.g. TECNICO) — verify same theme + RBAC still works

### Tips
- Use zoomed screenshots of sidebar and login header to verify logo rendering
- Test at least 2 roles (ADMIN + TECNICO) to confirm theme is consistent across roles
- Dark mode is disabled (`globals.css` has no `@media prefers-color-scheme: dark` block)
- Reference design: https://www.igc.sp.gov.br/habit_igc (white backgrounds, minimal, professional)

## Solicitacao Workflow Testing

The Solicitacao (client registration) is a two-stage workflow: Client submits a Solicitacao → SDTC reviews docs → converts to Process.

### CLIENTE Dashboard Restrictions
- Dashboard heading: "Bem-vindo, {name}" (NOT "Dashboard")
- Stat cards: Total, Pendentes, Aprovadas, Devolvidas
- NO "Distribuicao por Etapa" chart, NO "Processos Recentes" table
- Sidebar: exactly 4 items (Dashboard, Minhas Solicitacoes, Nova Solicitacao, Notificacoes)
- Must NOT show: Processos, Quadro, Fluxo, SIGEF, Novo Processo, Usuarios, Configuracoes

### CLIENTE Creates Solicitacao
1. Click "Nova Solicitacao" in sidebar
2. Fill form: Tipo Servico, Interessado, Email, Telefone, CPF/CNPJ, Municipio, RA
3. Check required documents (5 of 7 are required: Requerimento, Identidade, Comprovante, Planta, Matricula)
4. Submit → Success screen "Solicitacao Enviada!" with green checkmark
5. Auto-redirect to /solicitacoes within ~2 seconds
6. Verify new item appears in list with status "Pendente"

### SDTC Reviews Solicitacao
1. Login as SDTC (sdtc@igc.sp.gov.br)
2. Sidebar shows "Solicitacoes" (not "Minhas Solicitacoes")
3. Click a Pendente solicitacao
4. Detail page shows "Acoes SDTC" section with 4 buttons:
   - Iniciar Analise → status changes to "Em Analise" (blue badge)
   - Aprovar e Converter para Processo → validates 5 required docs, creates Process
   - Devolver ao Cliente → returns to client for corrections
   - Rejeitar → rejects the solicitacao
5. After conversion: status "Aprovada" (green), banner "Convertida para Processo #X", "Acoes SDTC" section disappears

### Known Issues / Gotchas
- **API response structure:** `/api/auth/me` returns `{ user: { role: "..." } }`, not `{ role: "..." }`. If "Acoes SDTC" section doesn't render, check that the detail page reads `meData.user.role` (not `meData.role`). This was a real bug found during testing.
- **Document checkboxes:** When logged as SDTC, doc checkboxes might be interactive (editable). When logged as CLIENTE or after conversion, they should be read-only.
- **Cold start:** Fly.io auto-stops machines. First request may timeout (~10s). Retry once.

## Key Files

- `src/lib/auth.ts` — JWT auth, requireAuth(), getProcessFilter()
- `src/components/sidebar.tsx` — Navigation with role-based filtering, logo placement
- `src/app/page.tsx` — Dashboard with process counts
- `src/app/processos/page.tsx` — Process list with RBAC filtering
- `src/app/login/page.tsx` — Login page with logos and light theme
- `src/app/globals.css` — Global styles (dark mode disabled)
- `src/middleware.ts` — Route protection / redirect to login
- `src/app/api/seed/route.ts` — Seed data with users and processes
- `src/app/solicitacoes/page.tsx` — Solicitacao list (CLIENTE sees "Minhas Solicitacoes", SDTC sees "Solicitacoes de Clientes")
- `src/app/solicitacoes/[id]/page.tsx` — Solicitacao detail with SDTC review actions
- `src/app/solicitacoes/nova/page.tsx` — New Solicitacao form with doc checklist
- `src/app/api/solicitacoes/route.ts` — Solicitacao CRUD API
- `src/app/api/solicitacoes/[id]/converter/route.ts` — Conversion endpoint (Solicitacao → Process)
- `src/app/api/auth/me/route.ts` — Returns `{ user: { id, name, email, role, ... } }`
- `public/images/logoIGC.png` — IGC institutional logo
- `public/images/logoSP.png` — SP Government logo
