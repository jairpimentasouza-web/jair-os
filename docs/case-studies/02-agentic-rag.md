# Case Study 02 — Agentic RAG e Governança

## Problema

Um assistente útil precisa recuperar contexto certo, distinguir evidência de hipótese e evitar respostas confiantes sem suporte documental.

## Solução

O JOS combina memória estruturada, RAG e agentes especializados com contratos de execução, métricas de qualidade e gates de governança.

## Fluxo

`consulta → recuperação → reranking → contexto → agente → validação → resposta → auditoria`

## Controles aplicados

- Proveniência de memória.
- Avaliação de groundedness e faithfulness.
- Contratos automatizados de agentes.
- Políticas de autorização por risco.
- Registro de execução e resultado.
- Métricas de retrieval e correção de resposta.

## Métricas internas observadas

- MRR: 0,9556.
- Hit@5: 0,9704.
- Groundedness: 1,00.
- Faithfulness: 1,00.
- Correção de resposta: 0,9208.

Esses números são indicadores internos de engenharia e não equivalem a certificação independente.
