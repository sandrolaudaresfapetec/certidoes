---
name: testing-rbac-igc
description: Test RBAC filtering and authentication for the IGC SP certification system. Use when verifying role-based access control, process visibility, and navigation filtering after auth or RBAC changes.
---

# Testing RBAC — IGC SP Certification System

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
| cliente@email.com | CLIENTE | 1 (#1) | 5 (no SIGEF/Novo Processo/Usuarios/Config) | Only own linked process |

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

## Key Files

- `src/lib/auth.ts` — JWT auth, requireAuth(), getProcessFilter()
- `src/components/sidebar.tsx` — Navigation with role-based filtering
- `src/app/page.tsx` — Dashboard with process counts
- `src/app/processos/page.tsx` — Process list with RBAC filtering
- `src/app/login/page.tsx` — Login page
- `src/middleware.ts` — Route protection / redirect to login
- `src/app/api/seed/route.ts` — Seed data with users and processes