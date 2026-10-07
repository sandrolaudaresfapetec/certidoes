# Pedidos do CJT que exigiam backend (front e back)

Status: **em andamento** na branch `feat/portal-correcoes-cjt`. Fases 0 a 5 implementadas e commitadas (`a0fd7ed` a `8790a1b`); fases 6 a 9 planejadas. Nada publicado além do que já foi enviado ao remoto.

Este documento é o terceiro registro da branch. [`correcoes-cjt-portal.md`](correcoes-cjt-portal.md) cobre os 16 itens de frontend do portal e [`melhorias-frontend-backoffice.md`](melhorias-frontend-backoffice.md) cobre as melhorias de backoffice e plataforma. Este cobre os pedidos do documento de correções do cliente (`Correções CJT_2026-09-16.pdf`, 29 pedidos) que precisaram de **backend** ou de backend e frontend juntos. Autorização: o time autorizou editar backend e frontend; infra (Dockerfile, `fly*.toml`, `.github`, `.env.example`) continua fora e vira pendência.

## 1. Decisões do time

- **DDD = papéis ADMIN e SDTC** (`podeAtender` em `src/lib/auth.ts`). Quem devolve, libera pedido congelado, decide arquivamento e vê a fila. Sem papel novo.
- **Agendador da análise de duplicidade dentro do app** (`src/instrumentation.ts`, 12:00 e 00:00 de Brasília), com idempotência por slot (fase 7, ainda não implementada).
- **Nível de complexidade 1 a 9:** sugestão automática pelo corte, o técnico confirma ou muda (fase 9).
- **Chat:** atualização a cada 20 s enquanto a aba está visível, e ao enviar.
- Protocolo gerado na primeira vez que o rascunho é salvo; rascunho abandonado deixa um número sem uso. O sequencial reinicia a cada ano.

## 2. Mapa das entregas

| Fase | Pedido do cliente | Pendência | Atuação | Commit |
| --- | --- | --- | --- | --- |
| 0 | (fundação) estados únicos, protocolo sem corrida, testes | #PEND-24 (parcial) | back | `a0fd7ed` |
| 1 | Chat da solicitação (comunicações "exclusivamente por este sistema") | #PEND-25 | front e back | `f776cfd` |
| 2 | Cliente só edita depois da devolução; ação de devolver | #PEND-26 | front e back | `400e9a2` |
| 3 | Ramificação de Usucapião; nomenclatura dos polígonos e representante no servidor | #PEND-35, #PEND-11, #PEND-36, #PEND-44 | front e back | `588d293` |
| 4 | Requisições não enviadas (rascunho) | #PEND-42, #PEND-43 | front e back | `35847a9` |
| 5 | 13 ou mais polígonos: congelar e liberar pela DDD | #PEND-31 | front e back | `8790a1b` |

Planejadas (ainda não feitas): fase 6 nome ↔ polígono (#PEND-34, #PEND-45), fase 7 análise de duplicidade (#PEND-30), fase 8 arquivamento (#PEND-29), fase 9 status por etapa e complexidade (#PEND-27, #PEND-32).

## 3. O que cada fase entregou

**Fase 0 — Fundação (`a0fd7ed`).** `src/lib/solicitacao-estados.ts` concentra os status da requisição (`RASCUNHO`, `AGUARDANDO_LIBERACAO`, `AGUARDANDO_CLIENTE`, `ARQUIVAMENTO_SOLICITADO`, `ARQUIVADA` entraram junto dos existentes) e `clientePodeEditar`, que substituiu três cópias da regra. `exigirSolicitanteApi()` em `portal-auth.ts` padroniza a autenticação das rotas do portal. `src/lib/protocolo.ts` (`criarComProtocolo`) gera o protocolo pelo maior sequencial do ano mais 1, com nova tentativa se outro pedido ganhar o número (antes era `count()+1`, que repetia número em pedidos simultâneos). Vitest 3 e `npm test`.

**Fase 1 — Chat (`f776cfd`).** Model `MensagemSolicitacao` e marcas de leitura em `Solicitacao`. `src/lib/chat.ts` (parte pura em `chat-tipos.ts`). Rotas de listar e enviar para o portal (só o dono) e para o atendimento (ADMIN e SDTC), e `POST …/[mid]/responder` para perguntas com botões (base da duplicidade). Mensagens de sistema são idempotentes pela `chave`; a resposta a uma pergunta só vale uma vez (gravação condicional). Componente `src/components/requisicao/chat.tsx`, selo "N novas" nas duas listas. O chat não existe em rascunho comum e é só leitura em requisição arquivada.

**Fase 2 — Devolver (`400e9a2`).** `POST /api/requisicoes/[id]/devolver` com motivo de 10 a 1000 caracteres, só para requisição pendente, sem processo e sem finalização. Grava `devolucaoMotivo` e `devolvidaEm`, muda para `DEVOLVIDA` (única situação em que o portal deixa editar), posta o motivo no chat. O reenvio pelo portal volta a `PENDENTE` e avisa o atendimento. Requisição devolvida não aceita abertura de processo nem pagamento.

**Fase 3 — Regras do formulário no servidor (`588d293`).** Coluna `cjtInformaMatricula`. Pergunta 3.1 "Quero informar o número da matrícula?" nos casos de usucapião com resultado Matrícula ou Gleba: Sim segue o fluxo normal, Não grava a matrícula como "Usucapião" (literal só vale nesse ramo), Não sei interrompe. A matrícula passou a recusar letras. A nomenclatura fechada dos polígonos (Gleba, Parte, Parcela mais complemento de até 3 caracteres) passou para `cjt-formulario.ts` e vale também no servidor. `validarRepresentacao` e `validarCNPJ` (`cpf.ts`): "Representante" exige CPF ou CNPJ válido e nome; "Proprietário" descarta dados de representação.

**Fase 4 — Rascunho (`35847a9`).** `POST /api/portal/solicitacoes` com `rascunho: true` guarda o que já foi respondido, sem validar; `PATCH` com `rascunho: true` atualiza; `PATCH` sem a marca valida tudo e envia. O atendimento não vê rascunho em lista, filtro, tela nem pelo link direto (`visivelAoAtendimento`). Cartão "Não enviadas" ativo, botão "Salvar rascunho" e "Continuar". Limite: anexos não ficam no rascunho.

**Fase 5 — 13 ou mais polígonos (`8790a1b`).** `POST /api/portal/solicitacoes/[id]/congelar` (a quantidade vem do rascunho guardado) e `POST /api/requisicoes/[id]/liberar` (ADMIN e SDTC). Colunas `congeladaEm` e `liberadaEm`. Congelado: sem edição, com chat, fora da fila de abertura de processo; liberado: volta a rascunho, passa de 12 até 100 polígonos. O atendimento presencial não tem o limite de 12.

## 4. Banco de dados

Todo model ou coluna entrou nos dois schemas (`prisma/schema.prisma` e `prisma-postgres/schema.prisma`, idênticos exceto o `provider`) e numa migration só do Postgres, idempotente (`IF NOT EXISTS`). A ordem das migrations contra a `9999_postgis_geometry` precisa ser conferida em staging.

| Migration | Conteúdo |
| --- | --- |
| `20261007120000_chat_solicitacao` | Tabela `MensagemSolicitacao`, `chatLidoSolicitanteEm`, `chatLidoAtendimentoEm` |
| `20261007130000_devolucao_requisicao` | `devolucaoMotivo`, `devolvidaEm` |
| `20261007140000_cjt_informa_matricula` | `cjtInformaMatricula` |
| `20261007150000_congelamento_poligonos` | `congeladaEm`, `liberadaEm` |

`scripts/sqlite-to-postgres.ts` recebeu a tabela nova e as colunas de data e booleano que faltavam.

## 5. APIs novas ou alteradas

| Rota | Quem | O que faz |
| --- | --- | --- |
| `GET`/`POST /api/portal/solicitacoes/[id]/mensagens` | solicitante dono | lista e envia mensagem |
| `POST …/mensagens/[mid]/responder` | solicitante dono | responde pergunta do sistema |
| `GET`/`POST /api/requisicoes/[id]/mensagens` | ADMIN, SDTC | chat do atendimento |
| `POST /api/requisicoes/[id]/devolver` | ADMIN, SDTC | devolve com motivo |
| `POST /api/portal/solicitacoes` (`rascunho: true`) | solicitante | cria rascunho |
| `PATCH /api/portal/solicitacoes/[id]` | solicitante dono | salva rascunho, envia ou reenvia |
| `POST /api/portal/solicitacoes/[id]/congelar` | solicitante dono | encaminha 13+ polígonos à DDD |
| `POST /api/requisicoes/[id]/liberar` | ADMIN, SDTC | libera o preenchimento |

Erros seguem o padrão `{ error }`. Toda transição de status é condicional (`updateMany` com o status esperado), então chamadas simultâneas só deixam passar a primeira.

## 6. Testes

89 testes automatizados (Vitest) cobrindo protocolo, estados, chat, formulário CJT (matriz, usucapião, nomenclatura, limite de polígonos, representação), CPF e CNPJ, rascunho. As rotas foram verificadas no navegador (API e tela) a cada fase, com solicitante, ADMIN, GERENTE e outro solicitante.

## 7. Limites conhecidos

- Só ADMIN e SDTC veem o chat no backoffice; sem anexos no chat e sem e-mail ou SMS (#PEND-37).
- Anexos não ficam no rascunho.
- A DDD não recebe notificação própria do pedido congelado: ela o encontra em Requisições pelo status "Aguardando liberação".
- O seletor de situação do atendimento mostra rótulos pensados para o solicitante nos status novos (ex.: "Aguardando sua resposta").
- A matrícula e a nomenclatura mais estritas passam a exigir correção na edição de requisições antigas fora do padrão.

## 8. Como testar

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev          # http://localhost:3000
npm test             # 89 testes
```

- **Portal:** `/portal/login` com um CPF válido e um nome. **Backoffice:** `/login` com `admin@igc.sp.gov.br` / `IGC@certidoes-2026`.
- Chat: abra a mesma requisição no portal e em `/requisicoes/{id}` (duas sessões) e troque mensagens.
- Devolver: em `/requisicoes/{id}` use "Devolver requisição"; no portal corrija e reenvie.
- Rascunho: em `/portal/nova-solicitacao` responda parte e clique "Salvar rascunho"; continue em "Não enviadas".
- 13 polígonos: escolha Gleba, informe 13 e use "Enviar para análise da DDD"; no atendimento use "Liberar preenchimento".
- Usucapião: Pergunta 3 "Usucapião", resultado Matrícula, e responda a 3.1.
