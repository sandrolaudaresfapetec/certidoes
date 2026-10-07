# Guia para IAs e pessoas — Sistema de Certidões (IGC SP)

**Leia este arquivo inteiro e o [`PENDENCIAS.md`](PENDENCIAS.md) antes de alterar qualquer coisa.** Vale para qualquer IA (Claude Code, Codex, Cursor, Devin…) e para pessoas. Se este guia estiver desatualizado ou conflitar com um pedido, avise e proponha o ajuste; quando uma convenção mudar, atualizar este arquivo faz parte da tarefa.

## 1. Contexto

Sistema de emissão de **Certidão de Jurisdição Territorial (CJT)** do IGC-SP. Next.js 16 (App Router) + React 19 + Prisma 7; SQLite em desenvolvimento, PostgreSQL/PostGIS em produção (Fly.io). Três áreas no mesmo repositório, com autenticação separada:

- **Portal do solicitante** (`/portal`, cookie `portal_session`) — o cidadão pede a certidão.
- **Backoffice** (todo o resto, cookie `igc_session`) — requisições, processos (workflow de 9 etapas e assinaturas), usuários.
- **Corte de divisas** (`/geometria`) — mapa que corta o polígono do imóvel pelas linhas de divisa municipal.

Fluxo de domínio: `Solicitante` → `Solicitacao` (requisição) → abertura do `Process` → etapas do workflow → certidão em `/processos/[id]/certidao`. O `README.md` descreve cada módulo; `docs/` tem os planos de migração e de teste.

**Nós somos a equipe de frontend.** Backend e infra têm donos próprios.

## 2. Escopo: só mexemos em frontend

| Área | Caminhos | Regra |
| --- | --- | --- |
| **Frontend** (nosso) | `src/app/**` **exceto** `src/app/api/**` (páginas, layouts, `globals.css`) · `src/components/**` · `public/**` | Editar livremente. |
| **Compartilhado — só apresentação** | `src/lib/utils.ts` · `src/lib/cpf.ts` (`formatarCPF`) · `src/lib/requisicao-status.ts` · `src/lib/papeis.ts` · rótulos/cores de `WORKFLOW_STAGES` em `src/lib/workflow.ts` · helpers de exibição (máscara, rótulos) de `src/lib/cjt-formulario.ts` | A API também importa estes módulos. Mudar **rótulo, cor ou formatação** é frontend. Mudar **regra** (transições, autorização, validação, normalização) é backend: registre em `PENDENCIAS.md`. |
| **Toolchain** | `package.json` · `next.config.ts` · `tsconfig.json` · `eslint.config.mjs` · `postcss.config.mjs` | Só quando o trabalho de frontend exigir (ex.: dependência de UI). Diga isso explicitamente ao final. |
| **Backend** (não editar) | `src/app/api/**` · `src/proxy.ts` · `src/lib/{auth,portal-auth,prisma,sigef,sigef-parcelas,car,geometria,linhas-demo}.ts` · `prisma/**` · `prisma-postgres/**` · `prisma.config*.ts` · `scripts/import-sigef-shp.ts` · `scripts/sqlite-to-postgres.ts` | Ler é livre; escrever, não. |
| **Infra** (não editar) | `Dockerfile` · `docker-entrypoint.js` · `fly*.toml` · `deploy/**` · `.github/**` · `scripts/*.sh` · `.dockerignore` · `.env.example` | Ler é livre; escrever, não. |

Observação sobre páginas: as `page.tsx` são Server Components e consultam o Prisma diretamente. Ajustar **a consulta de leitura** de uma página para exibir um dado é frontend. Alterar o schema, criar rota de API ou mudar regra de negócio é backend.

### Regras

1. **Leia à vontade, escreva só no seu lado.** Entender as rotas de API e as libs é obrigatório antes de consumi-las; editar não.
2. **Nunca "conserte rapidinho" backend ou infra, nem uma linha.** Registre em `PENDENCIAS.md` e siga.
3. **Não invente contratos.** Não presuma endpoint, campo ou comportamento de API: leia a rota. Se a UI precisa de algo que não existe, é pendência de `backend` (adição) — implemente o que for possível sem ela.
4. **Esconder um botão não é segurança.** Toda autorização é do servidor (`requireUsuario`, `exigir*Api`). A UI pode refletir permissões (`podeAtender`, papel do usuário) por usabilidade, nunca como controle.
5. **Sem dados falsos para tapar API ausente** no código que vai para o repositório, a menos que haja uma pendência referenciada (ver 3.4).
6. **Se o pedido exigir sair do escopo**, pare, explique o que cruza a fronteira, registre a pendência e pergunte como seguir. Caso o usuário aceite por conta propria que voce vá contra alguma regra daqui, você terá permissão. Apenas se o uauário te conceder tal permissão.
7 **Não commite nem faça push sem pedido explícito.** Todo commit feito neste repositório deve ser solicitado ou autorizado pelo usuário.

## 3. `PENDENCIAS.md` — o registro do que não é nosso (e do nosso backlog)

### 3.1 Quando consultar e quando registrar

- **Ao começar uma tarefa**, leia ao menos o índice de `PENDENCIAS.md`: o problema pode já estar registrado. Se estiver, **atualize a entrada existente** em vez de criar outra.
- **Registre** quando encontrar: algo quebrado ou faltando fora do escopo (backend/infra); uma decisão de negócio que falta para continuar; uma lacuna do frontend que você não vai resolver agora; um contorno que você aplicou.
- **Não registre**: preferência de estilo, dúvida que o código já responde, ou algo que você corrigiu na própria tarefa (se está no escopo, apenas corrija).

### 3.2 Como registrar

- **ID:** `#PEND-N`, onde N = maior número existente + 1. **Nunca reutilize, renumere ou apague** um ID — itens fechados ficam no arquivo.
- Acrescente **uma linha no índice** e **uma entrada em "Detalhes"** (no fim, em ordem numérica).
- **Responsável** = onde a correção precisa acontecer (tabela da seção 2), não quem descobriu: `frontend`, `backend`, `infra` ou `negócio` (decisão do CJT/IGC). Em fronteira duvidosa, escolha o mais provável e registre a dúvida no Detalhe.
- **Tipo:** `bugfix` · `adição` · `melhoria` · `refatoração` · `segurança` · `documentação` · `decisão`.
- **Prioridade:** `alta` (bloqueia fluxo ou expõe risco) · `média` · `baixa`.
- **Status** (só no índice): `aberta` · `em andamento` · `bloqueada (#PEND-N)` · `resolvida (AAAA-MM-DD)` · `descartada (motivo)`.
- **Detalhe — breve (3 a 6 linhas):** o que está errado ou falta, com **evidência observável** (erro, trecho, comportamento) e **onde** (arquivo ou rota). Nada de suposição apresentada como fato. Quando houver: *Impacto no frontend*, *Depende de*, *Bloqueia*.
- **Fechar:** mude o status no índice para `resolvida (data)` e acrescente à entrada uma linha `**Resolução:**` com o commit ou PR.

### 3.3 Responsável e tipo aparecem em dois lugares

No índice e na entrada. Se mudar um deles, atualize os dois. Status e prioridade vivem **só** no índice.

### 3.4 Contornos no frontend

Contorne um problema de backend **só** se for seguro e não esconder o problema. Descreva o contorno na pendência e marque o ponto no código com um comentário `// PEND-N: o que remover quando resolver`.

### 3.5 Ao terminar

Diga ao usuário **quais pendências você criou ou alterou** (IDs e uma frase cada).

## 4. Rodando o projeto

```bash
npm install
cp .env.example .env          # depois troque DATABASE_URL para "file:./prisma/dev.db"  (#PEND-20)
npx prisma generate
npx prisma db push            # NÃO use `migrate deploy` em banco novo  (#PEND-18)
npm run dev                   # http://localhost:3000
curl -X POST http://localhost:3000/api/seed    # dados de demonstração (só enquanto nenhum usuário tem senha)
```

- O `.env` é local e ignorado pelo git; nunca o commite. Em desenvolvimento só `DATABASE_URL` é necessária — o resto tem valor padrão. SIGEF e gov.br rodam **simulados** (`SIGEF_MOCK`, `GOVBR_MOCK`).
- **Logins de demonstração (somente dev):** backoffice em `/login` com `admin@igc.sp.gov.br` / `IGC@certidoes-2026` (também `gerente@`, `diretor@`, `thiago@`… no mesmo domínio e com a mesma senha); portal em `/portal/login` com qualquer CPF de checksum válido e um nome.
- Para testar uma tela por papel, entre com um usuário daquele papel (`ADMIN`, `SDTC`, `GERENTE`, `DIRETOR`, `TECNICO`, `CONFERENTE`): as ações mudam conforme o papel.

## 5. Convenções do frontend

- **Next.js 16 é diferente do que os modelos conhecem** (ver o bloco no fim deste arquivo). Antes de usar uma API do Next de que não tenha certeza, leia o guia em `node_modules/next/dist/docs/`. Já verificado no código: o middleware se chama `src/proxy.ts`; `params` e `searchParams` são `Promise` e precisam de `await`.
- **Páginas** são Server Components com `export const dynamic = "force-dynamic"` e `await requireUsuario()` (ou `requireAdmin()`; no portal, `requireSolicitante()`) no início, seguido das consultas Prisma. **Interatividade** vai em Client Components (`"use client"`), em `src/components/`. Páginas client que precisam de proteção a recebem por `layout.tsx` (ex.: `src/app/geometria/layout.tsx`).
- **Mutações** são `fetch` para `/api/...` (JSON, ou multipart nos uploads), tratando o `{ error }` do corpo e exibindo o erro **em texto** com `role="alert"`.
- **Estilo:** Tailwind CSS 4 + ícones `lucide-react`. Não há design system formal: **replique o padrão do componente vizinho**. Radix e `tailwind-merge` estão nas dependências mas quase não são usados.
- **Textos da interface em pt-BR, com acentuação correta nos textos novos.** Há textos antigos sem acento (ex.: itens da sidebar); não os corrija em massa fora de uma tarefa para isso.
- **Acessibilidade** (exigência da Especificação Funcional CJT): rótulo associado a todo controle (`label`/`htmlFor` ou `aria-*`), uso completo por teclado, erro em texto e não só em cor. Vale para todo formulário novo.
- **Campos e botões seguem a regra global de `src/app/globals.css` (camada `base`) — não a redefina por componente:** placeholder `#6B7280`, texto digitado `#111827` em peso 400 (nunca negrito), cursor de mão em todo botão, checkbox e radio (e no rótulo que os envolve) e `not-allowed` nos desabilitados. Para uma exceção intencional, use um utilitário (ex.: `cursor-default`). Rótulo que envolve checkbox/radio deve ser filho direto (`<label><input …/>texto</label>`) para a regra alcançá-lo.
- **A plataforma só tem tema claro** (`color-scheme: light` em `globals.css`). Não há modo escuro: as telas usam fundos claros fixos, e o tema escuro do sistema do usuário não muda nada. Não reintroduza `prefers-color-scheme` sem desenhar todas as telas para ele.
- **CPF, CNPJ e telefone têm máscara de digitação.** Use `CampoMascarado` (`src/components/campo-mascarado.tsx`) com as funções de `src/lib/mascaras.ts` (`mascaraCpf`, `mascaraCpfCnpj`, `mascaraTelefone`); em telas de leitura, `exibirCpfCnpj`. A máscara é só de exibição: ao enviar, CPF/CNPJ vão só com números (`digitosCpfCnpj`) e o telefone vai formatado, como a API e o banco já esperam.
- **Estados da requisição:** o texto de `Solicitacao.status` e a regra "o solicitante pode editar" (`clientePodeEditar`) ficam em `src/lib/solicitacao-estados.ts`; todo status novo entra também em `REQUISICAO_STATUS` (`requisicao-status.ts`), senão a tela o mostra como "Pendente". **A "DDD" do documento do cliente são os papéis ADMIN e SDTC** (`podeAtender`), decisão do time em 2026-10-07: quem devolve, libera, decide arquivamento e vê a fila de requisições.
- **Rotas do portal** abrem com `exigirSolicitanteApi()` (`portal-auth.ts`) e filtram a requisição pelo dono (`where: { id, solicitanteId }`). Protocolo novo só por `criarComProtocolo()` (`src/lib/protocolo.ts`), nunca por `count()+1`.
- **Não duplique constantes:** use `REQUISICAO_STATUS`, `WORKFLOW_STAGES`, `PAPEIS` etc. em vez de reescrever rótulos.
- **`src/components/requisicao-form.tsx` é compartilhado** pelo portal (`/portal/nova-solicitacao`) e pelo atendimento (`/requisicoes/nova`): teste os dois ao alterá-lo. A prop `variante` (`"SOLICITANTE"` ou `"ATENDIMENTO"`) escolhe caixas progressivas e tela de envio.
- **Histórico do que já foi implementado** (pedido do cliente → arquivo → URL → decisões → limites) fica em [`docs/`](docs/): comece por [`docs/correcoes-cjt-portal.md`](docs/correcoes-cjt-portal.md) (portal do solicitante) e [`docs/melhorias-frontend-backoffice.md`](docs/melhorias-frontend-backoffice.md) (edição do processo, corte de divisas, máscaras, contraste) e [`docs/atendimento-cjt-pedidos-restantes.md`](docs/atendimento-cjt-pedidos-restantes.md) (chat, devolver, usucapião, rascunho, 13 polígonos e as fases seguintes). Ao concluir um trabalho relevante, registre-o lá ou em um arquivo novo da mesma pasta.

## 6. Antes de dizer "terminei"

1. `npx tsc --noEmit` — o baseline está limpo.
2. `npx eslint src` — o baseline está limpo. (`npx eslint` na raiz acusa 1 erro conhecido em `docker-entrypoint.js`: #PEND-22. Não pode surgir erro novo.)
3. `npm test` (Vitest, testes em `src/**/*.test.ts`) quando mexer em `src/lib`; lib de regra nova leva teste.
4. `npm run build`, quando mexer em rotas, layouts ou configuração.
5. **Mudança visível: suba o servidor e use a funcionalidade no navegador** — caminho feliz, erros e os papéis relevantes. Testes de tipo e lint não provam que a tela funciona. Se não for possível testar, diga isso explicitamente em vez de afirmar que está pronto.
6. `git status`: nada de `.env`, `*.db` ou segredos no que será commitado.
7. Informe as pendências criadas ou alteradas (3.5).

## 7. Git

- **Não commite nem faça push sem pedido explícito.** Nunca force-push.
- Mensagens no estilo do histórico: `feat|fix|chore|docs(escopo): resumo em português`. Trabalho ligado a card do Jira leva a chave no início (`SC-28 …`).
- Uma branch por tarefa (nomes vistos no histórico: `SC-28-…`, `devin/…`).

---

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
