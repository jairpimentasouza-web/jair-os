# Maturidade e evidências

Os indicadores publicados no [README](../README.md) e em [`public-metrics.json`](../public-metrics.json) são métricas internas de engenharia, coletadas pelo próprio JOS. Não são certificação independente.

## Como cada indicador é produzido

| Indicador | Origem | Observação |
|---|---|---|
| Score global de maturidade | Agregação de suítes de contrato, auditorias e evidências de governança | Mede cobertura de controles, não resultado de negócio |
| Auditoria AgentOps | Auditoria diária automatizada sobre agentes, workflows e políticas | Pontuação de 0 a 100 |
| Contratos de agentes | Testes de contrato executados em produção (manifesto, permissões, RAG) | Um agente sem manifesto ativo reprova o contrato |
| RAG: MRR, Hit@5 | Conjunto fixo de perguntas com fonte esperada | Mede recuperação, não a resposta final |
| RAG: groundedness, faithfulness, correção | Avaliação das respostas contra as fontes recuperadas | Amostra limitada aos casos do conjunto |

## Princípios

- **Contratos não substituem resultado.** Um contrato verde comprova configuração; só a taxa de execuções concluídas com sucesso, verificada no destino, comprova entrega. Esse é o foco P0 do [roadmap](roadmap.md).
- **Sem elevação artificial.** Quando um controle falha, o alerta fica aberto até a causa raiz ser corrigida; não se ajusta o limite para "passar".
- **Rastreabilidade.** Toda correção operacional registra causa, mudança e forma de reversão na trilha de auditoria.

## Limites conhecidos

- A amostra de execuções reais ainda é pequena para certificar agentes de forma empírica.
- Parte dos indicadores depende de dispositivos locais (desktop e notebook), cuja disponibilidade varia.
