# Arquitetura — visão pública

## Camadas

1. **Interface** — recebe solicitações em linguagem natural e transforma intenção em objetivo operacional.
2. **Contexto e memória** — recupera preferências, decisões e conhecimento documental; o RAG fornece evidência relevante.
3. **Orquestração** — classifica complexidade e risco, seleciona workflows, agentes, modelos e ferramentas.
4. **Execução** — realiza ações por integrações autorizadas, com idempotência, retries, checkpoints e aprovação quando necessária.
5. **Qualidade e governança** — aplica contratos, auditorias, políticas, avaliação de RAG, identidade e rastreabilidade.
6. **Observabilidade** — mede sucesso, falhas, latência, disponibilidade, qualidade, custo e maturidade.

## Princípios

- Evidence-first.
- Security-by-default.
- Separação entre planejamento e comprovação de execução.
- Autonomia proporcional ao risco.
- Memória com proveniência.
- Mudanças reversíveis e auditáveis.
- Métricas reais em vez de scores sintéticos.

## Fluxo

`Usuário → Interface → Context Router + Memória + RAG → Orquestrador → Agentes/Workflows/Políticas → Execução → Validação/Auditoria → Resultado`
