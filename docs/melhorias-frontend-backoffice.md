# Melhorias de frontend: backoffice e plataforma

Status: **implementado** na branch `feat/portal-correcoes-cjt` (6 commits depois de `b38faab`: `100cb68` a `9a40c15`, mais o commit desta documentação). Nada foi publicado (sem push nem PR).

Este documento é o segundo registro da branch. O primeiro, [`correcoes-cjt-portal.md`](correcoes-cjt-portal.md), cobre os 16 itens do documento de correções do cliente. Este cobre o que sobrou de pendências **só de frontend**, que não dependiam de backend, de infraestrutura nem de decisão do cliente. Quem altera estas telas deve ler também [`AGENTS.md`](../AGENTS.md) e [`PENDENCIAS.md`](../PENDENCIAS.md).

## 1. Contexto e regras do trabalho

- Trabalho só de frontend (`AGENTS.md` §2). Backend e infra não foram alterados; o que encontramos neles virou pendência.
- Toda alteração visual teve antes uma **proposta em HTML aprovada**. Cada fase foi usada no navegador, e o commit só saiu com aceite explícito. Um commit por fase.
- Verificação de cada fase: `npx tsc --noEmit` e `npx eslint src` sem erros; `npm run build` nas fases que mexeram em rotas, layouts ou dependências (5 e 6, e na final).
- Os registros usados nos testes (requisições `CERT-2026-000010` a `000014` e parcelas em `SigefParcela`) existem só no banco local e não fazem parte do repositório.

## 2. Mapa das entregas

| Pendência | O que mudou | Onde no código | Onde ver na aplicação | Commit |
| --- | --- | --- | --- | --- |
| Documentação do plano anterior | Documento dos 16 itens e ponteiro em `AGENTS.md` | `docs/correcoes-cjt-portal.md`, `AGENTS.md` | n/a | `100cb68` |
| Verificação em celular e fluxos | Correção de estouro de largura no portal | `src/app/portal/page.tsx`, `src/components/requisicao-form.tsx` | `/portal`, `/portal/nova-solicitacao` em 375 px | `3973d57` |
| #PEND-5 | Edição do processo (32 campos, técnico e conferente) | `src/app/processos/[id]/editar/page.tsx`, `src/components/processo-edicao-form.tsx`, `src/app/processos/[id]/page.tsx` | `/processos/{id}/editar` | `881f6c1` |
| #PEND-7 | Corte de divisas no menu e ligado ao processo | `src/components/sidebar.tsx`, `src/app/geometria/page.tsx`, `src/app/processos/[id]/page.tsx` | menu "Corte de Divisas", `/geometria?processo={id}` | `f2557f1` |
| Pedido do time (fora do plano) | Remoção do modo escuro | `src/app/globals.css`, `AGENTS.md` | todas as telas | `5a6b861` |
| #PEND-41 | Máscaras de CPF, CNPJ e telefone | `src/lib/mascaras.ts`, `src/components/campo-mascarado.tsx` e os formulários da seção 3.5 | seção 3.5 | `f5cd66e` |
| #PEND-40 | Contraste AA dos textos auxiliares | 7 arquivos, seção 3.6 | seção 3.6 | `9a40c15` |
| #PEND-8 | Leaflet do npm em `/geometria` | `src/app/geometria/page.tsx` | `/geometria` | `9a40c15` |

## 3. O que cada fase entregou

### 3.1 Verificação do que já estava entregue (`3973d57`)

Usamos o portal em 375 px (`/portal`, `/portal/nova-solicitacao`, acompanhamento), o fluxo do representante até o envio, o reenvio de uma requisição devolvida e o atendimento (`/requisicoes/nova`). O defeito de frontend encontrado foi a **largura no celular**: um nome de área com código do CAR sem espaços e o campo "Propriedade de" ao lado do rótulo "Espólio de" esticavam a página. Correção local com `min-w-0`, `[overflow-wrap:anywhere]` e `shrink-0 whitespace-nowrap`. A causa raiz está no layout raiz (`main` é item flex com `min-width: auto`) e ficou na **#PEND-47**.

### 3.2 Edição do processo (#PEND-5, `881f6c1`)

Página própria `/processos/{id}/editar`, no padrão da edição do portal.

- **Página (Server Component):** `requireUsuario()`; quem não é ADMIN/SDTC (`podeAtender`) vê um aviso e o link de volta. Isso é usabilidade; a autorização é da rota. Carrega os usuários elegíveis: técnico = TECNICO ou ADMIN, conferente = CONFERENTE ou ADMIN, e o responsável atual sempre fica na lista.
- **Formulário (client):** seções Interessado, Processo (expediente SEI e datas), Localização, Trabalho técnico, Financeiro e Observações, com os 32 campos de `CAMPOS_EDITAVEIS`.
- **Contrato (lido em `PATCH /api/processes/[id]`):** JSON só com os campos alterados; data vazia vai como `null`; datas como meio-dia local (evita deslocar o dia, porque `formatDate` usa o fuso do servidor); números convertidos no cliente, porque a rota não valida tipos (#PEND-48). Erros em texto com `role="alert"`. Ao salvar, volta para `/processos/{id}?salvo=1`, que mostra "Processo atualizado.".
- **Tela do processo:** botão "Editar processo" (só `podeAtender`).
- **Fim a fim:** o expediente SEI preenchido no backoffice passa a aparecer em `/portal/requisicoes/{id}` no lugar de "Aguardando liberação do número SEI" (fecha o item 12 do plano anterior).

### 3.3 Corte de divisas no menu e no processo (#PEND-7, `f2557f1`)

- Item "Corte de Divisas" na sidebar (depois de Quadro), para todos os papéis.
- Botão "Corte de divisas" na tela do processo → `/geometria?processo={id}`.
- `/geometria` lê `?processo=`, consulta `GET /api/processes/[id]` e mostra a faixa "Processo vinculado" com "Abrir processo" e "Desvincular". Se o processo tem parcela SIGEF no acervo (`GET /api/sigef/parcelas?codigo=`), a parcela entra como polígono em análise; se não, aparece um aviso para escolher o imóvel ou colar o GeoJSON. O corte vai com `processId` para `POST /api/geometria/corte`, e depois do cálculo aparece o link para a minuta em `/processos/{id}/certidao`. O campo de texto do ID continua como alternativa.

### 3.4 Remoção do modo escuro (`5a6b861`)

A tabela "Município / Área / Percentual" da certidão aparecia ilegível. A causa era um resto do template do Next: `globals.css` trocava `--foreground` para claro quando o sistema do usuário estava em tema escuro, mas as telas têm fundo claro fixo, então o texto herdado ficava claro sobre branco. Não existia modo escuro como recurso. O `@media (prefers-color-scheme: dark)` saiu e `globals.css` declara `color-scheme: light`. A convenção "a plataforma só tem tema claro" entrou em `AGENTS.md` §5.

### 3.5 Máscaras de entrada (#PEND-41, `f5cd66e`)

- `src/lib/mascaras.ts`: `mascaraCpf`, `mascaraTelefone` (10 ou 11 números), `telefoneCompleto`, `exibirCpfCnpj`, e reexporta `mascaraCpfCnpj`, `digitosCpfCnpj`, `cpfCnpjCompleto` e `somenteDigitos`.
- `src/components/campo-mascarado.tsx`: `CampoMascarado` mantém o cursor depois do mesmo algarismo ao editar no meio do texto.
- **A máscara é só de exibição.** CPF e CNPJ vão só com números (as rotas normalizam com `\D`); o telefone vai formatado, como o banco já guarda (a rota exige 10 ou mais números).

| Tela | Campos |
| --- | --- |
| `/portal/login` | CPF |
| `/portal/cadastro`, `/portal/completar-cadastro` (`cadastro-contato-form.tsx`) | Telefone |
| `/clientes` (`cliente-form.tsx`) | CPF, telefone |
| `/processos/novo` e consulta SIGEF (`sigef-consulta.tsx`) | Telefone, CPF ou CNPJ |
| `/processos/{id}/editar` | Telefone, CPF ou CNPJ (valor de um campo que não mudou não é validado nem reenviado) |
| `/processos/{id}` e `/processos/{id}/certidao` | CPF/CNPJ formatado na leitura; valor que não é CPF nem CNPJ aparece como está gravado |

### 3.6 Contraste AA (#PEND-40, `9a40c15`)

Nove textos auxiliares em `gray-400` (2,5:1) passaram para `gray-500` (4,6 a 4,8:1; mínimo AA é 4,5:1): rodapé e aviso de login do portal, dica de formatos dos anexos, número, município e coluna vazia do Quadro, data das Notificações, "Pendente" da Certidão e a nota da tabela em `/geometria`. Arquivos: `src/app/portal/layout.tsx`, `src/app/portal/login/page.tsx`, `src/components/requisicao-form.tsx`, `src/app/quadro/page.tsx`, `src/app/notificacoes/page.tsx`, `src/app/processos/[id]/certidao/page.tsx`, `src/app/geometria/page.tsx`. Ícones decorativos e a seta do histórico do processo ficaram em `gray-400`, porque o texto ao lado já diz o que é.

### 3.7 Leaflet do npm em `/geometria` (#PEND-8, `9a40c15`)

O mapa deixou de carregar `leaflet.js` e `leaflet.css` do unpkg. Agora `import("leaflet")` dinâmico no efeito de inicialização (a biblioteca usa `window`) e `import "leaflet/dist/leaflet.css"`. O objeto fica em `leafletRef` e substitui os 8 usos de `(window as any).L`. O efeito agora tem limpeza (cancela se a tela fechar antes do carregamento e remove o mapa). O ajudante `feicao()` embrulha a geometria da API em Feature GeoJSON para o TypeScript aceitar. O pacote já era dependência desde o plano anterior; nenhuma dependência nova.

## 4. Decisões aplicadas

- Edição do processo em **página própria**, formulário por seções.
- Documentação em **dois arquivos** em `docs/`, um por plano.
- **Máscara só de exibição**: o contrato com a API não muda.
- No processo, CPF/CNPJ gravado **só com números** e mostrado formatado nas telas de leitura.
- O campo "Total" não aparece na edição, porque a API nunca o calcula (#PEND-49).
- Só tema claro (seção 3.4).

## 5. Limites conhecidos

- **Validação no servidor:** `PATCH /api/processes/[id]` devolve 500 para data vazia, número ou ano inválidos (#PEND-48). A tela converte tudo antes de enviar, então não depende disso.
- **Total do processo:** nenhuma rota grava `Process.total`; o cartão Financeiro mostra R$ 0,00 mesmo com taxas (#PEND-49).
- **Atribuição pelo GERENTE:** a rota só aceita ADMIN e SDTC (#PEND-6); para os outros papéis a tela mostra apenas o aviso.
- **Largura no celular:** a correção do layout raiz (`min-w-0` no `main`) é global e ficou na #PEND-47; as telas afetadas têm correção local.
- **Camada SIGEF no mapa:** marcar "Mostrar parcelas SIGEF (SP)" funcionou sem erro, mas não vimos parcelas aparecerem no teste local; não confirmamos se foi o nível de zoom ou o acervo local vazio na região.
- **Camada CAR:** depende do GeoServer externo; não foi exercitada na verificação.
- **Console em desenvolvimento:** o erro de WebSocket do `webpack-hmr` é do servidor de desenvolvimento e não afeta a aplicação.

## 6. Pendências do plano

- **Resolvidas:** #PEND-5, #PEND-7, #PEND-8, #PEND-40, #PEND-41 (e, no plano anterior, #PEND-16 e #PEND-17).
- **Criadas:** #PEND-47 (layout raiz, frontend), #PEND-48 (validação do PATCH, backend), #PEND-49 (`Process.total`, backend).

## 7. Como testar

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev          # http://localhost:3000
```

- **Backoffice:** `/login` com `admin@igc.sp.gov.br` / `IGC@certidoes-2026` (ADMIN). Para ver o bloqueio de edição, entre com `thiago@igc.sp.gov.br` ou outro usuário que não seja ADMIN/SDTC, com a mesma senha.
- **Portal:** `/portal/login` com qualquer CPF de checksum válido e um nome.
- **Edição do processo:** `/processos/{id}` → "Editar processo". Altere o expediente SEI, uma data e uma taxa e salve; confira a faixa verde e, no portal, `/portal/requisicoes/{id}`. Teste CNPJ incompleto e telefone sem DDD (erro em texto) e apagar uma data.
- **Corte de divisas:** menu "Corte de Divisas", ou "Corte de divisas" na tela do processo. Com um processo que tenha parcela no acervo, a parcela abre como polígono em análise. Em "Calcular corte" o resultado grava no processo vinculado e mostra o link da minuta.
- **Máscaras:** digitar com letras, colar com e sem pontuação, apagar no meio (o cursor deve ficar no lugar) nas telas da seção 3.5.
- **Contraste:** abrir o Quadro, as Notificações, o rodapé do portal e a certidão; os textos auxiliares devem estar em cinza escuro legível.
- **Leaflet:** abrir `/geometria` com a aba de rede aberta; não deve haver requisição para o unpkg.

## 8. Arquivos alterados

Novos: `docs/correcoes-cjt-portal.md`, `docs/melhorias-frontend-backoffice.md`, `src/app/processos/[id]/editar/page.tsx`, `src/components/processo-edicao-form.tsx`, `src/components/campo-mascarado.tsx`, `src/lib/mascaras.ts`.

Alterados: `AGENTS.md`, `PENDENCIAS.md`, `src/app/globals.css`, `src/app/geometria/page.tsx`, `src/app/notificacoes/page.tsx`, `src/app/portal/layout.tsx`, `src/app/portal/login/page.tsx`, `src/app/portal/page.tsx`, `src/app/processos/[id]/page.tsx`, `src/app/processos/[id]/certidao/page.tsx`, `src/app/processos/novo/page.tsx`, `src/app/quadro/page.tsx`, `src/components/cadastro-contato-form.tsx`, `src/components/cliente-form.tsx`, `src/components/requisicao-form.tsx`, `src/components/sidebar.tsx`, `src/components/sigef-consulta.tsx`.
