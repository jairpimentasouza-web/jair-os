# Maturidade e evidências

Este documento resume a **auditoria técnica de 12/10/2026**, que comparou cada componente do JOS com o que se espera de sistemas de empresas grandes que seguem frameworks reconhecidos. É uma avaliação de engenharia, **não uma certificação**.

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

| # | Componente | Nota | Leitura |
|---|---|---:|---|
| 1 | Arquitetura e modelo de dados | 7,0 | Modelo amplo e versionado por migrations; RLS em 100% das tabelas. Vários produtos dividem o mesmo projeto, sem isolamento por ambiente. |
| 2 | Segurança de dados e identidade | 7,0 | Segredos em cofre, funções privilegiadas com `search_path` fixo e guardas internas. Superfície de RPC autenticada ampla. |
| 3 | APIs e funções serverless | 4,5 | Autenticação própria por segredo compartilhado/token de uso único, mas muitas funções públicas, versões antigas e funções "de uso único" ainda publicadas. |
| 4 | Orquestração, agentes e workflows | 5,0 | Desenho de nível enterprise (risco, aprovação humana, contratos, retries, checkpoints); taxa de sucesso ponta a ponta ainda baixa. |
| 5 | RAG e memória | 6,5 | Busca vetorial e métricas de qualidade; corpus e conjunto de avaliação ainda pequenos e sem avaliação independente. |
| 6 | Observabilidade e SRE | 6,5 | SLOs, snapshots, alertas, self-healing e retenção de dados automatizada. Alertas críticos abertos por dias (fadiga de alerta). |
| 7 | Runtime local e agentes de desktop | 5,5 | Perfis de autonomia (safe/diagnostic/expanded) e revogação; disponibilidade dependente de máquinas pessoais. |
| 8 | Integrações externas | 6,5 | OAuth com estado de uso único e segredos em cofre; escopos Google mais amplos que o necessário. |
| 9 | Governança, risco e conformidade | 6,0 | Amplitude rara para um projeto individual (COBIT, ITIL, TOGAF, IA). Evidências autoavaliadas; RIPD/LGPD formal pendente. |
| 10 | Engenharia de software e DevOps | 4,0 | Mudanças frequentes direto em produção; sem ambiente de staging dedicado nem CI cobrindo o código operacional. |
| 11 | Continuidade e recuperação de desastres | 3,5 | Sem backup externo verificado e testado nem plano de DR exercitado; um único operador. |
| 12 | FinOps e custo | 8,5 | Operação dentro de camadas gratuitas, custo de modelos irrisório e retenção de dados controlada. |
| 13 | Portfólio público (este repositório) | 7,0 | Sanitizado e honesto. Links quebrados corrigidos nesta auditoria e checagem automática adicionada. |
| 14 | Landing pages e funil | 7,0 | Mobile-first, pixel somente com consentimento, repasse de UTM com allowlist. Falta link de política de privacidade. |
| 15 | Produtos internos (portal, gestão, SaaS) | 6,5 | APIs com guardas, formulário de lead com honeypot, consentimento, rate limit e hash de IP. |

**Nota global ponderada: 5,8 / 10** frente ao padrão de empresa grande.

A nota interna anterior (7,49) media principalmente o **desenho** dos controles. Esta auditoria pondera também a **execução comprovada** (taxa de sucesso, disponibilidade, recuperação testada), o que explica a diferença.

## Nível de maturidade

| Escala | Nível atual |
|---|---|
| CMMI / COBIT 2019 (capacidade 0–5) | **Nível 2 — Gerenciado**, com desenho de Nível 3 em governança e agentes |
| NIST CSF 2.0 (tiers 1–4) | **Tier 2 — Risk Informed** |
| Risco operacional | **Médio-alto**: dependência de uma pessoa, plano gratuito e máquinas pessoais |
| Risco de segurança | **Médio**: controles de dados fortes, superfície de API ampla |

Para chegar ao Nível 3 (Definido), faltam principalmente: ambiente de staging, código operacional versionado com CI, backup externo testado e taxa de sucesso ponta a ponta medida e estável.

## Correções aplicadas nesta auditoria (custo zero)

- Índices de cobertura criados para 7 chaves estrangeiras sem índice apontadas pelo advisor do banco.
- Links quebrados do README corrigidos (`SECURITY.md`, este documento e `public-metrics.json`).
- Checagem automática de links relativos no CI (GitHub Actions, gratuito para repositórios públicos).

## Próximas correções recomendadas (todas sem custo adicional)

1. **Reduzir a superfície de funções serverless**: remover versões antigas, funções de diagnóstico e funções "de uso único" já executadas.
2. **Trocar o segredo compartilhado único por segredos por função** e usar comparação em tempo constante.
3. **Backup lógico diário externo** (por exemplo, `pg_dump` agendado em GitHub Actions privado ou no runtime local) com **teste de restauração mensal**.
4. **Versionar o código operacional** (migrations e funções) em repositório privado, com CI de lint e testes de contrato antes do deploy.
5. **Higiene de alertas**: fechar ou rebaixar alertas antigos, definir dono e prazo para alertas críticos.
6. **Higiene de dispositivos**: desativar registros duplicados ou nunca conectados.
7. **LGPD**: registro de operações de tratamento, RIPD para dados de menores e política de privacidade nas landing pages.
8. **Escopos mínimos de OAuth**: revisar escopos Google que não estão em uso.
