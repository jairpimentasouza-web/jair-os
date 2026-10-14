# Padrão do modelo oficial de avaliações — Escola Mater / Colégio São Conrado

Fonte: `MODELO AVALIAÇÕES - Fund II e Médio.docx`, no Google Drive (file ID
`1ZfmTSo7m8h9kpnhzaut7GaoN6jAor9sY`). Medidas extraídas do XML do arquivo em
14/10/2026 (sha256 `39c6d306…60fd3`). Se o `mater_provas.py modelo` passar a
acusar avisos, o colégio mudou o modelo: confira e atualize este documento.

O repositório é público: o `.docx`, os logos e as fontes embutidas **não** são
versionados. O agente baixa o modelo do Drive a cada sessão.

## Regras do próprio modelo (bloco "ATENÇÃO" do arquivo)

1. O padrão do arquivo deve ser seguido, sem alterar fonte/tamanho.
2. O cabeçalho não deve ser alterado, somente preenchido com as informações solicitadas.
3. Todas as questões devem ser digitadas (recorte de questão inteira como imagem não vale).
4. Imagens em boa resolução; fotos de outros documentos/livros não são aceitas.
5. Fórmulas/glossário não devem estar na prova.
6. Fundamental II e Médio: é necessário haver questões com situação-problema.
7. Nome do arquivo: `Turma(Série/Ano) – Avaliação – Disciplina` (ex.: `3ª Série – Avaliação – Física 2`).

## Página

| Item | Valor |
|---|---|
| Papel | A4 (11906 × 16838 twips) |
| Margens | sup. 0,75 cm · dir. 1,25 cm · inf. 1,27 cm · esq. 1,25 cm |
| Cabeçalho / rodapé | 1,0 cm / 1,25 cm da borda |
| Borda de página | linha simples 0,5 pt, a 24 pt da borda do papel |
| Rodapé | número da página à direita |

## Cabeçalho institucional (só na 1ª página)

- `ESCOLA MATER` e `COLÉGIO SÃO CONRADO`: Arial 15 pt negrito, centralizados.
- Logo P&B "escola MATER Colégio São Conrado" (3,84 × 2,02 cm) à direita, no cabeçalho de página.
  No modelo ele se repete em todas as páginas e invade o texto da página 2; o gerador
  liga "primeira página diferente" e deixa as demais páginas sem logo.
- Tabela flutuante de 4 colunas (4943/851/2126/2838 twips), bordas de 1,5 pt, linhas de 0,6 cm:

| Linha | Conteúdo (Arial 11 pt negrito; campos a preencher em vermelho) |
|---|---|
| 1 | `NOME:` · `N°.` · `TURMA: XºAno/Xª Série` |
| 2 | `DISCIPLINA: MATÉRIA` · `DATA: /03/2026` |
| 3 | `PROFª: SEU NOME` · `TESTE/PROVA Xº BIM` · `Total de Pontos: 3,0/7,0` |
| 4 | Bloco `ATENÇÃO:` (Arial 8,5 pt, 5 itens + "Boa prova!") · `NOTA:` |

O gerador troca somente o texto dos campos vermelhos e mantém a cor do modelo
(`--cabecalho-preto` grava os valores em preto). O total de pontos do modelo é
3,0 para teste e 7,0 para prova; use o valor que o professor informar.

## Corpo

| Elemento | Formatação |
|---|---|
| Fonte | Tahoma 11 pt, entrelinha 1,15, sem espaço antes/depois |
| Questão | `Questão N – ` em negrito + enunciado + valor `(x,x)` no fim |
| Alternativas | lista automática `a)`, recuo 0,5 cm deslocado, reinicia em cada questão |
| Itens de discursiva | mesma lista `a)`, com o valor de cada item `(x,xx)` |
| Figuras | centralizadas entre o enunciado e as alternativas, ≥ 150 dpi no tamanho impresso (ideal ≥ 220) |

Cada questão (enunciado, figura, alternativas e espaço de resposta) é mantida
inteira na mesma página.
