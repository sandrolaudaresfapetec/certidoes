# Pendências

Registro dos problemas, lacunas e decisões em aberto encontrados durante o desenvolvimento do frontend — principalmente o que está **quebrado ou faltando fora do nosso escopo** (backend, infra) e o que depende de **decisão de negócio**. Também guarda o backlog que é nosso (frontend).

As regras de uso (quando registrar, como numerar, como fechar) estão em [`AGENTS.md`](AGENTS.md), seção 3. Resumo: **numeração sequencial e permanente (`#PEND-N`), nunca reutilizada, nunca apagada.**

## Legenda

| Campo | Valores |
| --- | --- |
| **Responsável** | `frontend` · `backend` · `infra` · `negócio` (decisão do CJT/IGC) |
| **Tipo** | `bugfix` · `adição` · `melhoria` · `refatoração` · `segurança` · `documentação` · `decisão` |
| **Prioridade** | `alta` · `média` · `baixa` |
| **Status** | `aberta` · `em andamento` · `bloqueada (#PEND-N)` · `resolvida (AAAA-MM-DD)` · `descartada (motivo)` |

Onde cada área começa e termina: `AGENTS.md`, seção 2.

## Índice

O **status** e a **prioridade** vivem só aqui; responsável e tipo aparecem também em cada entrada. Se mudar um deles, atualize os dois lugares.

| ID | Título | Responsável | Tipo | Prioridade | Status |
| --- | --- | --- | --- | --- | --- |
| #PEND-1 | Login do portal não autentica de verdade; `GOVBR_MOCK` não é lida | backend | segurança | alta | aberta |
| #PEND-2 | Sessão do portal: segredo padrão em produção, sem expiração e sem `secure` | backend | segurança | alta | aberta |
| #PEND-3 | Documentos anexados não podem ser lidos (sem rota de download) | backend | adição | alta | aberta |
| #PEND-4 | Listar/baixar documentos anexados na tela da requisição | frontend | adição | alta | bloqueada (#PEND-3) |
| #PEND-5 | Tela de edição do processo e atribuição de técnico/conferente | frontend | adição | alta | resolvida (2026-10-07) |
| #PEND-6 | GERENTE (quem distribui) não consegue atribuir técnico/conferente | backend | bugfix | alta | aberta |
| #PEND-7 | `/geometria` fora da navegação e sem vínculo com o processo | frontend | melhoria | média | resolvida (2026-10-07) |
| #PEND-8 | Leaflet carregado do unpkg em runtime, sem `integrity` | frontend | melhoria | baixa | aberta |
| #PEND-9 | Múltiplos proprietários: regra do "e outros" não implementada | backend | adição | média | aberta |
| #PEND-10 | Nomes de gleba/polígono: não rejeita matrícula nem município | backend | adição | média | descartada (substituída por #PEND-36) |
| #PEND-11 | Decisão: usucapião — matrícula numérica ou literal "USUCAPIÃO"? | negócio | decisão | média | resolvida (2026-10-06) |
| #PEND-12 | Decisão: INCRA/SNCR — campo vazio ou opção "Não se aplica"? | negócio | decisão | média | aberta |
| #PEND-13 | Decisão: fonte da lista de municípios proibidos nos nomes de polígono | negócio | decisão | média | descartada (nomenclatura fechada, #PEND-36) |
| #PEND-14 | Decisão: formato da "pontuação de centena" na matrícula | negócio | decisão | baixa | aberta |
| #PEND-15 | Decisão: Pergunta 1 × checkbox "procurador" — qual controla? | negócio | decisão | média | resolvida (2026-10-06) |
| #PEND-16 | Amarrar o fluxo do procurador à Pergunta 1 | frontend | bugfix | média | resolvida (2026-10-06) |
| #PEND-17 | Acessibilidade do formulário CJT (`aria-*`, rótulo órfão) | frontend | bugfix | média | resolvida (2026-10-06) |
| #PEND-18 | Migrations SQLite não reconstroem o banco do zero | backend | bugfix | média | aberta |
| #PEND-19 | Colunas legadas sem uso em `Process` (`processes`, `users`) | backend | refatoração | baixa | aberta |
| #PEND-20 | `.env.example` desatualizado (caminho do banco, variáveis ausentes) | infra | documentação | média | aberta |
| #PEND-21 | Sem CI de qualidade (tsc, eslint, build) | infra | adição | média | aberta |
| #PEND-22 | `eslint` falha em `docker-entrypoint.js` | infra | bugfix | baixa | aberta |
| #PEND-23 | Restos do Litestream no `package.json` | infra | refatoração | baixa | aberta |
| #PEND-24 | Sem testes automatizados nas bibliotecas de regra | backend | adição | média | aberta |
| #PEND-25 | Chat da solicitação (não existe modelo, rota nem tela) | backend | adição | alta | resolvida (2026-10-07) |
| #PEND-26 | Devolução ao solicitante e bloqueio de edição fora de `DEVOLVIDA` | backend | adição | alta | resolvida (2026-10-07) |
| #PEND-27 | Modelo de status da requisição para o solicitante (5 gerais + 6 etapas) | backend | adição | alta | resolvida (2026-10-07) |
| #PEND-28 | Download da certidão emitida pelo solicitante | backend | adição | média | aberta |
| #PEND-29 | Pedido de arquivamento pelo solicitante (regra de custo/tempo) | backend | adição | média | resolvida (2026-10-07) |
| #PEND-30 | Análise agendada de duplicidade e sobreposição (4 situações) | backend | adição | alta | resolvida (2026-10-07) |
| #PEND-31 | Solicitação com 13+ polígonos: congelar e liberar pela DDD | backend | adição | alta | resolvida (2026-10-07) |
| #PEND-32 | Nível de complexidade 1–9 (hoje são 4 classes) | backend | adição | média | resolvida (2026-10-07) |
| #PEND-33 | SIGEF no portal: CPF/CNPJ do representado, parcelas e geometria | backend | adição | média | aberta |
| #PEND-34 | Persistir vínculo polígono nomeado ↔ parcela SIGEF | backend | adição | média | resolvida (2026-10-07) |
| #PEND-35 | Matrícula "Usucapião" na validação e na persistência | backend | adição | média | resolvida (2026-10-07) |
| #PEND-36 | Nomenclatura de polígonos e S/M–S/E validadas no servidor | backend | adição | média | resolvida (2026-10-07) |
| #PEND-37 | Decisão: o que é "incluir e-mail para finalizar o cadastro (ou SMS)" | negócio | decisão | média | aberta |
| #PEND-38 | Decisão: cartela de cores e logos do IGC | negócio | decisão | média | aberta |
| #PEND-39 | Decisão: dúvidas do documento de correções de 2026-09-16 | negócio | decisão | média | aberta |
| #PEND-40 | Texto auxiliar em `gray-400` abaixo do contraste AA (rodapé do portal) | frontend | melhoria | baixa | resolvida (2026-10-07) |
| #PEND-41 | Máscaras de entrada nos formulários (telefone, CPF, CNPJ etc.) | frontend | adição | média | resolvida (2026-10-07) |
| #PEND-42 | Rascunho de requisição ("Não enviadas"): status e rotas de salvar/enviar | backend | adição | média | resolvida (2026-10-07) |
| #PEND-43 | Salvar rascunho e continuar requisição no formulário e em Minhas Requisições | frontend | adição | média | resolvida (2026-10-07) |
| #PEND-44 | Validar no servidor o CPF/CNPJ do representado e a coerência com a Pergunta 1 | backend | segurança | média | resolvida (2026-10-07) |
| #PEND-45 | Associar cada polígono nomeado ao polígono do mapa (UI) | frontend | adição | média | resolvida (2026-10-07) |
| #PEND-46 | Consulta SIGEF simulada com CAR devolve parcelas com área 0 e município vazio | backend | bugfix | baixa | descartada (obsoleta: CAR removido em `f34b945`) |
| #PEND-47 | Layout raiz: `main` sem `min-w-0` deixa conteúdo largo esticar a página no celular | frontend | melhoria | baixa | aberta |
| #PEND-48 | `PATCH /api/processes/[id]` não valida tipos nem data vazia (devolve 500) | backend | bugfix | média | resolvida (2026-10-07) |
| #PEND-49 | `Process.total` nunca é calculado (a tela mostra R$ 0,00 mesmo com taxas) | backend | bugfix | média | resolvida (2026-10-07) |
| #PEND-50 | Decisão: acesso à API b-Cadastro (Portal Integrador): processo SEI de acordo bilateral e credencial | negócio | decisão | média | aberta |
| #PEND-51 | Integração com o SEI como última etapa do fluxo da certidão | backend | adição | média | aberta |
| #PEND-52 | Agendador da duplicidade em produção: `CRON_TOKEN`, `AGENDADOR_DUPLICIDADE` e instância sempre ligada | infra | documentação | média | aberta |
| #PEND-53 | Decisão: confirmar com o cliente as regras de duplicidade que o documento não detalha | negócio | decisão | média | aberta |
| #PEND-54 | Decisão: aceitar o arquivamento não cancela o processo aberto | negócio | decisão | média | aberta |
| #PEND-55 | Decisão: quem marca a divisa como finalizada e confirmar as hipóteses do nível de complexidade | negócio | decisão | média | aberta |

## Detalhes

Entradas registradas em 2026-10-06 a partir da análise inicial do sistema (leitura do código, `tsc`, `eslint`, build e comparação com a Especificação Funcional CJT v1.0).

### #PEND-1 · Login do portal não autentica de verdade; `GOVBR_MOCK` não é lida

**Responsável:** backend · **Tipo:** segurança · **Registrada em:** 2026-10-06
**Onde:** `src/app/api/portal/login/route.ts`

A rota aceita `{ cpf, nome }` com CPF de checksum válido, faz `upsert` do `Solicitante` e emite a sessão — em qualquer ambiente. `GOVBR_MOCK` está no README e no `.env.example`, mas nenhum `process.env.GOVBR_MOCK` existe no código. Qualquer pessoa entra como o titular de qualquer CPF. O branch `feat/keycloak-oidc-integration` (OIDC) nunca foi mesclado.
**Impacto no frontend:** `/portal/login` é hoje um formulário CPF + nome. Com OIDC vira um botão "Entrar com gov.br"; o contrato (rota de início e callback) precisa ser definido pelo backend.

### #PEND-2 · Sessão do portal: segredo padrão em produção, sem expiração e sem `secure`

**Responsável:** backend · **Tipo:** segurança · **Registrada em:** 2026-10-06
**Onde:** `src/lib/portal-auth.ts` (`sessionSecret`, `assinarSessao`); cookie em `src/app/api/portal/login/route.ts`

Sem `PORTAL_SESSION_SECRET`, o segredo cai no literal público `dev-portal-secret-change-me` mesmo em produção — o backoffice (`src/lib/auth.ts`) lança erro nessa situação. O token é `id.hmac`, sem expiração embutida (só o `maxAge` do cookie, que fica no cliente), e o cookie sai sem `secure`. Alinhar com `auth.ts`.

### #PEND-3 · Documentos anexados não podem ser lidos (sem rota de download)

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** gravação em `src/app/api/portal/documentos/route.ts` e `src/app/api/requisicoes/documentos/route.ts` (`Documento.conteudoBase64`)

Planta, comprovante de propriedade e procuração são recebidos e gravados, mas nenhuma rota devolve o conteúdo. É preciso um `GET` com checagem de acesso (servidor logado; solicitante só os próprios) e `Content-Type`/`Content-Disposition`. Sem isso o técnico não consegue abrir os anexos dos casos em que eles são obrigatórios.
**Bloqueia:** #PEND-4.

### #PEND-4 · Listar/baixar documentos anexados na tela da requisição

**Responsável:** frontend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/components/requisicao-detalhe.tsx` (usado por `src/app/requisicoes/[id]/page.tsx` e `src/app/portal/requisicoes/[id]/page.tsx`)

Hoje a seção "Documentos" só lista tipo e nome do arquivo. Transformar cada item em link de visualização/download assim que a rota existir.
**Depende de:** #PEND-3.

### #PEND-5 · Tela de edição do processo e atribuição de técnico/conferente

**Responsável:** frontend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/app/processos/[id]/page.tsx`

A página é somente leitura (nenhum `<input>`/`<form>`; só os botões de transição). `PATCH /api/processes/[id]` já existe — 27 campos editáveis, valida o papel de quem é atribuído — e nenhum componente o chama. Falta a UI para expediente SEI, datas de visita, taxas, observações e técnico/conferente. Hoje a rota só aceita ADMIN/SDTC; atribuição pelo GERENTE depende de #PEND-6.
**Resolução:** Fase 3 do plano de melhorias, branch `feat/portal-correcoes-cjt` (2026-10-07). Nova rota `/processos/[id]/editar` (`src/app/processos/[id]/editar/page.tsx`) com `src/components/processo-edicao-form.tsx`: os 32 campos de `CAMPOS_EDITAVEIS`, envio só do que mudou, botão "Editar processo" e aviso "Processo atualizado." na tela do processo. O preenchimento do expediente SEI aparece no portal do solicitante. Fica de fora o GERENTE (#PEND-6).

### #PEND-6 · GERENTE (quem distribui) não consegue atribuir técnico/conferente

**Responsável:** backend · **Tipo:** bugfix (autorização) · **Registrada em:** 2026-10-06
**Onde:** `src/app/api/processes/[id]/route.ts` (PATCH usa `exigirAtendimentoApi`); `src/lib/workflow.ts` (`AUTORIZACAO_SAIDA.distribuicao_gdat`)

A etapa `distribuicao_gdat` é movida por GERENTE/ADMIN, mas `tecnicoRespId`/`tecnicoConfId` só podem ser gravados por ADMIN/SDTC. O backend deve definir quem atribui (confirmar com o negócio) — de preferência com permissão/rota própria de atribuição, separada da edição geral.
**Impacto no frontend:** define se o seletor de técnico em #PEND-5 aparece para o GERENTE.

### #PEND-7 · `/geometria` fora da navegação e sem vínculo com o processo

**Responsável:** frontend · **Tipo:** melhoria · **Registrada em:** 2026-10-06
**Onde:** `src/components/sidebar.tsx`, `src/app/processos/[id]/page.tsx`, `src/app/geometria/page.tsx`

Nenhum link aponta para `/geometria`; lá dentro o vínculo com o processo é um campo de texto onde se cola o ID. `POST /api/geometria/corte` já aceita `processId` e a certidão já lê o corte mais recente do processo. Falta o item de menu e um botão no processo que abra o mapa com processo/imóvel preenchidos.
**Resolução:** Fase 4 do plano de melhorias, branch `feat/portal-correcoes-cjt` (2026-10-07). Item "Corte de Divisas" em `src/components/sidebar.tsx`; botão "Corte de divisas" em `src/app/processos/[id]/page.tsx`; `src/app/geometria/page.tsx` lê `?processo=`, mostra a faixa "Processo vinculado" (com "Desvincular"), carrega a parcela do processo quando está no acervo (`GET /api/sigef/parcelas?codigo=`) e, depois do corte, mostra "Corte gravado no processo #N" com o link da minuta.

### #PEND-8 · Leaflet carregado do unpkg em runtime, sem `integrity`

**Responsável:** frontend · **Tipo:** melhoria (segurança/robustez) · **Registrada em:** 2026-10-06
**Onde:** `src/app/geometria/page.tsx` (injeção de `<script>` e `<link>`)

Dependência externa sem hash fixo; o mapa deixa de funcionar se o unpkg estiver inacessível (ambiente de governo com saída restrita). Preferir o pacote `leaflet` via npm ou, no mínimo, SRI.
**Histórico:** resolvida em `9a40c15` (2026-10-07) com `import("leaflet")` dinâmico e `leaflet/dist/leaflet.css`; **reaberta no merge com `origin/feat/portal-correcoes-cjt`**, cuja versão de `/geometria` (camadas do IGC, rascunho de desenho, upload de KML/SHP) carrega do unpkg, em versões fixas e sem `integrity`, o Leaflet, o `@geoman-io/leaflet-geoman-free` e o `shpjs` (constante `CDN`). Os plugins esperam o `L` global, então a troca precisa levar os três para o npm (dependências novas em `package.json`) e retestar o desenho e o upload. O mapa do portal (`mapa-imovel-leaflet.tsx`) já usa o pacote npm.

### #PEND-9 · Múltiplos proprietários: regra do "e outros" não implementada

**Responsável:** backend (lib compartilhada) · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/lib/cjt-formulario.ts` (`validarFormulario`, `normalizarParaPersistencia`)

A Especificação CJT v1.0 (§4, "Propriedade de") manda reconhecer os separadores `,` `;` `:` `/` e o "e" isolado e registrar "Primeiro nome e outros". Hoje só há `trim`, e a regra virou texto de ajuda na tela. Como o módulo também roda na API (revalida e persiste), a normalização precisa existir lá.
**Impacto no frontend:** ajustar o texto de ajuda/prévia em `requisicao-form.tsx` depois.
**Atualização (2026-10-06):** o documento de correções de 2026-09-16 pede só orientação textual — "Espólio de xxxx ; Outros" e proibir "S/M"/"S/E" — com formato diferente do "e outros" da spec. Ver #PEND-39 (item 4) e #PEND-36.

### #PEND-10 · Nomes de gleba/polígono: não rejeita matrícula nem município

**Responsável:** backend (lib compartilhada) · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/lib/cjt-formulario.ts` (bloco `nomesPoligonos`)

A spec (§4) proíbe nomes de município ou matrícula; hoje isso é só dica de texto. Rejeitar nome composto só de algarismos não depende de nada; rejeitar município depende de #PEND-13.
**Resolução:** substituída por #PEND-36 — o documento de correções de 2026-09-16 fecha a nomenclatura (Gleba/Parte/Parcela + complemento de até 3 caracteres), o que torna impossível um nome de município ou de matrícula.

### #PEND-11 · Decisão: usucapião — matrícula numérica ou literal "USUCAPIÃO"?

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-06
**Onde:** spec §11 ponto 1; `src/lib/cjt-formulario.ts` (matrícula obrigatória, só algarismos); coluna `Solicitacao.cjtMatricula`

A matriz exige número; o material operacional orienta escrever "usucapião" no campo. O sistema segue a matriz. Se o IGC aceitar a literal, mudam a validação, a coluna e a exibição na certidão.
**Resolução:** decidido no documento de correções de 2026-09-16 (Nova Requisição §2): nos casos Usucapião e Espólio com usucapião, pergunta "Quero informar o número da matrícula?" — Sim: fluxo normal; Não: o campo Matrícula é preenchido com "Usucapião", visível e travado; Não sei: interrompe. Implementação: #PEND-35 (backend) e o ramo na tela (frontend).
**Implementação (2026-10-07):** feita na Fase 3 do plano de atendimento CJT, ver #PEND-35.

### #PEND-12 · Decisão: INCRA/SNCR — campo vazio ou opção "Não se aplica"?

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-06
**Onde:** spec §11 ponto 2

Hoje o campo é opcional e vazio vira `null`. Decidir se é preciso uma opção explícita — que distinguiria "o imóvel não tem código" de "o cidadão não informou".

### #PEND-13 · Decisão: fonte da lista de municípios proibidos nos nomes de polígono

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-06

Não existe lista de municípios no projeto. Opções: usar `SigefParcela.municipio` (acervo importado, só SP) ou receber uma lista oficial do IGC. **Bloqueia** a parte de município de #PEND-10.
**Resolução:** descartada — com a nomenclatura fechada do documento de correções de 2026-09-16 (#PEND-36) não há mais nome livre a comparar com municípios. Inferência nossa; se o cliente ainda quiser a checagem, reabrir.

### #PEND-14 · Decisão: formato da "pontuação de centena" na matrícula

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-06
**Onde:** spec §4, "Matrícula"

O texto fala em "algarismos com pontuação de centena em diante" sem definir o formato (`12.345`?) nem se basta tolerar pontuação na digitação — o que o código já faz ao filtrar não-dígitos. Hoje o número é exibido sem pontuação.

### #PEND-15 · Decisão: Pergunta 1 × checkbox "procurador" — qual controla?

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-06

A Pergunta 1 (Representante/Proprietário) e o checkbox "Pedido apresentado por procurador(a)" são independentes: dá para responder "Proprietário" e marcar procurador, ou o contrário. Definir se a Pergunta 1 deve controlar os campos de representação e procuração. **Bloqueia** #PEND-16.
**Resolução:** decidido no documento de correções de 2026-09-16 (Nova Requisição §2): ao marcar "Representante", abre-se, dentro da Pergunta 1, a caixa para informar o CPF **ou CNPJ** de quem está sendo representado — a mesma caixa que hoje fica no bloco "Imóvel e documentos". Provisório, "até a API com SIGEF estar funcionando".

### #PEND-16 · Amarrar o fluxo do procurador à Pergunta 1

**Responsável:** frontend · **Tipo:** bugfix · **Registrada em:** 2026-10-06
**Onde:** `src/components/requisicao-form.tsx` (estado `procurador`; checkbox e caixa de representação no bloco "Imóvel e documentos")
**Regra decidida (#PEND-15):** a Pergunta 1 "Representante" abre a caixa (CPF ou CNPJ + nome + procuração) e o checkbox independente deixa de existir. Hoje o campo aceita só CPF.

Aplicar a regra. A API também deveria validar a coerência entre `cjtQualidade` e os dados de representação — abrir pendência de backend se o cliente confirmar. A consulta ao SIGEF pelo CPF/CNPJ do representado depende de #PEND-33.
**Resolução:** Fase 4 da branch `feat/portal-correcoes-cjt` (2026-10-06). "Representante" abre a caixa com CPF ou CNPJ (com máscara, só números) e nome; o checkbox foi removido; a procuração segue no bloco de documentos. A validação no servidor ficou na #PEND-44.

### #PEND-17 · Acessibilidade do formulário CJT (`aria-*`, rótulo órfão)

**Responsável:** frontend · **Tipo:** bugfix · **Registrada em:** 2026-10-06
**Onde:** `src/components/requisicao-form.tsx` (componente `Campo`; bloco `nomesPoligonos`)

Critério de aceite 18 da spec. Já atendido: navegação por teclado, `fieldset`/`legend` nas perguntas, erros em texto com `role="alert"`. Falta: `aria-describedby` ligando dica e erro ao campo, `aria-invalid` nos campos recusados, e o `<label htmlFor="cjt-nomes">` aponta para um `id` que não existe (os inputs de polígono só têm `aria-label`) — agrupar com `fieldset`/`legend` ou usar `aria-labelledby`.
**Resolução:** Fase 5 da branch `feat/portal-correcoes-cjt` (2026-10-06). `Campo` liga dica e erro por `aria-describedby`, os campos recusados levam `aria-invalid`, e os nomes dos polígonos viraram `fieldset`/`legend` com um rótulo por campo (`NomesPoligonos`).

### #PEND-18 · Migrations SQLite não reconstroem o banco do zero

**Responsável:** backend · **Tipo:** bugfix · **Registrada em:** 2026-10-06
**Onde:** `prisma/migrations/`

`npx prisma migrate deploy` num banco novo falha em `20260828183000_dtupadosei` (`duplicate column name: dtUpadoSei`, já criada no `init`). A migration seguinte, `20260828190000_campos_legados`, também duplica 6 das 8 colunas que adiciona. Além disso, colunas do `schema.prisma` (`dtVisita2`, `dtSaida`, `formaSaida`, `diasTotais`, `WorkflowAction.deEtapa`/`paraEtapa`) não aparecem em nenhuma migration SQLite — só na versão Postgres (`20260830150000_sync_schema`; as migrations Postgres foram tornadas idempotentes com `IF NOT EXISTS`, o que o SQLite não suporta em `ADD COLUMN`).
**Contorno local:** `npx prisma db push` (monta o banco direto do `schema.prisma`).

### #PEND-19 · Colunas legadas sem uso em `Process` (`processes`, `users`)

**Responsável:** backend · **Tipo:** refatoração · **Registrada em:** 2026-10-06
**Onde:** `prisma/schema.prisma`; migration `20260828190000_campos_legados` ("detectados automaticamente")

Colunas de texto com nomes de tabela, sem nenhum uso no código. Remover ou documentar a origem.

### #PEND-20 · `.env.example` desatualizado (caminho do banco, variáveis ausentes)

**Responsável:** infra · **Tipo:** documentação · **Registrada em:** 2026-10-06
**Onde:** `.env.example`

`DATABASE_URL="file:./dev.db"` cria o banco na raiz do projeto (o Prisma 7 resolve relativo ao `prisma.config.ts`), mas o app lê `prisma/dev.db` (`src/lib/prisma.ts`) — o valor correto em dev é `file:./prisma/dev.db`. Faltam variáveis que o código usa: `STAFF_SESSION_SECRET` (obrigatória em produção), `SEED_STAFF_PASSWORD`, `SIGEF_CAR` e, opcionais, `NEXT_PUBLIC_FASTERFIXES_PROJECT_ID`/`NEXT_PUBLIC_FASTERFIXES_API_ORIGIN`.

### #PEND-21 · Sem CI de qualidade (tsc, eslint, build)

**Responsável:** infra · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `.github/workflows/` (só existe `fasterfixes-jira-triage.yml`)

Nada roda `tsc --noEmit`, `eslint` e `next build` nos PRs. Depende de #PEND-22 para o lint passar.

### #PEND-22 · `eslint` falha em `docker-entrypoint.js`

**Responsável:** infra · **Tipo:** bugfix · **Registrada em:** 2026-10-06
**Onde:** `docker-entrypoint.js` (linha 3)

`@typescript-eslint/no-require-imports` no `require` de `node:child_process`. `npm run lint` termina com erro, o que quebraria um CI (#PEND-21). Ignorar o arquivo na configuração do ESLint ou convertê-lo.

### #PEND-23 · Restos do Litestream no `package.json`

**Responsável:** infra · **Tipo:** refatoração · **Registrada em:** 2026-10-06
**Onde:** `package.json` (dependência `@flydotio/litestream` e `"dockerfile": { "litestream": true }`)

O Dockerfile e o `fly.toml` já não usam Litestream (ver `docs/MIGRACAO-POSTGIS.md`); a dependência e a flag ficaram.

### #PEND-24 · Sem testes automatizados nas bibliotecas de regra

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/lib/cjt-formulario.ts`, `src/lib/workflow.ts`, `src/lib/geometria.ts`

Nenhum framework de teste instalado e nenhum script `test`. São bibliotecas puras, sem I/O — as 12 combinações da matriz do CJT viram 12 casos de teste quase por transcrição. É o que permite corrigir #PEND-9 e #PEND-36 sem regressão.
**Andamento (2026-10-07):** Vitest instalado (`npm test`, `vitest.config.ts`, testes ao lado do código em `src/**/*.test.ts`). Cobertos até agora (189 testes): `protocolo.ts`, `solicitacao-estados.ts`, `cjt-formulario.ts` (matriz, usucapião, nomenclatura, limite de polígonos, representação), `cpf.ts`, `chat-tipos.ts`, `solicitacao-rascunho.ts`, `poligonos-parcelas.ts`, `duplicidade.ts`, `agendador.ts`, arquivamento, grupos de situação, `complexidade.ts` e `acompanhamentoRequisicao`. Faltam `workflow.ts` e `geometria.ts` (corte e classificação) e os testes de rota (hoje exercitadas à mão e por script); a pendência segue aberta.

### #PEND-25 · Chat da solicitação (não existe modelo, rota nem tela)

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `prisma/schema.prisma` (nenhum modelo de mensagem); nenhuma rota em `src/app/api/**`

O documento de correções de 2026-09-16 diz que "todas as comunicações … serão realizadas exclusivamente por este sistema, no chat da solicitação", e o cliente já reclama: "não encontramos o chat". Precisa de mensagens por requisição (autor solicitante/servidor, data, leitura), rotas de listar/enviar com escopo (o solicitante só vê as suas), aviso ao servidor e suporte a mensagem com resposta rápida (Sim/Não), usada por #PEND-30 e #PEND-31.
**Impacto no frontend:** UI do chat no portal (Acompanhar) e no backoffice (`/requisicoes/[id]`). A mensagem de sucesso do envio (doc §6) cita o chat.
**Bloqueia:** #PEND-30, #PEND-31.
**Resolução:** Fase 1 do plano de atendimento CJT, branch `feat/portal-correcoes-cjt` (2026-10-07). Model `MensagemSolicitacao` e marcas de leitura em `Solicitacao` (`chatLidoSolicitanteEm`, `chatLidoAtendimentoEm`) nos dois schemas, mais a migration `20261007120000_chat_solicitacao`. Lib `src/lib/chat.ts` (parte pura em `chat-tipos.ts`), rotas `GET|POST /api/portal/solicitacoes/[id]/mensagens`, `POST …/[mid]/responder` e `GET|POST /api/requisicoes/[id]/mensagens`, componente `src/components/requisicao/chat.tsx` (atualiza a cada 20 s) e selo de mensagens novas nas duas listas. Mensagens de sistema são idempotentes pela `chave` e a resposta a uma pergunta só vale uma vez. Limites: só ADMIN e SDTC (a "DDD") veem o chat no backoffice; sem anexos e sem aviso por e-mail ou SMS (#PEND-37); a leitura é marcada ao abrir a tela ou ao atualizar. A #PEND-30 e a #PEND-31 deixam de estar bloqueadas por esta pendência.

### #PEND-26 · Devolução ao solicitante e bloqueio de edição fora de `DEVOLVIDA`

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/app/api/portal/solicitacoes/[id]/route.ts` (`STATUS_EDITAVEIS = ["DEVOLVIDA"]` desde `5fa78a6`); nenhum código grava `DEVOLVIDA` nem `APROVADA`

O documento pede que o cliente "não possa editar enquanto não tiver sido devolvido" e só edite "após o retorno da DDD". Hoje (a) o `PATCH` aceita `PENDENTE`, ou seja, o cliente edita logo depois de enviar; (b) não existe ação no backoffice para devolver a requisição, então não há como liberar a edição. Precisa tirar `PENDENTE` da lista e criar a ação "devolver" (com motivo registrado no chat, #PEND-25).
**Impacto no frontend:** esconder "Alterar requisição" fora de `DEVOLVIDA` (feito na tela, mas não é segurança); botão "Devolver" no backoffice.
**Andamento (2026-10-07):** (a) feito — o `PATCH` só aceita `DEVOLVIDA`. Falta (b), a ação "devolver" no backoffice.
**Verificado (2026-10-07):** busca em `src/app/api` e `src/lib`: `DEVOLVIDA` só aparece em `STATUS_EDITAVEIS`, no rótulo e no filtro "Devolvidas" (`requisicao-status.ts`); nenhuma rota ou ação grava esse status. **Efeito atual:** como ninguém consegue devolver, o solicitante não consegue mais editar uma requisição enviada (antes editava em `PENDENTE`). A tela já reflete isso (aviso "não pode ser alterada" e botão "Alterar requisição" só em `DEVOLVIDA`), então não há erro visível, mas o fluxo de correção fica parado até a ação "devolver" existir. Bloqueia o item 11 do documento do cliente de ponta a ponta.
**Resolução:** Fase 2 do plano de atendimento CJT, branch `feat/portal-correcoes-cjt` (2026-10-07). Rota `POST /api/requisicoes/[id]/devolver` (ADMIN e SDTC): só devolve requisição pendente, sem processo e sem finalização, com motivo de 10 a 1000 caracteres; a transição é condicional (duas devoluções ao mesmo tempo, só a primeira vale), grava `devolucaoMotivo` e `devolvidaEm` (migration `20261007130000_devolucao_requisicao`, nos dois schemas) e posta o motivo no chat. Requisição devolvida não aceita abertura de processo nem pagamento (409). O reenvio pelo portal volta o status para `PENDENTE` e avisa o atendimento no chat. Telas: `DevolverRequisicao` em `src/components/atendimento-acoes.tsx`, caixa "Devolvida" no atendimento e motivo com botão "Ver conversa" no portal; a lista do atendimento "Aguardando abertura de processo" deixa de mostrar devolvidas. Regras puras em `src/lib/solicitacao-estados.ts` (`podeDevolver`, `validarMotivoDevolucao`).

### #PEND-27 · Modelo de status da requisição para o solicitante (5 gerais + 6 etapas)

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/lib/requisicao-status.ts` (5 status), `Solicitacao.status`, `Process.situacao` (9 etapas)

O documento (Minhas Requisições) define **Status Geral** — não enviadas · em análise · devolvidas · arquivadas · concluídas — e **Status da requisição** — conformidade mínima → Setor de Atendimentos (checagem de documentos, liberação do SEI) → Setor Técnico (triagem, elaboração da divisa, conferência, expedição) → documento em assinatura → aguardando pagamento → liberado para download. O dado atual cobre `PENDENTE/EM_ANALISE/APROVADA/DEVOLVIDA/CONCLUIDA` e as 9 etapas do workflow. Faltam rascunho ("não enviada"), arquivada, as sub-etapas de Atendimento e Técnico e a posição do pagamento (`pagamentoStatus` é solto). Definir o mapeamento com o negócio e expor ao portal.
**Impacto no frontend:** o stepper e os filtros só chegam ao grau de detalhe que o dado permitir; hoje dá para derivar o grau grosso.
**Bloqueia:** #PEND-29, #PEND-42.
**Resolução:** Fase 9 do plano de atendimento CJT, branch `feat/portal-correcoes-cjt` (2026-10-07). O acompanhamento do portal passou a mostrar as subetapas: Setor de Atendimentos ("Checagem de documentos", pela nova ação "Documentos conferidos" do Atendimento, `Solicitacao.docsConferidosEm`, e "Liberação do número SEI", quando `Process.expediente` é preenchido) e Setor Técnico ("Triagem", "Elaboração da divisa", "Conferência da divisa" e "Expedição", esta a assinatura do técnico). Antes do processo a etapa "Conformidade mínima" explica a espera conforme a situação da requisição (devolvida, congelada, aguardando resposta, em análise de duplicidade etc.). Regra pura em `acompanhamentoRequisicao` (`src/lib/requisicao-status.ts`, testada), rota `POST /api/requisicoes/[id]/documentos-conferidos` (ADMIN e SDTC, uma vez, avisa no chat). Hipótese: o "Documento em expedição – CJT" do documento corresponde à assinatura do técnico; ver #PEND-55. As colunas de pagamento e as pendências #PEND-29 e #PEND-42 já foram atendidas nas fases anteriores.
### #PEND-28 · Download da certidão emitida pelo solicitante

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/app/processos/[id]/certidao/page.tsx` (só servidor logado; renderiza HTML para imprimir)

O último status do documento é "Liberado para download". Não há geração de PDF nem rota para o solicitante. Precisa de rota autenticada pelo portal que entregue a certidão só após assinatura do diretor e pagamento — e a regra de liberação.
**Impacto no frontend:** botão em Acompanhar.

### #PEND-29 · Pedido de arquivamento pelo solicitante (regra de custo/tempo)

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06

Documento (Acompanhar): botão para solicitar arquivamento. Se a DDD ainda não iniciou a análise (exemplo do cliente: até 2 horas do envio) o solicitante encerra sem custo; se já houve análise (a de duplicidade, feita por trigger) o pedido segue para a DDD, que é a única a encerrar, pois pode haver custo. Não há status `ARQUIVADA`, rota nem registro de "análise iniciada".
**O que o backend precisa entregar para o cartão "Arquivadas" funcionar** (Minhas Requisições, cartão já desenhado e desabilitado "em breve"):
1. Novo valor `ARQUIVADA` em `Solicitacao.status` (campo `String`; atualizar o comentário do schema e as listas de validação).
2. `POST /api/portal/solicitacoes/[id]/arquivar`: autenticada pelo portal, só do dono; arquivamento direto se a análise ainda não começou, senão registra o pedido para a DDD (precisa de um campo "análise iniciada em" ou equivalente).
3. Ação do backoffice (ex.: `POST /api/solicitacoes/[id]/arquivar`, papel de atendimento/DDD) que conclui o arquivamento quando houver custo.
**Impacto no frontend:** ao existir o status, basta incluir `"ARQUIVADA"` em `GRUPOS_STATUS_GERAL` (`src/lib/requisicao-status.ts`, marcado com `// PEND-29`) e o cartão passa a contar e a filtrar; o botão "Solicitar arquivamento" vai em Acompanhar.
**Depende de:** #PEND-27.

**Resolução:** Fase 8 do plano de atendimento CJT, branch `feat/portal-correcoes-cjt` (2026-10-07). O solicitante pede o arquivamento em `POST /api/portal/solicitacoes/[id]/arquivar`: se a requisição ainda não foi analisada pela duplicidade e não tem processo, arquiva na hora e sem custo (motivo opcional); se já foi analisada, está devolvida ou tem processo aberto, vira `ARQUIVAMENTO_SOLICITADO` (motivo de 10 a 500 caracteres) e a DDD decide em `POST /api/requisicoes/[id]/arquivamento` (aceitar arquiva; recusar exige justificativa, vai ao chat e devolve a requisição ao status de antes). Colunas `arquivadaEm`, `arquivamentoMotivo`, `arquivamentoSolicitadoEm` e `arquivamentoStatusAnterior` (migrations `20261007170000` e `20261007180000`). Lógica em `src/lib/arquivamento-servidor.ts`, regras puras em `solicitacao-estados.ts` (`opcaoDeArquivamento`), componentes `solicitar-arquivamento.tsx` e `DecidirArquivamento`. O cartão "Arquivadas" do portal passou a funcionar e o acompanhamento ganhou o ramo "Arquivada". Todo efeito é condicional e feito na mesma transação das mensagens do chat. A DDD (ADMIN e SDTC) também pode desarquivar (`POST /api/requisicoes/[id]/desarquivar`), com justificativa: a requisição volta ao status de antes do arquivamento. Aceitar não cancela o processo aberto: ver #PEND-54. Detalhes em [`docs/atendimento-cjt-pedidos-restantes.md`](docs/atendimento-cjt-pedidos-restantes.md).

### #PEND-30 · Análise agendada de duplicidade e sobreposição (4 situações)

**Responsável:** backend (agendador: infra) · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** não existe (nenhum job agendado; `src/lib/geometria.ts` só corta polígono)

Documento (Nova Requisição §7): antes de a requisição subir para a DDD, rodar 2–3 vezes ao dia (sugestão 12:00 e 00:00) uma checagem de geometria **e** de dados cadastrais. Situação 1: mesma área e cadastro, já finalizada, mesmo solicitante → mensagem no chat perguntando se quer a nova (não → encerra). Situação 2: mesma geometria, cadastro alterado, finalizada, mesmo solicitante → idem. Situação 3: em andamento, mesmo solicitante → perguntar qual manter e encerrar o outro. Situação 4: sobreposição geométrica, mesmo ou outro solicitante, em andamento ou finalizado → sinalizar internamente à DDD e aos técnicos (possível litígio ou fraude).
**Depende de:** #PEND-25 (chat com resposta rápida).
**Resolução:** Fase 7 do plano de atendimento CJT, branch `feat/portal-correcoes-cjt` (2026-10-07). Campos `analiseDuplicidadeEm`, `sobreposicao`, `sobreposicaoCom`, `arquivadaEm`, `arquivamentoMotivo` em `Solicitacao` e tabela `ExecucaoAgendada` nos dois schemas (migration `20261007170000_analise_duplicidade`). Comparação pura em `src/lib/duplicidade.ts` (testada); análise, respostas e agendador em `duplicidade-servidor.ts`, `duplicidade-respostas.ts`, `agendador.ts` e `src/instrumentation.ts` (12:00 e 00:00 de Brasília, dentro do app). Idempotência: horário único em `ExecucaoAgendada`, reserva condicional por requisição na mesma transação das mensagens, chave fixa por pergunta e decisão atômica em S3. Só entra na fila de abertura de processo depois de analisada (a abertura confere de novo na transação). Rotas `POST /api/admin/duplicidade/executar` (ADMIN) e `POST /api/cron/duplicidade` (token `CRON_TOKEN`). Regras que o documento não detalha estão em [`docs/atendimento-cjt-pedidos-restantes.md`](docs/atendimento-cjt-pedidos-restantes.md) e na #PEND-53. Em produção, ver #PEND-52.

### #PEND-31 · Solicitação com 13+ polígonos: congelar e liberar pela DDD

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `POST /api/portal/solicitacoes` (só cria a requisição completa; não há rascunho)

Documento (Nova Requisição §4): o máximo visto foi 12 polígonos. Com 13 ou mais, o preenchimento para na Pergunta 4 e remete à DDD; a solicitação fica "congelada pela metade" até a equipe técnica liberar, com o chat aberto para pedir comprovações; após o OK o solicitante continua preenchendo. Falta o rascunho/solicitação parcial e a ação de liberar.
**Impacto no frontend:** bloqueio com aviso na Pergunta 4 e retomada do preenchimento.
**Depende de:** #PEND-25, #PEND-27 (rascunho).
**Resolução:** Fase 5 do plano de atendimento CJT, branch `feat/portal-correcoes-cjt` (2026-10-07). Colunas `Solicitacao.congeladaEm` e `liberadaEm` nos dois schemas (migration `20261007150000_congelamento_poligonos`). `POST /api/portal/solicitacoes/[id]/congelar`: o dono encaminha à DDD um rascunho com 13 ou mais polígonos (a quantidade vem do rascunho guardado) e o status vira `AGUARDANDO_LIBERACAO`, com o chat aberto e mensagem de sistema idempotente. `POST /api/requisicoes/[id]/liberar` (ADMIN e SDTC): volta a `RASCUNHO` com `liberadaEm`, mensagem opcional no chat; ambas as transições são condicionais. Liberado, o pedido passa de 12 até 100 polígonos (`validarFormulario(form, { liberado })`); o atendimento presencial, que já é a DDD, não tem o limite de 12. O rascunho congelado fica visível ao atendimento (`visivelAoAtendimento`, `chatVisivel` ganharam o parâmetro `congeladaEm`), sai da fila de abertura de processo (`STATUS_FORA_DA_FILA`) e conta em "Em análise" para o solicitante. Telas: quadro de encaminhamento no formulário, avisos laranja e verde no acompanhamento, cartão `LiberarRequisicao` no atendimento. Limite: a DDD não recebe notificação própria do pedido congelado (a notificação só liga a processos); ela o encontra na lista de Requisições pelo status "Aguardando liberação".

### #PEND-32 · Nível de complexidade 1–9 (hoje são 4 classes)

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/lib/geometria.ts` (`classificarCaso`: FACIL/MEDIO/DIFICIL/PIOR_CASO); `CorteDivisa.classificacao`

Documento (Minhas Requisições, triagem): Nível 1–2 longe da divisa; 3–4 na divisa com divisa finalizada; 5–6 divisa simples não finalizada; 7–8 tríplice não finalizada; 9 reta, foz, quádrupla, quíntupla ou zona de conflito (ímpar = um polígono, par = vários). O código tem 4 classes e não considera o número de polígonos nem se a divisa está "finalizada" (`LinhaDivisa` não tem esse campo). Precisa do novo critério, de um campo no processo e da exposição ao portal ("caixa com apenas o nível").
**Impacto no frontend:** caixa do nível em Acompanhar.
**Resolução:** Fase 9 do plano de atendimento CJT, branch `feat/portal-correcoes-cjt` (2026-10-07). `src/lib/complexidade.ts` (`sugerirNivel`, testada) calcula o nível 1 a 9 a partir das linhas de divisa que o corte cruza e do número de polígonos (longe 1 e 2; divisa finalizada 3 e 4; simples não finalizada 5 e 6; tríplice não finalizada 7 e 8; reta, foz, quádrupla, quíntupla, conflito e rio 9). O corte devolve e grava `CorteDivisa.nivelSugerido`; o técnico responsável (ou ADMIN) confirma ou muda em `/processos/[id]` por `PUT /api/processes/[id]/complexidade` (`Process.nivelComplexidade`); o solicitante vê só o número (caixa ao lado do "Número SEI") depois da confirmação. Colunas novas: `LinhaDivisa.finalizada` (padrão não finalizada; `PATCH /api/geometria/linhas/[id]`, ADMIN) e tipos novos de linha (QUINTUPLA, RETA, FOZ, CONFLITO). `Process.divisaDificuldade` (texto livre, ninguém grava) fica obsoleto. Quem preenche `finalizada` por linha e as hipóteses do cálculo: #PEND-55.
### #PEND-33 · SIGEF no portal: CPF/CNPJ do representado, parcelas e geometria

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/app/api/sigef/consulta/route.ts` (portal só consulta o próprio CPF; outro → 403); `src/app/api/sigef/parcelas/route.ts` (`exigirUsuarioApi`: só servidor); `src/lib/sigef.ts` (`mapearParcela`, caminho `SIGEF_REAL`, não devolve geometria)

Documento (§2 e §5): o representante informa o CPF ou CNPJ de quem representa (provisório) e o solicitante precisa ver o polígono do imóvel. Hoje a consulta é sempre pelo CPF logado, o portal não consulta outro CPF/CNPJ, não alcança o acervo por mapa/código (rota só de servidor) e, no modo real, a parcela vem sem geometria (só acervo e CAR trazem). Precisa permitir a consulta pelo representado (com a regra de segurança definida), rota de parcelas com escopo de solicitante e geometria em todos os modos. No ambiente local o acervo está vazio (`SigefParcela` = 0): a geometria vem do CAR externo ou não vem.
**Andamento (2026-10-07):** o vínculo de cada polígono a uma parcela (#PEND-34) e o limite do formulário funcionam sobre a consulta simulada (`SIGEF_MOCK`); com a consulta real o servidor passa a conferir contra ela sem mudança de código, mas a parcela vem sem geometria no modo real e o mapa do acompanhamento depende do acervo `SigefParcela` importado.
**Impacto no frontend:** mapa do imóvel e campo CPF/CNPJ do representado. O campo já existe (Fase 4), mas a consulta ao SIGEF do formulário continua pelo CPF logado; ao liberar, passar o documento do representado a `/api/sigef/consulta` em `RequisicaoForm`.

### #PEND-34 · Persistir vínculo polígono nomeado ↔ parcela SIGEF

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `prisma/schema.prisma` (`Solicitacao` guarda uma única parcela, e `cjtNomesPoligonos` só os nomes); `POST/PATCH /api/portal/solicitacoes`

Documento (§5): o cliente "precisa indicar quem é quem", isto é, qual polígono do SIGEF corresponde a cada gleba/polígono nomeado, unificando contagem e nomes com a tela do imóvel. O modelo não relaciona nome e parcela, e a API aceita uma só parcela. Precisa persistir a associação (nome ↔ código da parcela) e aceitar várias parcelas.
**Impacto no frontend:** UI de associação no bloco do imóvel (#PEND-45). A Fase 6 já mostra o mapa do imóvel e, ao lado, a lista dos nomes informados; falta só a associação.
**Resolução:** Fase 6 do plano de atendimento CJT, branch `feat/portal-correcoes-cjt` (2026-10-07). Coluna `Solicitacao.cjtPoligonos` (JSON `[{nome, parcelaCodigo, nomeArea, areaHa}]`) nos dois schemas, migration `20261007160000_cjt_poligonos_parcelas`. Em gleba com 2 ou mais polígonos e imóvel do SIGEF, cada polígono indica uma parcela (`validarFormulario(form, { exigirParcelas })`). O servidor (`src/lib/poligonos-parcelas.ts`, `poligonos-parcelas-servidor.ts`) confere o vínculo contra a consulta ao SIGEF do CPF do solicitante: recusa parcela fora da consulta, repetida, ou imóvel principal diferente da parcela do primeiro polígono, e grava nome e área vindos da consulta. O rascunho guarda o vínculo parcial. Limite: o contorno só aparece quando o acervo local tem a geometria da parcela.

### #PEND-35 · Matrícula "Usucapião" na validação e na persistência

**Responsável:** backend (lib compartilhada) · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/lib/cjt-formulario.ts` (matrícula obrigatória, só algarismos; `normalizarParaPersistencia` aplica `somenteDigitos`); `Solicitacao.cjtMatricula`

Decisão do cliente (#PEND-11): "Quero informar o número da matrícula?" — Não preenche "Usucapião" no campo. Hoje a validação exige algarismos e a normalização descarta letras, então a literal seria recusada ou zerada. Precisa aceitar "Usucapião" quando a resposta for Não (casos 2a/2b com situação 3b/3c) e, de preferência, persistir a resposta em campo próprio.
**Impacto no frontend:** o ramo na tela (pergunta, campo travado) só pode ser integrado depois disto.
**Resolução:** Fase 3 do plano de atendimento CJT, branch `feat/portal-correcoes-cjt` (2026-10-07). Coluna `Solicitacao.cjtInformaMatricula` (SIM | NAO) nos dois schemas, migration `20261007140000_cjt_informa_matricula`. Em `src/lib/cjt-formulario.ts`: pergunta 3.1 "Quero informar o número da matrícula?" nos casos 3b/3c com resultado Matrícula ou Gleba (`perguntaMatriculaAplicavel`); "Não" grava a matrícula como `Usucapião` (`MATRICULA_USUCAPIAO`) e o literal só vale nesse ramo; "Não sei" interrompe; a matrícula passou a recusar letras no servidor em vez de descartá-las. Tela: pergunta 3.1 e campo Matrícula travado (`requisicao-form.tsx`); a edição hidrata a resposta.

### #PEND-36 · Nomenclatura de polígonos e S/M–S/E validadas no servidor

**Responsável:** backend (lib compartilhada) · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `src/lib/cjt-formulario.ts` (bloco `nomesPoligonos`; "Propriedade de")

Documento (§3–4): o nome do polígono segue um padrão fechado — Gleba, Parte ou Parcela (ou só o complemento) mais um complemento de até 3 caracteres entre letras sem "ç", números e "-" — e "Propriedade de" não pode ter "S/M" nem "S/E" ("e sua mulher", "e seu esposo"). O servidor valida só 1–15 caracteres e unicidade. A tela vai impor o padrão, mas a API precisa validar também (um cliente adulterado contorna a tela).
**Estado na tela (Fase 5):** o padrão é imposto em `src/components/requisicao/nomes-poligonos.tsx` (tipo único por pedido, complemento de 1 a 3 caracteres `[A-Za-z0-9-]`, sem repetição). Em "Propriedade de" só há a explicação sobre "S/M" e "S/E"; a recusa por texto ficou de fora de propósito (erra com nomes legítimos) e, se o cliente quiser, deve ser feita no servidor. Substitui #PEND-10 e dispensa #PEND-13.
**Resolução:** Fase 3 do plano de atendimento CJT (2026-10-07). `separarNome`, `erroNomenclatura`, `nomesRepetidos` e `LIMITE_COMPLEMENTO` foram para `src/lib/cjt-formulario.ts` (o componente `nomes-poligonos.tsx` os reexporta) e `validarFormulario` aplica a nomenclatura fechada (tipo único + complemento de até 3 caracteres) no servidor; a tela usa a mesma função. Também: 13 ou mais polígonos são recusados no envio normal (`LIMITE_POLIGONOS_ENVIO = 12`, a fila de liberação é a #PEND-31) e a tela não gera mais de 12 campos de nome.

### #PEND-37 · Decisão: o que é "incluir e-mail para finalizar o cadastro (ou SMS)"

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-06
**Onde:** `src/components/cadastro-contato-form.tsx`; `src/app/api/portal/cadastro/route.ts`

A tela "Finalize seu cadastro", reproduzida no próprio documento, já pede e-mail e telefone — e aceita qualquer valor de formato válido (a captura mostra `123@gmail.com`). Leitura provável: **confirmar** o e-mail (ou o telefone, por SMS) com um código antes de marcar o cadastro como completo. Se for isso, abrir pendências de backend (envio e validação do código) e de infra (provedor de e-mail/SMS).

### #PEND-38 · Decisão: cartela de cores e logos do IGC

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-06
**Onde:** portal inteiro — `emerald-*` do Tailwind em 37 linhas de 15 arquivos, vários compartilhados com o backoffice

O documento pede "mudar todas as cores, seguindo a cartela e padrão do IGC". A cartela não está no repositório. Preciso dos valores (hex) e do padrão (tipografia, logo no cabeçalho, se o selo "gov.br" fica). Há logos antigos no histórico do git (`public/images/logo-igc.jpg` e `logo-gov-sp.png` no commit f4594a8; `logoIGC.png` no 4235d72) — confirmar se ainda valem.
**Bloqueia:** a troca de cores do portal.

### #PEND-39 · Decisão: dúvidas do documento de correções de 2026-09-16

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-06

1. O 1º box "Pergunta 1 – Solicitante" e a pergunta "Quem sou eu?" são o mesmo box (título "Solicitante")?
2. "INCRA *" em negrito: passa a ser obrigatório? A spec v1.0 diz opcional.
3. Nomenclatura: o texto diz "3 tipos", mas lista 4 formas (Gleba, Parte, Parcela e só o complemento, como em "1, 2, 3").
4. Proprietários: o documento sugere "Espólio de xxxx ; Outros"; a spec v1.0 manda "Primeiro nome e outros". Qual vale (#PEND-9)?
5. "DDD" corresponde a qual setor/papel do sistema (hoje: SDTC, GDAT)? "Coordenador" é o GERENTE?
6. A mensagem de envio promete o chat: publicá-la antes de o chat existir (#PEND-25)?
7. Município também sai da lista "Minhas Requisições" (hoje exibe município/UF), ou só do box Imóvel?

### #PEND-40 · Texto auxiliar em `gray-400` abaixo do contraste AA (rodapé do portal)

**Responsável:** frontend · **Tipo:** melhoria · **Registrada em:** 2026-10-06
**Onde:** `src/app/portal/layout.tsx` (rodapé, `text-gray-400`); a classe aparece em outros textos auxiliares

Achado na varredura de contraste da Fase A: o rodapé "Serviço de emissão de certidões…" tem 2,49:1 sobre `gray-50` (mínimo AA: 4,5:1), tanto em modo claro quanto escuro. Só foram varridas algumas páginas; vale uma passada nos demais usos de `text-gray-400`.
**Resolução:** os 9 textos auxiliares em `gray-400` (rodapé e login do portal, dica dos anexos, número/município/coluna vazia do Quadro, data das Notificações, "Pendente" da Certidão, nota da tabela em `/geometria`) passaram para `gray-500` (4,6 a 4,8:1). Ícones e a seta do histórico, decorativos, ficaram como estavam.

### #PEND-41 · Máscaras de entrada nos formulários (telefone, CPF, CNPJ etc.)

**Responsável:** frontend · **Tipo:** adição · **Registrada em:** 2026-10-06

Os campos de telefone, CPF, CNPJ e similares aceitam texto livre, sem máscara de digitação. Aplicar máscara em todo formulário que tiver esses tipos de campo. Pedido do time; não mapeado nem priorizado ainda — o levantamento dos formulários afetados fica para quando a pendência for atacada.
**Já feito:** CPF/CNPJ de quem é representado (Fase 4, `mascaraCpfCnpj` em `src/lib/cjt-formulario.ts`, reaproveitável nos demais campos).
**Resolução:** `src/lib/mascaras.ts` (máscaras de CPF, telefone e exibição) e `src/components/campo-mascarado.tsx` (campo que preserva o cursor). Aplicadas em: login do portal (CPF), cadastro do portal e completar cadastro (telefone), Cadastro de Cliente (CPF, telefone), consulta SIGEF e Novo Processo (telefone, CPF/CNPJ) e Editar Processo (telefone, CPF/CNPJ). Telas de leitura (Processo, Certidão) mostram CPF/CNPJ formatado. O contrato com a API não mudou: CPF/CNPJ vão só com números e o telefone vai formatado. Commit: ver histórico de `feat(ui): máscaras…`.

### #PEND-42 · Rascunho de requisição ("Não enviadas"): status e rotas de salvar/enviar

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-06
**Onde:** `POST /api/portal/solicitacoes` (só cria a requisição completa, validada de uma vez), `Solicitacao.status`

O Status Geral do documento tem "Requisições não enviadas": o solicitante começa o formulário, sai e volta depois. Hoje não existe rascunho: a rota exige o formulário todo e já cria como `PENDENTE`. Para o cartão "Não enviadas" de Minhas Requisições funcionar o backend precisa de:
1. Novo valor `RASCUNHO` em `Solicitacao.status`.
2. Salvar rascunho com validação parcial (campos opcionais): por exemplo `POST /api/portal/solicitacoes` com `rascunho: true` ou `PUT /api/portal/solicitacoes/[id]/rascunho`.
3. `POST /api/portal/solicitacoes/[id]/enviar`: valida o formulário completo e muda `RASCUNHO` → `PENDENTE` (também é onde a análise de duplicidade da #PEND-30 poderia ser disparada).
4. Excluir rascunho (`DELETE`), já que ele não tem protocolo oficial; decidir se rascunho recebe protocolo.
5. Rascunhos não podem aparecer no backoffice (`/requisicoes`, dashboard, contagens): filtrar por status nas consultas de lá.
**Impacto no frontend:** hoje o cartão aparece desabilitado "em breve". Quando existir, incluir `"RASCUNHO"` em `GRUPOS_STATUS_GERAL` (marcado com `// PEND-42`) e fazer #PEND-43.
**Depende de:** #PEND-27 (modelo de status). **Bloqueia:** #PEND-43; relaciona-se com #PEND-31 (requisição congelada com 13+ polígonos).
**Resolução:** Fase 4 do plano de atendimento CJT, branch `feat/portal-correcoes-cjt` (2026-10-07). Status `RASCUNHO` (sem coluna nova): `POST /api/portal/solicitacoes` com `rascunho: true` cria o rascunho sem validar, e `PATCH` com `rascunho: true` o atualiza; `PATCH` sem a marca valida tudo e envia (vira `PENDENTE`). Regras em `src/lib/cjt-formulario.ts` (`normalizarRascunho`) e `src/lib/solicitacao-rascunho.ts`. O protocolo nasce no primeiro salvamento (rascunho abandonado deixa um número sem uso). O atendimento não vê rascunho em lista, tela, filtro nem pelo link direto (`visivelAoAtendimento`), e abrir processo ou pagamento em requisição fora da fila é recusado (`bloqueioAcaoAtendimento`). Limite: anexos não ficam no rascunho; o solicitante anexa de novo ao continuar. Sem ação de apagar rascunho.

### #PEND-43 · Salvar rascunho e continuar requisição no formulário e em Minhas Requisições

**Responsável:** frontend · **Tipo:** adição · **Registrada em:** 2026-10-06

Botão "Salvar rascunho" em `RequisicaoForm` (portal) e, em Minhas Requisições, abrir o rascunho no formulário preenchido ("Continuar") com opção de excluir. O formulário de edição já aceita dados iniciais (`edicao`), o que facilita. Só dá para fazer depois das rotas da #PEND-42.
**Depende de:** #PEND-42.
**Resolução:** Fase 4 do plano de atendimento CJT (2026-10-07). Botão "Salvar rascunho" no `RequisicaoForm` (só portal), cartão "Não enviadas" ativo em Minhas Requisições (`GRUPOS_STATUS_GERAL`), linha com selo "Não enviada" e botão "Continuar" que abre `/portal/requisicoes/{id}/editar` com o formulário preenchido ate onde o solicitante parou; o detalhe de um rascunho redireciona para essa tela.

### #PEND-44 · Validar no servidor o CPF/CNPJ do representado e a coerência com a Pergunta 1

**Responsável:** backend · **Tipo:** segurança · **Registrada em:** 2026-10-06
**Onde:** `POST /api/portal/solicitacoes` e `PATCH /api/portal/solicitacoes/[id]` (campos `emNomeDeCpf`, `emNomeDeNome`); coluna `Solicitacao.emNomeDeCpf`

Hoje a rota só tira os não-dígitos de `emNomeDeCpf` e exige o nome quando há documento. Não confere o tamanho (11 ou 14 algarismos) nem o dígito verificador, aceita CNPJ numa coluna chamada "Cpf", e não cruza com a Pergunta 1: dá para enviar `qualidade` "Proprietário" com representado, ou "Representante" sem nenhum. O portal passou a exigir CPF/CNPJ completo e nome quando a resposta é "Representante" (Fase 4), mas isso é só usabilidade.
Precisa: validar CPF (checksum) ou CNPJ (checksum); exigir os dados de representação e a procuração quando `qualidade` for "1a" e descartá-los nas demais; avaliar renomear a coluna (ex.: `representadoDocumento`).
**Impacto no frontend:** a exibição já formata CPF ou CNPJ conforme o tamanho (`mascaraCpfCnpj`); nada a mudar quando o servidor passar a validar além de mostrar o erro devolvido.
**Resolução:** Fase 3 do plano de atendimento CJT (2026-10-07). `validarRepresentacao` em `src/lib/cjt-formulario.ts` (com `validarCNPJ` e `validarCpfOuCnpj` em `src/lib/cpf.ts`) é usada pelas três rotas de criação e edição: "Representante" exige CPF ou CNPJ com dígitos verificadores válidos e nome; "Proprietário" descarta os dados de representação.

### #PEND-45 · Associar cada polígono nomeado ao polígono do mapa (UI)

**Responsável:** frontend · **Tipo:** adição · **Registrada em:** 2026-10-06

Item 16 do documento: "mostrar de alguma maneira um indicativo de quem é cada Gleba… o cliente precisa indicar quem é quem". A Fase 6 mostra o contorno do imóvel (`MapaImovel`) e a lista de nomes (Pergunta 4), com o aviso de que a equipe do IGC relaciona nome e polígono. Falta a interface em que o solicitante marca no mapa qual polígono é cada nome (numerar as partes do contorno e escolher o nome de cada uma). Só vale fazer depois que o backend gravar o vínculo.
**Depende de:** #PEND-34 (persistência do vínculo e de várias parcelas); #PEND-33 (geometria por parcela em todos os modos).
**Resolução:** Fase 6 do plano de atendimento CJT (2026-10-07). Formulário: seletor de parcela por polígono (`poligonos-parcelas.tsx`), parcela já usada desabilitada, mapa com cor e nome de cada polígono (`mapa-poligonos.tsx`, cores em `src/lib/cores-poligonos.ts`). Detalhe da requisição (portal e atendimento): tabela polígono → parcela → área e mapa com todos os contornos (`carregarPoligonosDetalhe`).

### #PEND-46 · Consulta SIGEF simulada com CAR devolve parcelas com área 0 e município vazio

**Responsável:** backend · **Tipo:** bugfix · **Registrada em:** 2026-10-06
**Onde:** `src/lib/sigef.ts` (`gerarParcelasMockComCar`, só com `SIGEF_MOCK`/sem credenciais)

Em desenvolvimento a mesma consulta devolve ora parcelas com dados completos (11,72 ha, Ribeirão Branco/SP), ora parcelas enriquecidas com o CAR em que `areaHectares` é 0 e `municipio` é vazio (lista mostra "0 ha · /SP"). A resposta varia entre chamadas. Afeta só o ambiente simulado, mas atrapalha testes e demonstrações.
**Impacto no frontend:** nenhum; o texto do mapa para leitores de tela ignora área e município ausentes.
**Descarte (2026-10-07):** o enriquecimento com o CAR era a causa da variação. A função `gerarParcelasMockComCar` e `src/lib/car.ts` saíram no commit `f34b945` ("remover CAR/SICAR e manter apenas as parcelas do SIGEF"), e a consulta simulada voltou a usar só `gerarParcelasMock`, que é determinística (conferido em `src/lib/sigef.ts`). Os registros de teste locais com "(CAR SP-…)" no nome da área são só dados antigos do banco.

### #PEND-47 · Layout raiz: `main` sem `min-w-0` deixa conteúdo largo esticar a página no celular

**Responsável:** frontend · **Tipo:** melhoria · **Registrada em:** 2026-10-07
**Onde:** `src/app/layout.tsx` (`<main className="flex-1 bg-gray-50 min-h-screen …">` dentro de `body` com `flex`)

O `main` é item de um contêiner flex e tem `min-width: auto`: qualquer descendente com largura mínima maior que a tela (texto sem espaço, `input` com largura intrínseca) alarga o `main` e a página ganha rolagem horizontal. Apareceu em 375 px na lista de Minhas Requisições (nome de área com código do CAR sem espaços) e no campo "Propriedade de" ao lado do rótulo "Espólio de". Foi corrigido caso a caso (`min-w-0` e `[overflow-wrap:anywhere]` nos itens da lista e nos botões de imóvel; `w-full min-w-0` no campo). A correção na raiz (`min-w-0` no `main`) não foi aplicada porque muda o comportamento de todo o backoffice (tabelas largas passariam a vazar do `main` em vez de esticá-lo); precisa de uma passada nas telas do backoffice antes.

### #PEND-48 · `PATCH /api/processes/[id]` não valida tipos nem data vazia (devolve 500)

**Responsável:** backend · **Tipo:** bugfix · **Registrada em:** 2026-10-07
**Onde:** `src/app/api/processes/[id]/route.ts` (laço que monta `data`: só converte data preenchida e repassa o resto ao Prisma)

Testado na rota local: `{"dtVisita2":""}`, `{"taxaVistoria":"abc"}` e `{"anoEntrada":"x"}` devolvem **500** sem mensagem (erro do Prisma), em vez de 400 com o campo. Data vazia deveria virar `null`; número e ano precisam ser validados. A tela de edição (Fase 3) converte tudo antes de enviar (`null` para vazio, números e datas válidos), então não depende disto, mas outro cliente da API ou um formulário futuro depende.
**Impacto no frontend:** nenhum hoje; ao corrigir, a tela pode mostrar o erro por campo devolvido pela API.
**Resolução:** a rota normaliza cada campo pelo tipo da coluna antes do Prisma (`normalizarCampo` em `src/app/api/processes/[id]/route.ts`): `""`/`null` limpam o campo (exceto `anoEntrada` e `interessado`, obrigatórios), datas aceitam ISO/`YYYY-MM-DD`, valores em R$ aceitam número ou `"1.350,50"`, ano inteiro entre 1900 e 2100, demais campos só texto. Erro devolve **400** `{ error: "campo: motivo", campo }`; a tela de edição destaca o campo apontado. `servicoTecGabinete` e `servicoTecCampo` passaram a ser editáveis (API e tela).

### #PEND-49 · `Process.total` nunca é calculado (a tela mostra R$ 0,00 mesmo com taxas)

**Responsável:** backend · **Tipo:** bugfix · **Registrada em:** 2026-10-07
**Onde:** `prisma/schema.prisma` (`Process.total`), `src/app/processos/[id]/page.tsx` (cartão "Financeiro" só lê o campo), `src/app/api/processes/**`

Nenhuma rota grava `total`: ao salvar `taxaAbertura` de R$ 1.350,50 pela nova edição, "Taxa Abertura" mostra 1350.50 e "Total" continua R$ 0.00. Precisa definir a regra (soma de taxa de abertura, serviço de gabinete, taxa de vistoria e serviço de campo, como sugere o cartão) e calculá-la ao salvar, ou derivar na leitura. A tela de edição não expõe o campo "Total".
**Impacto no frontend:** nenhum além de mostrar o valor correto quando existir; se a regra for derivada na leitura, o cartão "Financeiro" pode calculá-la.
**Resolução:** regra = taxa de abertura + serviço de gabinete + taxa de vistoria + serviço de campo (campos vazios contam zero). `PATCH /api/processes/[id]` recalcula e grava `Process.total` sempre que um desses quatro campos é alterado; o cartão "Financeiro" usa `total` gravado ou, para processos antigos ainda sem ele, a mesma soma (`totalFinanceiro` em `src/app/processos/[id]/page.tsx`).

### #PEND-50 · Decisão: acesso à API b-Cadastro (Portal Integrador): processo SEI de acordo bilateral e credencial

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-07
**Onde:** nenhum arquivo; procedimento administrativo descrito no e-mail do Suporte Integrador de 10/08/2026 (assunto "Informações adicionais e api B-cadastro", destinatário do órgão: Thiago Carmuega Rabacal)

Para usar a API b-Cadastro, o Suporte Integrador exige: (1) credencial igual à da aplicação (`clientid` do IDP, pedido pelo Portal Integrador, se ainda não houver); (2) abertura de processo SEI-SP de acordo bilateral, com as informações do projeto e o documento "Solicitação de acesso à API – Governança de Dados_01_2025"; (3) assinatura do órgão Cedente, aviso ao Suporte e encaminhamento à Unidade Integrador, que só então libera o acesso. Nada disso é código: quem abre o processo e obtém a credencial é o IGC/CJT. Não sabemos, pelo e-mail, quais dados a API devolve nem em que tela do sistema entrariam.
**Depende de:** definir qual necessidade do sistema a b-Cadastro atende (possível ligação com #PEND-1, login real do portal, ainda não confirmada) e quem responde pelo processo SEI.
**Bloqueia:** qualquer integração com a b-Cadastro (backend); sem contrato da API e sem credencial não há o que implementar no frontend.
**Andamento (2026-10-07):** adiada por decisão do time; perguntas enviadas ao Sandro (para que serve a b-Cadastro, `clientid` do IDP, situação do processo SEI, documentação da API).

### #PEND-51 · Integração com o SEI como última etapa do fluxo da certidão

**Responsável:** backend · **Tipo:** adição · **Registrada em:** 2026-10-07
**Onde:** hoje o expediente SEI é digitado à mão em `/processos/{id}/editar` (campo `Process.expediente`, rota `PATCH /api/processes/[id]`); não há rota nem biblioteca que fale com o SEI

Pedido do Sandro (07/10/2026), junto com o e-mail da #PEND-50: no fluxo do sistema de certidões a integração com o SEI é a última coisa a fazer. O e-mail em si não trata de API do SEI (o SEI ali é só onde se abre o processo de acesso à b-Cadastro). Falta definir o que a integração faz (criar o processo e devolver o número, anexar a minuta, coletar assinatura, consultar andamento), por qual API (catálogo do Portal Integrador, que passa pela #PEND-50, ou outra) e com que credencial. Sem o contrato, o frontend não tem o que implementar.
**Impacto no frontend:** quando existir, o campo "Expediente (SEI)" da edição do processo e o box "Número SEI" do portal (item 12 do documento do cliente) deixam de ser preenchimento manual e passam a refletir o que a integração gravar; a tela de edição pode mostrá-lo somente leitura.
**Depende de:** contrato da API do SEI e credencial (possivelmente #PEND-50).
**Andamento (2026-10-07):** adiada por decisão do time; retomar quando o Sandro responder o que a integração deve fazer, por qual interface e quando dispara.

### #PEND-52 · Agendador da duplicidade em produção: `CRON_TOKEN`, `AGENDADOR_DUPLICIDADE` e instância sempre ligada

**Responsável:** infra · **Tipo:** documentação · **Registrada em:** 2026-10-07
**Onde:** `.env.example`, `fly*.toml`, secrets do Fly; código em `src/instrumentation.ts`, `src/lib/agendador-processo.ts`, `src/app/api/cron/duplicidade/route.ts`

A análise de duplicidade (#PEND-30) roda dentro do app, às 12:00 e 00:00 de Brasília, e também ao subir se o horário atual ainda não rodou. Para funcionar em produção a infra precisa: (1) manter ao menos uma máquina ligada nesses horários (se o Fly desligar por ociosidade, o horário é recuperado quando a máquina voltar, em até 5 minutos); (2) documentar no `.env.example` as variáveis opcionais `CRON_TOKEN` (habilita `POST /api/cron/duplicidade` com `Authorization: Bearer <token>`, para um agendador externo; sem ela a rota responde 404) e `AGENDADOR_DUPLICIDADE=off` (desliga o agendador do app, para quando só o externo deve rodar); (3) no primeiro deploy, saber que as requisições pendentes já existentes são analisadas na subida, o que pode gerar perguntas no chat de vários solicitantes de uma vez; (4) aplicar a migration `20261007170000_analise_duplicidade` e conferir sua ordem com a `9999_postgis_geometry`. O agendador não foi exercitado contra o Postgres do Fly, só contra o SQLite de desenvolvimento.
**Depende de:** #PEND-30.

### #PEND-53 · Decisão: confirmar com o cliente as regras de duplicidade que o documento não detalha

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-07
**Onde:** `src/lib/duplicidade.ts`

O documento descreve quatro situações; o time completou o resto com hipóteses, aprovadas internamente em 2026-10-07 e pendentes de confirmação do cliente: (a) mesma geometria com solicitantes diferentes é sobreposição (S4), sem mensagem ao cliente; (b) S3 (duas em andamento) só vale quando a outra ainda não tem processo e não foi devolvida; com processo aberto ou devolvida vira S4, porque arquivar uma requisição já em análise é decisão da DDD; (c) com mais de uma repetição o solicitante recebe uma só pergunta (prioridade S3, S1, S2) e as demais entram na lista de sobreposição; (d) "mesma geometria" é o mesmo código de parcela ou 98% de sobreposição mútua, e sobreposição (S4) começa em 1% da menor parcela e 100 m²; (e) "mesmo cadastro" compara qualidade, resultado, situação, propriedade de, matrícula, código INCRA e representado; (f) "finalizada" é a requisição com finalização registrada pelo Atendimento; (g) requisição sem registro no INCRA não tem geometria e segue para a fila sem comparação; (h) requisição aberta pelo balcão é analisada na hora, a do portal espera o horário. Os limiares são constantes em `src/lib/duplicidade.ts`.
**Depende de:** resposta do cliente.

### #PEND-54 · Decisão: aceitar o arquivamento não cancela o processo aberto

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-07
**Onde:** `src/lib/arquivamento-servidor.ts` (`decidirArquivamento`)

Quando a DDD aceita o pedido de arquivamento de uma requisição que já tem processo (`EM_ANALISE`), a requisição vira `ARQUIVADA` mas o processo continua na etapa em que estava; o painel avisa o número do processo e o cancelamento segue sendo feito em Processos, pela etapa "Cancelado" (SDTC, Gerente ou Administrador). O time escolheu esse caminho por prudência (cancelar mexe no fluxo e pode ter custo). Falta decidir se o arquivamento deve cancelar o processo sozinho, em que etapas isso é permitido e se a cobrança já feita muda algo. Se for decidido, a mudança é do backend: mover o processo para `cancelado` (com `dtCancelado` e o registro em `WorkflowAction`) na mesma transação do aceite.
**Impacto no frontend:** o aviso do painel "Decidir arquivamento" deixaria de existir.
**Depende de:** resposta do cliente.

### #PEND-55 · Decisão: quem marca a divisa como finalizada e confirmar as hipóteses do nível de complexidade

**Responsável:** negócio · **Tipo:** decisão · **Registrada em:** 2026-10-07
**Onde:** `LinhaDivisa.finalizada`, `src/lib/complexidade.ts`, `src/lib/requisicao-status.ts`

O nível de complexidade (#PEND-32) depende de a linha de divisa estar "finalizada", dado que não existia e hoje ninguém preenche: toda linha nasce **não finalizada**, o que dá o nível mais alto (cautela). Só há uma API para o Administrador marcar (`PATCH /api/geometria/linhas/[id]`) e nenhuma tela. Falta decidir quem marca, onde (tela, importação das divisas validadas) e com que critério. Hipóteses do time, aprovadas em 2026-10-07 e pendentes de confirmação do cliente: (a) imóvel no corredor de 1 km sem cortar a divisa conta como "longe" (nível 1 ou 2); (b) rio continua no nível 9, por cautela; (c) tríplice finalizada cai em 3 ou 4 ("na divisa com divisa finalizada"); (d) cortando mais de uma linha vale a mais difícil, e três municípios entre as linhas cortadas valem como tríplice; (e) o número par vale quando o imóvel tem mais de um polígono, e o 9 não tem par; (f) o "Documento em expedição – CJT" do documento corresponde à assinatura do técnico (subetapa "Expedição"), e as assinaturas do gerente e do diretor ficam em "Documento em assinatura".
**Impacto no frontend:** uma tela para marcar a divisa como finalizada, quando houver decisão.
**Depende de:** resposta do cliente.
