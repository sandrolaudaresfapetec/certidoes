# Correções CJT no portal do solicitante

Status: **implementado** na branch `feat/portal-correcoes-cjt` (7 commits, `f371f7a` a `b38faab`). Nada foi publicado (sem push nem PR).

Este documento registra o que foi implementado a partir do **documento de correções do cliente (16/09/2026)**: qual pedido, onde está no código, onde ver na aplicação, as decisões tomadas e o que ficou de fora. Quem altera estas telas deve ler também [`AGENTS.md`](../AGENTS.md) e [`PENDENCIAS.md`](../PENDENCIAS.md).

## 1. Contexto e regras do trabalho

- O documento trazia pedidos para o portal do solicitante (Cadastro, Nova Requisição, Minhas Requisições, Acompanhar Requisição) e para o recebimento pela DDD. Foram separados **16 itens de frontend**. O que depende de backend, infraestrutura ou decisão do cliente está em `PENDENCIAS.md`.
- Trabalho só de frontend (`AGENTS.md` §2). Backend e infra não foram alterados.
- Cada alteração visual teve antes uma **proposta em HTML aprovada**; cada fase foi verificada no navegador, e o commit só saiu com aceite.
- Verificação de cada fase: `npx tsc --noEmit` e `npx eslint src` sem erros; na Fase 6, também `npm run build`.

## 2. Mapa dos 16 itens

| # | Pedido do cliente | Onde no código | Onde ver na aplicação | Commit |
| --- | --- | --- | --- | --- |
| 1 | Parágrafo sobre a CJT e avisos antes de iniciar | `src/components/requisicao/introducao-cjt.tsx`, `src/app/portal/nova-solicitacao/page.tsx` | `/portal/nova-solicitacao` | `d4be7b8` |
| 2 | Caixas que se liberam conforme o preenchimento; barra ou círculo de evolução | `src/components/requisicao-form.tsx` (prop `variante`), `src/components/requisicao/progresso-solicitacao.tsx`, `src/app/globals.css` (animação) | `/portal/nova-solicitacao`, `/portal/requisicoes/{id}/editar` | `6b2c267` |
| 3 | "Representante" abre caixa para CPF ou CNPJ | `requisicao-form.tsx`, `src/lib/cjt-formulario.ts` (`mascaraCpfCnpj`, `digitosCpfCnpj`, `cpfCnpjCompleto`) | `/portal/nova-solicitacao`, `/requisicoes/nova` | `6b2c267` |
| 4 | Dicas ao lado de Matrícula, Gleba e Área | `requisicao-form.tsx` (`DICAS_RESULTADO`) | `/portal/nova-solicitacao` (Pergunta 2) | `6b2c267` |
| 5 | Explicações acima do campo, rótulos em negrito, sem "SNCR", textos novos | `requisicao-form.tsx` (`Campo`, `descrito`), `cjt-formulario.ts` | `/portal/nova-solicitacao` (Pergunta 4) | `6db842f` |
| 6 | "Nome de cada gleba/polígono" → "Nome de cada polígono" | `src/components/requisicao/nomes-poligonos.tsx` | idem | `6db842f` |
| 7 | Alerta de quantidade de polígonos a partir de 6 | `cjt-formulario.ts` (`ALERTA_QTD_POLIGONOS = 6`), `requisicao-form.tsx` | idem | `6db842f` |
| 8 | Nomenclatura fechada: Gleba, Parte, Parcela ou só o complemento (até 3 caracteres) | `nomes-poligonos.tsx` (`separarNome`, `erroNomenclatura`, `NomesPoligonos`) | idem | `6db842f` |
| 9 | Novo texto da declaração | `requisicao-form.tsx` (caixa "Imóvel e documentos") | `/portal/nova-solicitacao` | `b38faab` |
| 10 | Tela "Solicitação enviada com sucesso" | `requisicao-form.tsx` (tela de envio por `variante`), `introducao-cjt.tsx` (`useConclusaoSolicitacao`) | `/portal/nova-solicitacao`, após enviar | `b38faab` |
| 11 | Cliente só edita se a requisição foi devolvida | `src/app/portal/requisicoes/[id]/page.tsx` (`editavel`), `.../editar/page.tsx` (`STATUS_EDITAVEIS`), `src/components/requisicao-detalhe.tsx` | `/portal/requisicoes/{id}`, `/portal/requisicoes/{id}/editar` | `e43dbba` |
| 12 | Box com o número SEI | `src/components/requisicao/acompanhamento.tsx` | `/portal/requisicoes/{id}` | `e43dbba` |
| 13 | Box Imóvel sem município e com nomes e quantidade de polígonos | `requisicao-detalhe.tsx` | `/portal/requisicoes/{id}` | `e43dbba` |
| 14 | Status visíveis na box de acompanhamento | `acompanhamento.tsx`, `src/lib/requisicao-status.ts` (`acompanhamentoRequisicao`, `ETAPAS_ACOMPANHAMENTO`) | `/portal/requisicoes/{id}` | `e43dbba` |
| 15 | Status Geral em Minhas Requisições | `src/app/portal/page.tsx`, `src/components/requisicao/cartoes-status-geral.tsx`, `src/components/requisicao-filtros.tsx`, `requisicao-status.ts` (`GRUPOS_STATUS_GERAL`) | `/portal`, `/portal?grupo=em-analise` (também `devolvidas`, `concluidas`) | `f997b40` |
| 16 | Ver a imagem com o polígono do imóvel | `src/components/requisicao/mapa-imovel.tsx`, `mapa-imovel-leaflet.tsx`, `geometria.ts`; `requisicao-form.tsx`, `requisicao-detalhe.tsx`, páginas `[id]` | `/portal/nova-solicitacao` (caixa 4), `/portal/requisicoes/{id}`, `/requisicoes/{id}` | `b38faab` |

Fora da lista dos 16, a pedido do time, antes das fases (`f371f7a`): **padrão global de campos e botões** em `src/app/globals.css` (camada `base`) e o guia `AGENTS.md` com o registro `PENDENCIAS.md`.

## 3. O que cada fase entregou

**Fase A (`f371f7a`) — padrão global.** Placeholder `#6B7280`, texto digitado `#111827` em peso 400, cursor de mão em botões, checkbox, radio e no rótulo que os envolve, `not-allowed` nos desabilitados. Regra única; nenhum componente a redefine.

**Fase 1 (`e43dbba`) — Acompanhar Requisição.** Caixa "Acompanhamento": número SEI (ou "Aguardando liberação do número SEI"), linha de 6 etapas (Conformidade mínima, Setor de Atendimentos, Setor Técnico, Documento em assinatura, Aguardando pagamento, Liberado para download) com sub-etapa do Setor Técnico, faixas de sobrestado e cancelado, rodapé de pagamento. No celular as etapas viram lista vertical. Edição só em `DEVOLVIDA` (faixa e botão "Alterar requisição"); nas demais, aviso de que não pode ser alterada. A etapa é **derivada** de `Solicitacao.status`, `Process.situacao` e `pagamentoStatus`; o modelo oficial é do backend (#PEND-27).

**Fase 2 (`f997b40`) — Minhas Requisições.** Cinco cartões (Não enviadas, Em análise, Devolvidas, Arquivadas, Concluídas) que filtram a lista pela URL (`?grupo=`), sem JavaScript. Em análise = pendente + em análise; Concluídas = aprovada + concluída. "Não enviadas" e "Arquivadas" aparecem desabilitados com "em breve" até o backend ter rascunho e arquivamento (#PEND-42, #PEND-29); para ligá-los basta incluir `"RASCUNHO"` e `"ARQUIVADA"` em `GRUPOS_STATUS_GERAL`.

**Fase 3 (`d4be7b8`) — introdução.** A tela abre só com o texto da CJT, os avisos e "Iniciar solicitação". Depois de iniciar, a introdução fica numa barra recolhida acima do formulário. Aparece sempre que a tela é aberta.

**Fase 4 (`6b2c267`) — caixas progressivas, representante e dicas.** Quatro caixas (Solicitante, Configuração da CJT, Dados do imóvel, Imóvel e documentos), cada uma liberada quando a anterior está completa. Barra por etapas no topo e, ao rolar, círculo de % no canto inferior direito (some quando a barra volta e depois de 100%). "Representante" abre a caixa com CPF ou CNPJ (máscara automática, só números) e nome ou razão social; o checkbox antigo de procurador saiu. Só vale no portal; o atendimento continua com o formulário inteiro.

**Fase 5 (`6db842f`) — Dados do imóvel.** Explicações entre o rótulo e o campo, rótulos em negrito, "INCRA (opcional)", textos novos de Matrícula e Propriedade de. Alerta a partir de 6 polígonos. Nome de cada polígono por **tipo único por pedido** (Gleba, Parte, Parcela ou apenas o complemento) mais complemento de até 3 caracteres (letras sem acento, números ou "-"), com o "Nome final" ao lado e aviso de repetidos. `aria-describedby` e `aria-invalid` nos campos (#PEND-17).

**Fase 6 (`b38faab`) — mapa, declaração e envio.** Mapa do OpenStreetMap (Leaflet) com o contorno do imóvel no formulário e no acompanhamento; sem contorno, "Mapa indisponível para este imóvel.". Declaração com o texto novo. Tela "Solicitação enviada com sucesso" (ou "reenviada", na edição de uma devolvida) com o texto do cliente e o protocolo; o atendimento mantém "Requisição registrada!".

## 4. Componentes e padrões novos

| Artefato | Papel |
| --- | --- |
| `src/components/requisicao/acompanhamento.tsx` | Caixa de acompanhamento (SEI, etapas, pagamento). Server Component. |
| `src/components/requisicao/cartoes-status-geral.tsx` | Cartões do Status Geral como links de filtro. |
| `src/components/requisicao/introducao-cjt.tsx` | Introdução e contexto de conclusão (`useConclusaoSolicitacao`). |
| `src/components/requisicao/progresso-solicitacao.tsx` | Barra por etapas e círculo flutuante. |
| `src/components/requisicao/nomes-poligonos.tsx` | Nomes de polígono por tipo + complemento; validação da nomenclatura. |
| `src/components/requisicao/mapa-imovel.tsx` / `mapa-imovel-leaflet.tsx` | Mapa carregado só no cliente (`next/dynamic`, `ssr: false`). |
| `src/components/requisicao/geometria.ts` | `geometriaDoAcervo`: converte o GeoJSON guardado como texto. |
| `RequisicaoForm` — prop `variante` | `"SOLICITANTE"` (portal: caixas progressivas, progresso e tela de envio) ou `"ATENDIMENTO"` (formulário inteiro). Substituiu `progressivo`. |
| `GRUPOS_STATUS_GERAL` (`src/lib/requisicao-status.ts`) | Grupos do Status Geral; grupo com lista vazia aparece como "em breve". |
| `acompanhamentoRequisicao()` (`requisicao-status.ts`) | Deriva a etapa do acompanhamento; será substituída pelo modelo oficial do backend. |

**Dependências novas** (`package.json`): `leaflet` e `@types/leaflet`. A tela `/geometria` passou a usar o mesmo pacote em vez do CDN (#PEND-8; ver [`melhorias-frontend-backoffice.md`](melhorias-frontend-backoffice.md)).

## 5. Decisões aplicadas

- Em análise = pendente + em análise; **Aprovada conta como Concluída**.
- **Município** sai da caixa Imóvel só na visão do cliente; o atendimento (`/requisicoes/{id}`) continua vendo.
- **Caixas progressivas só no portal**; a caixa do representante vale também no atendimento.
- A introdução aparece **sempre** que a tela é aberta (sem guardar no navegador).
- **Tipo de nome único** para todos os polígonos do pedido (evita misturar tipos e criar "sub-glebas").
- **INCRA continua opcional**; sem bloqueio por texto de "S/M" e "S/E" (só a explicação).
- Tela de envio só para o solicitante; atendimento mantém a confirmação curta.
- Leaflet instalado no projeto, não carregado de CDN, no portal.
- A liberação da caixa 2 exige CPF ou CNPJ completo (11 ou 14 números) e nome preenchido.

## 6. Limites conhecidos

- **Edição:** o servidor só aceita alteração em rascunho e em `DEVOLVIDA`; a DDD devolve pela ação "Devolver ao solicitante" (#PEND-26, resolvida; ver [`atendimento-cjt-pedidos-restantes.md`](atendimento-cjt-pedidos-restantes.md)).
- **Status:** a etapa do acompanhamento é derivada do processo e da situação da requisição, agora com as subetapas de Atendimento e Técnico (#PEND-27, resolvida); o Status Geral tem os cinco grupos ativos, inclusive "Não enviadas" e "Arquivadas".
- **Download da certidão:** a etapa 6 mostra "o download ainda não está disponível" (#PEND-28).
- **Chat:** existe (#PEND-25, resolvida): só ADMIN e SDTC o veem no backoffice, sem anexos e sem e-mail ou SMS (#PEND-37).
- **Nome × polígono do mapa:** cada polígono nomeado de uma gleba com 2 ou mais indica a sua parcela do SIGEF e o mapa os colore (#PEND-34 e #PEND-45, resolvidas); o vínculo vale só para o que a consulta ao SIGEF devolveu, que ainda é simulada (#PEND-33).
- **SIGEF:** a consulta continua pelo CPF logado, não pelo do representado (#PEND-33). O CPF/CNPJ do representado e a nomenclatura dos polígonos passaram a ser validados também no servidor (#PEND-44 e #PEND-36, resolvidas).
- **Mapa no acompanhamento:** o contorno vem do acervo `SigefParcela`, vazio no banco local.
- **Dados simulados:** a variação da consulta SIGEF simulada (parcelas com área 0) vinha do enriquecimento com o CAR, removido em `f34b945`; a #PEND-46 foi descartada.
- **Pendências do plano:** #PEND-16 e #PEND-17 resolvidas; #PEND-41 a #PEND-46 criadas; #PEND-29, #PEND-33, #PEND-34 e #PEND-36 detalhadas. Depois deste documento, as fases de atendimento (chat, devolver, usucapião, rascunho, 13+ polígonos, vínculo polígono ↔ parcela, duplicidade, arquivamento, subetapas e complexidade) resolveram a maior parte delas: ver [`atendimento-cjt-pedidos-restantes.md`](atendimento-cjt-pedidos-restantes.md).

## 7. Como testar

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev          # http://localhost:3000
```

- **Portal:** `/portal/login` com qualquer CPF de checksum válido e um nome (ambiente simulado, `AGENTS.md` §4).
- **Backoffice:** `/login` com `admin@igc.sp.gov.br` / `IGC@certidoes-2026`.
- Para ver cada estado do acompanhamento, crie requisições pelo portal e avance o processo no backoffice. Os registros usados nos testes (requisições em vários estados e uma parcela em `SigefParcela`) existem só no banco local e não fazem parte do repositório.
- Roteiro por item: abrir a URL da tabela da seção 2 e conferir o pedido do cliente. Fluxos principais: nova requisição completa (proprietário e representante), edição de uma requisição devolvida, filtros de Minhas Requisições, acompanhamento em cada etapa.

## 8. Arquivos alterados fora dos componentes novos

`src/app/globals.css`, `src/app/portal/page.tsx`, `src/app/portal/nova-solicitacao/page.tsx`, `src/app/portal/requisicoes/[id]/page.tsx`, `src/app/portal/requisicoes/[id]/editar/page.tsx`, `src/app/requisicoes/[id]/page.tsx`, `src/components/requisicao-detalhe.tsx`, `src/components/requisicao-filtros.tsx`, `src/components/requisicao-form.tsx`, `src/lib/cjt-formulario.ts`, `src/lib/requisicao-status.ts`, `package.json`, `package-lock.json`, `AGENTS.md`, `PENDENCIAS.md`.
