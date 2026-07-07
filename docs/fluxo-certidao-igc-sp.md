# Fluxo de Processo de Certidão — IGC SP

## Diagrama de Swim Lanes

O diagrama abaixo apresenta o fluxo completo do processo de certidão no IGC SP, desde o contato inicial do cliente até a emissão final. Cada raia (swim lane) representa um setor ou papel responsável pela etapa.

---

### Raias (Setores/Papéis)

| Raia | Responsável | Descrição |
|------|-------------|-----------|
| **Cliente/SEI** | Cliente externo | Solicita a certidão via SEI |
| **SDTC** | Seção de Documentação Técnica e Cartográfica | Recebe, registra e encaminha o processo |
| **GDAT** | Gerência de Divisas Administrativas Territoriais | Distribui para o técnico responsável |
| **Técnico** | Técnico designado | Executa análise de gabinete e campo |
| **Conferente** | Técnico conferente | Revisa e valida o trabalho técnico |
| **Assinaturas** | Técnico → Gerente → Diretor | Cadeia de assinaturas para aprovação |
| **Saída** | SDTC / SEI | Upload e emissão da certidão |

---

### Fluxo Passo a Passo

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                      FLUXO DE PROCESSO DE CERTIDÃO — IGC SP                                 │
│                                                                                             │
│  Tipos de Serviço: Certidão | Drenagem | Parecer | Traçado de Divisa | Informação Técnica   │
│  Tipos de Cliente: Comum-CPF | Comum-CNPJ | Órgão Público | Justiça | Idoso (prioridade)   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
║ CLIENTE / SEI                                                                               ║
║                                                                                             ║
║  ┌──────────────┐     ┌─────────────────────────┐                                           ║
║  │  Abertura do │     │  Documentos necessários: │                                           ║
║  │  processo no │────▶│  • Requerimento           │                                           ║
║  │  sistema SEI │     │  • Documentos pessoais    │                                           ║
║  └──────────────┘     │  • Planta/croqui          │                                           ║
║                       │  • Comprovantes            │                                           ║
║                       └────────────┬──────────────┘                                           ║
╠════════════════════════════════════╪══════════════════════════════════════════════════════════╣
║ SDTC (Seção Doc. Técnica)         │                                                         ║
║                                   ▼                                                         ║
║             ┌──────────────────────────────────────┐                                        ║
║             │      ① ENTRADA SDTC                  │                                        ║
║             │  • Registro do processo               │                                        ║
║             │  • Atribuição de número de ordem      │                                        ║
║             │  • Verificação de documentos           │                                        ║
║             │  • Classificação: tipo serviço/cliente │                                        ║
║             │  • Dados: município, expediente SEI    │                                        ║
║             └──────────────────┬───────────────────┘                                        ║
║                                │                                                            ║
║                    ┌───────────┴───────────┐                                                ║
║                    │ Docs OK?              │                                                ║
║                    └───────┬───────┬───────┘                                                ║
║                      SIM   │       │  NÃO → Devolver ao cliente                             ║
╠════════════════════════════╪═══════╪════════════════════════════════════════════════════════╣
║ GDAT (Gerência)            │       │                                                        ║
║                            ▼       │                                                        ║
║  ┌─────────────────────────────────────────┐                                                ║
║  │      ② DISTRIBUIÇÃO GDAT                │                                                ║
║  │  • Gerente analisa o processo            │                                                ║
║  │  • Designa técnico responsável           │                                                ║
║  │  • Define prioridade (Idoso = urgente)   │                                                ║
║  │  • Atribui base cartográfica             │                                                ║
║  │    (10k, 50k, MDT 2023, Ortomosaico)     │                                                ║
║  └──────────────────┬──────────────────────┘                                                ║
║                     │                                                                       ║
║     ┌───────────────┴────────────┐                                                          ║
║     │  Pode ser sobrestado       │                                                          ║
║     │  (suspenso) a qualquer     │                                                          ║
║     │  momento a partir daqui    │                                                          ║
║     └───────────────┬────────────┘                                                          ║
╠═════════════════════╪══════════════════════════════════════════════════════════════════════╣
║ TÉCNICO             │                                                                       ║
║                     ▼                                                                       ║
║  ┌─────────────────────────────────────────┐                                                ║
║  │      ③ ANÁLISE TÉCNICA                  │                                                ║
║  │                                          │                                                ║
║  │  Gabinete:                               │                                                ║
║  │  • Análise de imagens aéreas (QGIS)     │                                                ║
║  │  • Verificação de limites municipais     │                                                ║
║  │  • Consulta MapServer/georreferenciamento│                                                ║
║  │  • Elaboração de parecer técnico         │                                                ║
║  │                                          │                                                ║
║  │  Campo (se necessário):                  │                                                ║
║  │  • Vistoria in loco                      │                                                ║
║  │  • Levantamento topográfico              │                                                ║
║  │  • Registro fotográfico                  │                                                ║
║  │                                          │                                                ║
║  │  📧 Contato com cliente por email        │                                                ║
║  │     (se necessário complementar docs)    │                                                ║
║  └──────────────────┬──────────────────────┘                                                ║
╠═════════════════════╪══════════════════════════════════════════════════════════════════════╣
║ CONFERENTE          │                                                                       ║
║                     ▼                                                                       ║
║  ┌─────────────────────────────────────────┐                                                ║
║  │      ④ CONFERÊNCIA                      │                                                ║
║  │  • Revisão do trabalho técnico           │                                                ║
║  │  • Validação de cálculos e medições      │                                                ║
║  │  • Verificação de conformidade           │                                                ║
║  │  • Observações de conferência            │                                                ║
║  └──────────────┬──────────┬───────────────┘                                                ║
║                 │          │                                                                 ║
║           APROVADO    REPROVADO → Volta para ③ Análise Técnica                              ║
╠═════════════════╪══════════════════════════════════════════════════════════════════════════╣
║ ASSINATURAS     │                                                                           ║
║                 ▼                                                                           ║
║  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐                 ║
║  │ ⑤ ASS. TÉCNICO     │  │ ⑥ ASS. GERENTE     │  │ ⑦ ASS. DIRETOR      │                 ║
║  │                     │  │                     │  │                      │                 ║
║  │ Técnico assina o   │─▶│ Gerente revisa e   │─▶│ Diretor aprova e    │                 ║
║  │ documento técnico   │  │ assina              │  │ assina final         │                 ║
║  │                     │  │                     │  │                      │                 ║
║  │ Pode devolver para │  │ Pode devolver para │  │ Pode devolver para  │                 ║
║  │ Conferência         │  │ Ass. Técnico       │  │ Ass. Gerente        │                 ║
║  └─────────────────────┘  └─────────────────────┘  └──────────┬───────────┘                 ║
╠════════════════════════════════════════════════════════════════╪═══════════════════════════╣
║ SAÍDA / SEI                                                   │                             ║
║                                                               ▼                             ║
║  ┌─────────────────────────────────────────┐     ┌──────────────────────┐                   ║
║  │      ⑧ UPLOAD SEI                      │     │  ⑨ FINALIZADO       │                   ║
║  │  • Upload da certidão no sistema SEI    │────▶│  • Certidão emitida  │                   ║
║  │  • Número de saída IGC gerado           │     │  • Processo concluído │                   ║
║  │  • Notificação ao cliente               │     │  • Disponível ao     │                   ║
║  └─────────────────────────────────────────┘     │    cliente via SEI   │                   ║
║                                                  └──────────────────────┘                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════╝


FLUXOS ALTERNATIVOS:
────────────────────
  ⚠️  SOBRESTADO: Processo pode ser suspenso temporariamente em qualquer etapa
      (da Distribuição GDAT até Assinatura Gerente). Quando retomado, volta para
      a etapa adequada (Distribuição, Análise ou Conferência).

  ❌  CANCELADO: Processo pode ser cancelado em qualquer etapa.
      Motivos: Duplicidade | Pedido do cliente | Atribuição errada |
               Cliente não responde | Problemas no SEI
```

---

### Tabela de Transições Permitidas

| De ↓ / Para → | Dist. GDAT | Análise | Conferência | Ass. Téc. | Ass. Ger. | Ass. Dir. | Upload SEI | Finalizado | Sobrestado | Cancelado |
|---|---|---|---|---|---|---|---|---|---|---|
| **Entrada SDTC** | ✅ | | | | | | | | | ✅ |
| **Dist. GDAT** | | ✅ | | | | | | | ✅ | ✅ |
| **Análise Técnica** | | | ✅ | | | | | | ✅ | ✅ |
| **Conferência** | | ✅ ↩️ | | ✅ | | | | | ✅ | ✅ |
| **Ass. Técnico** | | | ✅ ↩️ | | ✅ | | | | ✅ | |
| **Ass. Gerente** | | | | ✅ ↩️ | | ✅ | | | ✅ | |
| **Ass. Diretor** | | | | | ✅ ↩️ | | ✅ | | | |
| **Upload SEI** | | | | | | | | ✅ | | |
| **Sobrestado** | ✅ | ✅ | ✅ | | | | | | | ✅ |

↩️ = Devolução para etapa anterior (retrabalho)

---

### Notificações Automáticas

Em cada transição de etapa, o sistema envia notificações automáticas:

| Evento | Destinatário | Notificação |
|--------|-------------|-------------|
| Novo processo registrado | SDTC / GDAT | "Nova Entrada" |
| Processo atribuído | Técnico designado | "Atribuição" |
| Análise completa | Conferente | "Análise Completa" |
| Conferência aprovada | Técnico (assinatura) | "Conferência Completa" |
| Assinatura pendente | Gerente / Diretor | "Assinatura Pendente" |
| Upload concluído | SDTC / Cliente | "Processo Concluído" |
| Prazo excedido | Responsável atual | "Prazo Vencido" |

---

### Papéis no Sistema

| Papel | Permissões |
|-------|-----------|
| **SDTC** | Registrar processos, encaminhar para GDAT |
| **Gerente (GDAT)** | Distribuir processos, designar técnicos, assinar |
| **Técnico** | Executar análise, elaborar parecer, assinar |
| **Conferente** | Revisar trabalho técnico, aprovar/reprovar |
| **Diretor** | Assinatura final de aprovação |
| **Admin** | Acesso total ao sistema |
