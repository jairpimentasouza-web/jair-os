# Case Study 01 — Jair Didática

## Problema

Produzir materiais didáticos de Física, Matemática e Química com consistência editorial, progressão de dificuldade, gabarito comentado e identidade visual, reduzindo retrabalho manual.

## Solução

O JOS organiza o fluxo em etapas: contexto da turma → seleção de conteúdo → geração estruturada → revisão científica → validação editorial → exportação → registro.

## Arquitetura aplicada

- Memória contextual por turma e aluno.
- RAG para recuperar cronogramas, avaliações e materiais de referência.
- Agente de materiais para estruturar conteúdo e exercícios.
- Agente avaliador para revisão de coerência e nível.
- Geração de arquivos e preparação para publicação.
- Auditoria do artefato antes da entrega.

## Resultado operacional

O fluxo padroniza cabeçalho, explicações, fórmulas, mapas mentais, listas graduais e gabaritos comentados. O ganho principal é previsibilidade: materiais diferentes seguem o mesmo contrato de qualidade.

## Evidência demonstrável

O portfólio público não inclui materiais de alunos nem avaliações reais. A evidência publicada se limita à arquitetura, contratos de qualidade e métricas sanitizadas do sistema.
