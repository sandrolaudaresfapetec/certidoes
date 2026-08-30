# Test plan — /geometria camada SIGEF (PR #16, produção)

Target: **produção** https://certidoes-app.fly.dev/geometria (main = PR #16 deployed; PR #17, que corrige
o clique, NÃO está deployado). Já logado como Admin.

Dados verificados por curl em produção (fora da gravação):
- `/api/sigef/parcelas?uf=SP` → `{ total: 218616 }`.
- `bbox=-46.05,-23.62,-45.93,-23.54&limite=300` → 48 parcelas (Biritiba Mirim).
- `bbox=-47.06,-21.54,-46.94,-21.46&limite=300` → 148 parcelas (Mococa).
- Parcela grande de referência: `cdec3093-f57a-445b-aecb-b2c2098444de` "FAZENDA SÃO JOSÉ - Única",
  Biritiba Mirim/SP, 310.2223 ha, REGISTRADA / CERTIFICADA, RT `D5Y`, ART `28027230172395995-SP`,
  matrícula `2241, 2242, 2243, 2244, 2245`; bbox lon −46.0674..−46.0477, lat −23.5596..−23.5368
  (centro ≈ −46.0576, −23.5482).
- No mesmo ponto o CAR devolve **outra** feição: `SP-3518305-8F54896777044B19B261D42E5308C55A`,
  Guararema/SP, 309.3327 ha → é isso que o bug conhecido deve escrever por cima.

Código: `src/app/geometria/page.tsx` L79-92 (estado/refs SIGEF), L111-114 (moveend chama as duas
camadas), L115 (map click → `selecionarPorClique`), L210-247 `atualizarCamadaSigef` (gate zoom 12 em
L215, guarda de pedido em L213/L228, estilo violeta `#7c3aed` em L233, click da feição → `usarParcela`
em L236-238), L249-274 `alternarCamadaSigef`, L277-293 `selecionarPorClique` (**só consulta
/api/car/imoveis** — origem do bug), L328-358 `usarParcela`, L43-60 `popupParcela`, L456-476 checkbox
"Mostrar parcelas SIGEF (SP)" e texto de contagem.

## S1 — Camada SIGEF: gate de zoom, contagem coerente e nenhum contorno obsoleto
1. Com o mapa no enquadramento inicial (estado de SP, zoom ~6-7), marcar o checkbox
   **"Mostrar parcelas SIGEF (SP)"**.
   - PASS iff: aparece o texto `Aproxime o mapa (zoom 12+) para carregar as parcelas do SIGEF.` e
     **nenhum** contorno violeta é desenhado.
2. Navegar até Biritiba Mirim (≈ lon −45.99 / lat −23.58) e dar zoom até 12+ (usar o botão `+` do
   Leaflet / scroll no mapa até a URL de tiles indicar z≥12).
   - PASS iff: o texto muda para `N parcelas nesta janela — contorno violeta, de 218.616 importadas de
     SP.` com N ≥ 1 (esperado ~dezenas), e há polígonos de contorno **violeta** visíveis sobre o
     basemap (distintos do laranja do CAR, que está desligado).
3. Dar pan de ~1 tela para leste e esperar o `moveend`.
   - PASS iff: N é atualizado para a nova janela e os contornos violeta correspondem à nova janela.
4. Dar zoom-out rápido para abaixo de 12 (2 cliques em `−` em sequência rápida).
   - PASS iff: a contagem volta para a mensagem `Aproxime o mapa (zoom 12+)…` e **nenhum** contorno
     violeta permanece. FAIL se sobrar "N parcelas nesta janela" ou contornos da janela anterior
     (foi exatamente a falha registrada na camada CAR do PR #13).
5. Desmarcar o checkbox com zoom ≥ 12 e parcelas na tela.
   - PASS iff: todos os contornos violeta e a linha de contagem desaparecem; sem caixa vermelha de erro.

## S2 — Clique numa parcela SIGEF com "Selecionar imovel por clique" (bug conhecido, PR #17)
1. Voltar a Biritiba Mirim com zoom ≥ 12, camada SIGEF ligada, e marcar
   **"Selecionar imovel por clique"**.
2. Clicar no interior de uma parcela violeta grande (alvo: a FAZENDA SÃO JOSÉ, centro ≈ −46.0576,
   −23.5482).
   - Esperado (comportamento correto, PR #17): "Poligono em analise" passa a
     `SIGEF <uuid> — Biritiba Mirim/SP · 310,2223 ha · CERTIFICADA` e o popup mostra código da parcela,
     nome da área (`FAZENDA SÃO JOSÉ - Única`), Biritiba Mirim/SP, 310,2223 ha, situação `REGISTRADA`,
     status `CERTIFICADA`, RT `D5Y`, ART `28027230172395995-SP`, matrícula `2241, 2242, …` e
     "Fonte: SIGEF/INCRA (acervo importado)".
   - Esperado no deploy atual (FAIL a registrar): após ~1 s a consulta do CAR disparada pelo clique do
     mapa sobrescreve a seleção → resumo/popup passam a mostrar
     `SP-3518305-8F54896777044B19B261D42E5308C55A — Guararema/SP · 309,3327 ha`, ou aparece a caixa
     vermelha `Nenhum imovel do CAR neste ponto…`. Vou capturar o estado imediatamente após o clique
     (parcela SIGEF) e o estado final (sobrescrito) como prova.
3. Repetir o clique numa parcela pequena com a camada CAR **desligada** para confirmar que o sintoma é
   o mesmo (não depende do CAR estar visível).

## S3 — "Calcular corte" a partir de uma parcela SIGEF
1. Selecionar uma parcela SIGEF e, **antes** de a consulta do CAR sobrescrever (ou desmarcando
   "Selecionar imovel por clique" imediatamente após o clique para descartar o pedido — L438-441
   incrementa `pedidoPontoRef` e a resposta é descartada), com o campo de ID do processo em branco,
   clicar em **"Calcular corte"**.
   - PASS iff: rende `Caso: …`, `Linhas usadas: … · Registro: <id>`, "Demonstrativo por municipio" e a
     tabela Fragmento/Area (ha)/%/Municipio com valores numéricos coerentes com a área da parcela
     (≈ 310 ha para a FAZENDA SÃO JOSÉ, tolerância de alguns %), e ao menos um fragmento colorido
     desenhado no mapa. FAIL se der erro, área ~0/NaN, ou nenhum fragmento no mapa.

## S4 — Regressão CAR (rotular como Regressão)
1. Marcar "Mostrar imoveis CAR (SP)" com zoom ≥ 12: contorno laranja + `N imoveis nesta janela…`.
2. Colar `SP-3539301-1CEDF5C0922B406986F958C5E660E28E` no campo de código e clicar
   "Buscar pelo codigo".
   - PASS iff: o mapa voa para Pirassununga, polígono índigo, popup com Pirassununga/SP, 86,7812 ha,
     4,8212 MF, `AT (IRU)`, condição ambiental e "Fonte: CAR/SICAR"; resumo atualizado.
3. Clicar numa propriedade laranja com o modo de clique ativo (camada SIGEF desligada).
   - PASS iff: propriedade fica índigo, popup CAR com os atributos SICAR e resumo igual ao popup.

Não coberto (reportar): `?codigo=<uuid>` do SIGEF não tem campo na UI (só código CAR no input) — será
verificado apenas por curl, se necessário; PR #17 (não deployado).
