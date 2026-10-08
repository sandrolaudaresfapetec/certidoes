# Pedidos do CJT que exigiam backend (front e back)

Status: **em andamento** na branch `feat/portal-correcoes-cjt`. Fases 0 a 6 implementadas e commitadas (`a0fd7ed` a `d9247af`); fase 7 implementada e aguardando aceite do commit; fases 8 e 9 planejadas.

Este documento é o terceiro registro da branch. [`correcoes-cjt-portal.md`](correcoes-cjt-portal.md) cobre os 16 itens de frontend do portal e [`melhorias-frontend-backoffice.md`](melhorias-frontend-backoffice.md) cobre as melhorias de backoffice e plataforma. Este cobre os pedidos do documento de correções do cliente (`Correções CJT_2026-09-16.pdf`, 29 pedidos) que precisaram de **backend** ou de backend e frontend juntos. Autorização: o time autorizou editar backend e frontend; infra (Dockerfile, `fly*.toml`, `.github`, `.env.example`) continua fora e vira pendência.

## 1. Decisões do time

- **DDD = papéis ADMIN e SDTC** (`podeAtender` em `src/lib/auth.ts`). Quem devolve, libera pedido congelado, decide arquivamento e vê a fila. Sem papel novo.
- **Agendador da análise de duplicidade dentro do app** (`src/instrumentation.ts`, 12:00 e 00:00 de Brasília), com idempotência por horário e por requisição (fase 7, ver seção 3).
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
| 6 | Cada polígono nomeado ligado à sua parcela do SIGEF | #PEND-34, #PEND-45 | front e back | `d9247af` |
| 7 | Análise de duplicidade e sobreposição (4 situações), agendada | #PEND-30 | front e back | a commitar |

Planejadas (ainda não feitas): fase 8 arquivamento (#PEND-29), fase 9 status por etapa e complexidade (#PEND-27, #PEND-32).

## 3. O que cada fase entregou

**Fase 0 — Fundação (`a0fd7ed`).** `src/lib/solicitacao-estados.ts` concentra os status da requisição (`RASCUNHO`, `AGUARDANDO_LIBERACAO`, `AGUARDANDO_CLIENTE`, `ARQUIVAMENTO_SOLICITADO`, `ARQUIVADA` entraram junto dos existentes) e `clientePodeEditar`, que substituiu três cópias da regra. `exigirSolicitanteApi()` em `portal-auth.ts` padroniza a autenticação das rotas do portal. `src/lib/protocolo.ts` (`criarComProtocolo`) gera o protocolo pelo maior sequencial do ano mais 1, com nova tentativa se outro pedido ganhar o número (antes era `count()+1`, que repetia número em pedidos simultâneos). Vitest 3 e `npm test`.

**Fase 1 — Chat (`f776cfd`).** Model `MensagemSolicitacao` e marcas de leitura em `Solicitacao`. `src/lib/chat.ts` (parte pura em `chat-tipos.ts`). Rotas de listar e enviar para o portal (só o dono) e para o atendimento (ADMIN e SDTC), e `POST …/[mid]/responder` para perguntas com botões (base da duplicidade). Mensagens de sistema são idempotentes pela `chave`; a resposta a uma pergunta só vale uma vez (gravação condicional). Componente `src/components/requisicao/chat.tsx`, selo "N novas" nas duas listas. O chat não existe em rascunho comum e é só leitura em requisição arquivada.

**Fase 2 — Devolver (`400e9a2`).** `POST /api/requisicoes/[id]/devolver` com motivo de 10 a 1000 caracteres, só para requisição pendente, sem processo e sem finalização. Grava `devolucaoMotivo` e `devolvidaEm`, muda para `DEVOLVIDA` (única situação em que o portal deixa editar), posta o motivo no chat. O reenvio pelo portal volta a `PENDENTE` e avisa o atendimento. Requisição devolvida não aceita abertura de processo nem pagamento.

**Fase 3 — Regras do formulário no servidor (`588d293`).** Coluna `cjtInformaMatricula`. Pergunta 3.1 "Quero informar o número da matrícula?" nos casos de usucapião com resultado Matrícula ou Gleba: Sim segue o fluxo normal, Não grava a matrícula como "Usucapião" (literal só vale nesse ramo), Não sei interrompe. A matrícula passou a recusar letras. A nomenclatura fechada dos polígonos (Gleba, Parte, Parcela mais complemento de até 3 caracteres) passou para `cjt-formulario.ts` e vale também no servidor. `validarRepresentacao` e `validarCNPJ` (`cpf.ts`): "Representante" exige CPF ou CNPJ válido e nome; "Proprietário" descarta dados de representação.

**Fase 4 — Rascunho (`35847a9`).** `POST /api/portal/solicitacoes` com `rascunho: true` guarda o que já foi respondido, sem validar; `PATCH` com `rascunho: true` atualiza; `PATCH` sem a marca valida tudo e envia. O atendimento não vê rascunho em lista, filtro, tela nem pelo link direto (`visivelAoAtendimento`). Cartão "Não enviadas" ativo, botão "Salvar rascunho" e "Continuar". Limite: anexos não ficam no rascunho.

**Fase 5 — 13 ou mais polígonos (`8790a1b`).** `POST /api/portal/solicitacoes/[id]/congelar` (a quantidade vem do rascunho guardado) e `POST /api/requisicoes/[id]/liberar` (ADMIN e SDTC). Colunas `congeladaEm` e `liberadaEm`. Congelado: sem edição, com chat, fora da fila de abertura de processo; liberado: volta a rascunho, passa de 12 até 100 polígonos. O atendimento presencial não tem o limite de 12.

**Fase 6 — Polígonos ligados às parcelas (`d9247af`).** Em gleba com 2 ou mais polígonos nomeados e imóvel do SIGEF, cada polígono indica a sua parcela (coluna `cjtPoligonos`, JSON com nome, parcela, nome da área e hectares). O servidor confere cada parcela contra a consulta ao SIGEF do CPF do solicitante, grava nome e área vindos da consulta e exige que o imóvel principal seja a parcela do primeiro polígono. Formulário com uma linha por polígono (cor, nome, seletor; parcela já usada fica desabilitada) e mapa colorido com o nome no contorno; detalhe do portal e do atendimento mostram a tabela "polígono → parcela → área" e o mapa. Um polígono só, ou resultado por Matrícula ou Área, não muda.

**Fase 7 — Análise de duplicidade (a commitar).** Duas vezes por dia (12:00 e 00:00 de Brasília) o app compara a geometria das parcelas de cada requisição enviada com as demais; só depois disso a requisição entra na fila "Aguardando abertura de processo".
- *Situações* (`src/lib/duplicidade.ts`, função `classificarPar`). **S1:** mesma geometria e mesmo cadastro, outra finalizada, mesmo solicitante → pergunta no chat da nova ("Sim, quero uma nova certidão" segue; "Não" arquiva). **S2:** igual, mas cadastro diferente → mesma pergunta com texto próprio. **S3:** mesma geometria e cadastro, outra em andamento e sem processo, mesmo solicitante → pergunta nas duas ("Manter esta" ou "Manter a outra"); quem responder primeiro decide, a outra é arquivada e a pergunta dela se encerra. **S4:** o resto (sobreposição parcial, solicitantes diferentes, outra já com processo ou devolvida) → sem mensagem ao cliente; marca `sobreposicao` e lista `sobreposicaoCom`, com aviso vermelho no detalhe da requisição e do processo e selo nas listas. A ligação vale nos dois sentidos (a lista da outra ponta é calculada na leitura, sem gravar nada na outra requisição).
- *Estados:* pergunta aberta deixa a requisição em `AGUARDANDO_CLIENTE` (fora da fila); sem repetição, ou com S4, ela fica `PENDENTE` e analisada. Reenvio de requisição devolvida zera a análise. Requisição aberta pelo balcão é analisada na hora; as do portal esperam o horário.
- *Agendador* (`src/instrumentation.ts` → `src/lib/agendador-processo.ts` → `src/lib/agendador.ts`): confere a cada 5 minutos se o horário atual já rodou e, se não, roda (cobre app parado às 12:00, e a subida do servidor). `AGENDADOR_DUPLICIDADE=off` desliga. O botão "Rodar análise agora" (só ADMIN, em Requisições) roda na hora e mostra o resumo; `POST /api/cron/duplicidade` com `CRON_TOKEN` serve a um agendador externo.
- *Idempotência* (exigência do time): (1) cada horário é uma linha única em `ExecucaoAgendada` (`duplicidade:AAAA-MM-DDTHH`), e só quem a gravar executa; execução iniciada e nunca concluída há mais de 30 minutos é retomada por comparar-e-trocar; (2) cada requisição é reservada por `updateMany` condicional (`PENDENTE` e `analiseDuplicidadeEm` vazio) na MESMA transação que grava mensagens e novo status, então nada fica pela metade e duas execuções simultâneas não analisam a mesma requisição; (3) cada pergunta tem chave fixa (`DUP:S1:{idOutra}`), e uma pergunta já respondida nunca é refeita; (4) a resposta é condicional (só vale a primeira) e, em S3, as duas perguntas são fechadas na mesma transação, em ordem de id, para duas respostas simultâneas nunca arquivarem as duas requisições; (5) abrir o processo confere a análise e o status de novo dentro da transação.
- *Hipóteses do time* (o documento não as detalha; confirmar com o cliente na #PEND-53): "mesma geometria" é o mesmo código de parcela ou 98% de sobreposição mútua; sobreposição (S4) começa em 1% da menor parcela e 100 m², para vizinhas que só se encostam não acusarem; "mesmo cadastro" compara qualidade, resultado, situação, propriedade de, matrícula, código INCRA e representado; "finalizada" é a requisição com finalização registrada (`finalizadaEm` ou `CONCLUIDA`); havendo mais de uma repetição, o solicitante recebe uma só pergunta (prioridade S3, S1, S2) e as demais viram sobreposição; requisição sem registro no INCRA não tem geometria e segue para a fila sem comparação; rascunho, congelada, arquivada e arquivamento solicitado não entram na comparação. Os limiares são constantes no topo de `duplicidade.ts`.

## 4. Banco de dados

Todo model ou coluna entrou nos dois schemas (`prisma/schema.prisma` e `prisma-postgres/schema.prisma`, idênticos exceto o `provider`) e numa migration só do Postgres, idempotente (`IF NOT EXISTS`). A ordem das migrations contra a `9999_postgis_geometry` precisa ser conferida em staging.

| Migration | Conteúdo |
| --- | --- |
| `20261007120000_chat_solicitacao` | Tabela `MensagemSolicitacao`, `chatLidoSolicitanteEm`, `chatLidoAtendimentoEm` |
| `20261007130000_devolucao_requisicao` | `devolucaoMotivo`, `devolvidaEm` |
| `20261007140000_cjt_informa_matricula` | `cjtInformaMatricula` |
| `20261007150000_congelamento_poligonos` | `congeladaEm`, `liberadaEm` |
| `20261007160000_cjt_poligonos_parcelas` | `cjtPoligonos` |
| `20261007170000_analise_duplicidade` | `analiseDuplicidadeEm`, `sobreposicao`, `sobreposicaoCom`, `arquivadaEm`, `arquivamentoMotivo`; tabela `ExecucaoAgendada` |

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
| `POST /api/admin/duplicidade/executar` | ADMIN | roda a análise de duplicidade agora |
| `POST /api/cron/duplicidade` | token `CRON_TOKEN` | gancho do agendador externo (404 sem a variável) |
| `POST /api/requisicoes/[id]/processo` | ADMIN, SDTC | agora exige a requisição já analisada |
| `POST …/mensagens/[mid]/responder` | solicitante dono | perguntas `DUP:` têm efeito (seguir ou arquivar) na mesma transação |

Erros seguem o padrão `{ error }`. Toda transição de status é condicional (`updateMany` com o status esperado), então chamadas simultâneas só deixam passar a primeira.

## 6. Testes

138 testes automatizados (Vitest) cobrindo protocolo, estados, chat, formulário CJT (matriz, usucapião, nomenclatura, limite de polígonos, representação), CPF e CNPJ, rascunho, vínculo polígono ↔ parcela, comparação de geometrias e as quatro situações de duplicidade, e o agendador (horário em Brasília, disputa pelo horário, retomada de execução travada). As rotas foram verificadas no navegador (API e tela) a cada fase, com solicitante, ADMIN, GERENTE e outro solicitante.

## 7. Limites conhecidos

- Só ADMIN e SDTC veem o chat no backoffice; sem anexos no chat e sem e-mail ou SMS (#PEND-37).
- Anexos não ficam no rascunho.
- A DDD não recebe notificação própria do pedido congelado: ela o encontra em Requisições pelo status "Aguardando liberação".
- O seletor de situação do atendimento mostra rótulos pensados para o solicitante nos status novos (ex.: "Aguardando sua resposta").
- A matrícula e a nomenclatura mais estritas passam a exigir correção na edição de requisições antigas fora do padrão.
- A comparação usa as geometrias do acervo SIGEF local; parcela fora do acervo é comparada só pelo código, e imóvel sem registro no INCRA não é comparado.
- O agendador foi exercitado só contra o SQLite de desenvolvimento; em produção depende da #PEND-52 (instância ligada, variáveis, migration).
- Na primeira subida depois do deploy as requisições pendentes antigas são analisadas de uma vez, e podem gerar várias perguntas no chat.
- O acompanhamento do portal ainda não tem ramo próprio para `ARQUIVADA` (fase 8).

## 8. Como testar

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev          # http://localhost:3000
npm test             # 138 testes
```

- **Portal:** `/portal/login` com um CPF válido e um nome. **Backoffice:** `/login` com `admin@igc.sp.gov.br` / `IGC@certidoes-2026`.
- Chat: abra a mesma requisição no portal e em `/requisicoes/{id}` (duas sessões) e troque mensagens.
- Devolver: em `/requisicoes/{id}` use "Devolver requisição"; no portal corrija e reenvie.
- Rascunho: em `/portal/nova-solicitacao` responda parte e clique "Salvar rascunho"; continue em "Não enviadas".
- 13 polígonos: escolha Gleba, informe 13 e use "Enviar para análise da DDD"; no atendimento use "Liberar preenchimento".
- Usucapião: Pergunta 3 "Usucapião", resultado Matrícula, e responda a 3.1.
- Duplicidade: envie duas requisições do mesmo solicitante para a mesma parcela; em Requisições (ADMIN) clique "Rodar análise agora"; no portal responda a pergunta do chat (S3: só uma das duas segue). Para S1, finalize a primeira em "Finalização e pagamento" antes. Para S4, use solicitantes diferentes na mesma parcela e veja o aviso vermelho no detalhe e no processo.
