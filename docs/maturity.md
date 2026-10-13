# Maturidade e evidências

Este documento resume a **auditoria técnica de 12/10/2026** e o **ciclo de correções de 13/10/2026**. A auditoria comparou cada componente do JOS com o que se espera de sistemas de empresas grandes que seguem frameworks reconhecidos. É uma avaliação de engenharia, **não uma certificação**.

> Detalhes exploráveis (nomes de funções, segredos, identificadores de infraestrutura) ficam fora deste repositório público, conforme a [política de segurança](../SECURITY.md).

## Referências usadas

| Tema | Frameworks de referência |
|---|---|
| Segurança | NIST CSF 2.0, ISO/IEC 27001:2022, CIS Controls v8, OWASP ASVS |
| IA e agentes | NIST AI RMF 1.0, ISO/IEC 42001, OWASP Top 10 for LLM Applications |
| Operação e confiabilidade | Google SRE (SLO/error budget), métricas DORA, ITIL 4 |
| Governança e arquitetura | COBIT 2019, TOGAF 10, DAMA-DMBOK |
| Privacidade | LGPD, ISO/IEC 27701 |
| Custo | FinOps Framework |

## Notas por componente (0–10)

Escala: **10** = equivalente ao padrão de uma empresa grande e auditada; **7** = sólido, com lacunas pontuais; **5** = funcional, com lacunas estruturais; **3** = incipiente.

| # | Componente | Peso | 12/10 | 13/10 | O que mudou |
|---|---|---:|---:|---:|---|
| 1 | Arquitetura e modelo de dados | 1 | 7,0 | 7,5 | Todas as chaves estrangeiras indexadas; inventário (CMDB) de todas as funções serverless com papel real e ciclo de vida. |
| 2 | Segurança de dados e identidade | 2 | 7,0 | 8,0 | RPC pública passou a rodar com papel dedicado de privilégio mínimo; exceções de acesso anônimo viraram registro explícito com prazo de revisão; tabela nova sem RLS corrigida. Contratos de segurança v1: 9/9. |
| 3 | APIs e funções serverless | 2 | 4,5 | 6,5 | 100% das funções sem JWT revisadas no código e documentadas; 2 publicadores sem autenticação aposentados; falha latente entre organizações corrigida; comparação de segredo em tempo constante; código-fonte das funções aposentadas arquivado com SHA-256. |
| 4 | Orquestração, agentes e workflows | 1,5 | 5,0 | 6,0 | Contratos de agentes 75/75 e gate de finalização 12/12; o reaper passou a encerrar execuções órfãs sem lease. |
| 5 | RAG e memória | 1 | 6,5 | 7,0 | Contratos de RAG 11/11; todos os agentes habilitados com política e capacidade de RAG. |
| 6 | Observabilidade e SRE | 1,5 | 6,5 | 7,5 | Snapshots a cada 5 min, alinhados ao SLO de frescor (invariante passando); 4 alertas críticos resolvidos pelos próprios monitores após as correções; watchdog de backup. |
| 7 | Runtime local e agentes de desktop | 1 | 5,5 | 5,5 | Sem mudança (depende de ações nas máquinas). |
| 8 | Integrações externas | 1 | 6,5 | 6,5 | Sem mudança relevante. |
| 9 | Governança, risco e conformidade | 1,5 | 6,0 | 7,5 | Registro de operações de tratamento (LGPD art. 37) e RIPD para dados de alunos (art. 38); exceções aprovadas com data de expiração. |
| 10 | Engenharia de software e DevOps | 1,5 | 4,0 | 4,5 | Arquivo versionado do código das funções no banco; checagem de links ampliada para HTML. Ainda sem staging nem CI do código operacional. |
| 11 | Continuidade e recuperação de desastres | 1,5 | 3,5 | 6,5 | Backup lógico diário externo, compactado, com verificação de integridade (SHA-256), teste automático de restaurabilidade, retenção de 14 cópias e alerta se ficar velho. |
| 12 | FinOps e custo | 0,5 | 8,5 | 8,5 | Tudo continua em camadas gratuitas. |
| 13 | Portfólio público (este repositório) | 0,5 | 7,0 | 7,5 | Documentação atualizada e checagem automática de links em Markdown e HTML. |
| 14 | Landing pages e funil | 0,5 | 7,0 | 8,0 | Política de Privacidade publicada e linkada no rodapé e no aviso de consentimento. |
| 15 | Produtos internos (portal, gestão, SaaS) | 1 | 6,5 | 7,5 | Isolamento por organização corrigido; formulário de leads com privilégio mínimo testado ponta a ponta. |

**Nota global ponderada: 5,8 → 6,8 / 10** frente ao padrão de empresa grande.

Os pesos priorizam o que mais reduz risco real: segurança, APIs, continuidade, DevOps, orquestração, observabilidade e governança. Com esses pesos, as notas de 12/10 reproduzem o 5,8 publicado.

A nota interna anterior (7,49) media principalmente o **desenho** dos controles. Esta auditoria pondera também a **execução comprovada** (taxa de sucesso, disponibilidade, recuperação testada).

## Contratos automatizados (13/10/2026)

| Suíte | Antes | Depois |
|---|---:|---:|
| Contratos de agentes | 74/76 | **75/75** |
| Gate de finalização do Agentic OS | 8/12 | **12/12** |
| RAG | 10/11 | **11/11** |
| Segurança v1 | 7/9 | **9/9** |
| Segurança v2 | 2/5 | **4/5** (a restante depende de permissão exclusiva da plataforma) |
| Segurança das funções serverless | 4/5 | **5/5** |
| Invariantes de produção | 5/11 | **9/11** |

"Antes" é a última execução de cada suíte antes das correções (12/10). As 2 invariantes de produção restantes são decisões de arquitetura em andamento: o tamanho da superfície do orquestrador de desktop e ações ainda em modo de ponte manual.

## Nível de maturidade

| Escala | Nível atual |
|---|---|
| CMMI / COBIT 2019 (capacidade 0–5) | **Nível 2 — Gerenciado**, com governança, agentes e continuidade já no padrão de Nível 3 |
| NIST CSF 2.0 (tiers 1–4) | **Tier 2 — Risk Informed**, com as funções *Recover* e *Govern* próximas do Tier 3 |
| Risco operacional | **Médio** (era médio-alto): agora há backup externo verificado; segue a dependência de uma pessoa e de máquinas pessoais |
| Risco de segurança | **Médio-baixo** (era médio): superfície de API revisada por completo |

Dos 4 requisitos para o Nível 3 (Definido), **1 foi cumprido** (backup externo testado). Faltam: ambiente de staging, código operacional versionado com CI e taxa de sucesso ponta a ponta medida e estável.

## Correções aplicadas (custo zero)

**12/10/2026**
- Índices de cobertura para 7 chaves estrangeiras.
- Links quebrados do README corrigidos e checagem automática de links no CI.

**13/10/2026**
- Backup externo diário com verificação de integridade, teste de restaurabilidade, retenção e alerta de atraso.
- Revisão de código de todas as funções serverless sem JWT, com justificativa registrada para cada exceção.
- Publicadores sem autenticação aposentados; falha de isolamento entre organizações corrigida e testada.
- RPC pública de leads com papel de privilégio mínimo, testada como usuário anônimo (inserção, deduplicação, consentimento e bloqueio de leitura).
- Exceções de acesso anônimo registradas com prazo de revisão de 90 dias, verificadas pelos próprios testes de contrato.
- Execuções órfãs: execução travada encerrada e reaper ajustado para que isso não se repita.
- LGPD: registro de operações de tratamento, RIPD para dados de alunos e Política de Privacidade pública.

## Próximas correções recomendadas (todas sem custo adicional)

1. **Excluir as funções aposentadas** (código já arquivado), liberando vagas no limite do plano gratuito.
2. **Trocar o segredo compartilhado por segredos por função.**
3. **Versionar o código operacional** em repositório privado, com CI de lint e testes de contrato antes do deploy.
4. **Staging gratuito**: um segundo projeto no plano gratuito para testar migrations antes da produção.
5. **Exercício de restauração completo** em banco vazio, uma vez por trimestre.
6. **Higiene de dispositivos**: revogar registros que nunca conectaram.
7. **Escopos mínimos de OAuth**: revisar escopos Google que não estão em uso.
8. **Canal dedicado para titulares de dados** (e-mail de privacidade).
