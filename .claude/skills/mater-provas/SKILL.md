---
name: mater-provas
description: Produz testes e provas da Escola Mater / Colégio São Conrado no modelo oficial do Drive (MODELO AVALIAÇÕES - Fund II e Médio). Use para qualquer teste, prova, avaliação, recuperação ou 2ª chamada do Mater/São Conrado — preenche o cabeçalho oficial, digita as questões em Tahoma 11, gera DOCX + PDF do aluno, gabarito do professor e manifesto, com gate de qualidade e inspeção visual de todas as páginas.
---

# Mater Provas — testes e provas no modelo oficial

O gerador abre o próprio `.docx` oficial do Drive, preenche só os campos vermelhos do
cabeçalho e escreve as questões com a formatação do corpo do modelo. Nada do layout é
recriado à mão. Especificações medidas no arquivo: `referencia/padrao-modelo-oficial.md`.

Script: `.claude/skills/mater-provas/scripts/mater_provas.py` (abaixo, `$MP`).
Trabalhe em `saidas/` (ignorada pelo git; o repositório é público) ou no scratchpad.

## Regras inegociáveis

- **Questões só de fonte autorizada** (livro/apostila Poliedro, caderno da turma, vestibulares
  oficiais, acervo do Jair OS), transcritas fielmente e com `fonte` registrada. Não reescreva
  enunciado, não troque dados nem a ordem das alternativas sem o professor pedir.
  Questão autoral só com pedido explícito: `politica_questoes: autoral_autorizado` + `autoral: true`.
- **Tudo digitado.** Imagem só para figura/gráfico/circuito, recortada do PDF da fonte a 300 dpi
  ou redesenhada. Nunca foto de livro, nunca a questão inteira como imagem.
- **Sem formulário ou glossário** na prova. Constantes que o enunciado original traz ("Dado: g = 10 m/s²") ficam.
- Fundamental II e Médio: ao menos uma questão com `situacao_problema: true`.
- Soma dos valores = total de pontos do cabeçalho.
- Gabarito e resoluções só no arquivo do professor, nunca no do aluno.
- Gate `BLOQUEADO` ou página não inspecionada = não entrega.

## Fluxo

### 1. Pedido
Precisa de: tipo (TESTE/PROVA/…), bimestre, série/ano, disciplina, total de pontos, conteúdo e
fonte das questões (livro + capítulo/páginas, caderno, banca). Padrões: professor `Jair Pimenta`,
data `___/___/<ano>`, `segmento: medio`. O modelo sugere 3,0 (teste) / 7,0 (prova), mas os
testes recentes do Jair valeram 1,5 — confirme o total se ele não disser. Pergunte tudo o que
faltar numa única mensagem. Com o MCP `jair_os` conectado, chame `jair_os_contexto` e use
`jair_os_buscar_conhecimento` / `jair_os_buscar_memoria` antes de perguntar.

### 2. Modelo oficial (Drive)
Baixe com `mcp__Google_Drive__download_file_content` (`fileId: 1ZfmTSo7m8h9kpnhzaut7GaoN6jAor9sY`).
O arquivo tem ~3 MB, então o resultado é salvo num `.txt` em `tool-results/` — passe esse caminho:

```bash
python3 $MP modelo <caminho-do-tool-result.txt> --saida saidas/MODELO_AVALIACOES.modelo.docx
```

Se o ID falhar, procure por `title contains 'MODELO AVALIAÇÕES'`. `erros` no resultado = o colégio
mudou o modelo: pare e avise. `avisos` = confira `referencia/padrao-modelo-oficial.md`.

### 3. Questões
- Localize a fonte (PDF do livro no Drive, acervo do Jair OS, prova oficial) e transcreva fielmente.
- `rotulo` opcional impresso após "Questão N –": `(ENEM 2022)`, `(UERJ)`, `Questão do caderno.`.
- Figura: `pdftoppm -r 300 -f P -l P -png fonte.pdf pag`, recorte só a figura (PIL) e declare
  `origem` (ex.: `recorte do PDF da fonte, 300 dpi`).

### 3a. Livro digital da Poliedro → acervo do Jair OS
Credenciais nos segredos do ambiente cloud: `POLIEDRO_LOGIN` e `POLIEDRO_SENHA`. O professor
cadastra no menu do ambiente; nunca peça a senha na conversa nem imprima essas variáveis.
1. Baixar o livro (o id é o `b=` do link `livro-digital.p4ed.com/visualizador/pdf?b=<id>`):
   `node .claude/skills/mater-provas/scripts/poliedro_livro.js <id> saidas/poliedro`.
   Gera `saidas/poliedro/poliedro_<id>.pdf` e guarda a sessão em `.sessao-poliedro.json` para
   reaproveitar. Saídas 2 (sem credenciais), 3 (login recusado), 4 (código/captcha) e 5 (PDF não
   carregou): relate ao professor e pare, sem tentar contornar.
2. Localizar o capítulo: `python3 $MP livro <pdf> --buscar 'ímã|bússola|polo magnético'`, depois
   `--paginas A-B --saida saidas/poliedro/paginas` (texto + PNG 150 dpi por página).
3. Transcrever conferindo com o PNG (o texto extraído ajuda, mas erra símbolos e expoentes):
   enunciado e alternativas sem alterar, com `pagina`, `numero` e `banca` quando o livro citar.
   Formato: `referencia/exemplo-acervo-poliedro.yaml`.
4. Guardar no Jair OS: `python3 $MP acervo-sql acervo.yaml --saida acervo.sql` e rode o SQL com o
   `execute_sql` do MCP Supabase (projeto ativo com o schema `jair_os`), em lotes de até ~20
   questões. Grava em `jair_os.questions` ligado à fonte "Poliedro P+ Conteudos", sem duplicar
   (impressão digital) e com `audit_status: pending`.
5. Montar a prova com as questões do acervo e `fonte: "Poliedro, <livro>, p. N, exercício M"`.

Livro já informado: `69ef5f10ef177fd8764a397e` (pedido do teste de magnetismo da 2ª série, 14/10/2026).

### 3b. Ilustrações em alta definição (quando o professor pedir)
Desenhe a figura em SVG e renderize com `python3 $MP figura fig.svg --largura-cm 10` (PNG a 400 dpi,
16 tons de cinza; `--cores` mantém cor). Regras:
- tons chapados de cinza (traço `#111`, preenchimentos `#6b6b6b`/`#bdbdbd`/`#ececec`), sem degradê:
  imprime limpo em P&B e o arquivo fica leve (~15–30 KB);
- traço ≥ 2 px e legendas com ~9 pt impressos — o comando informa o `fonte_minima_px_para_9pt`;
- a figura ilustra, não muda dados do enunciado e não entrega a resposta;
- declare na especificação `origem: ilustração original vetorial (SVG)` e a mesma `largura_cm`;
- abra o PNG com Read e corrija sobreposições de legenda antes de gerar a prova.

### 4. Auditoria científica (antes de montar)
Resolva cada questão do zero: cálculo completo, unidades, ordem de grandeza, coerência dos dados.
Confirme que exatamente uma alternativa está correta e que o gabarito confere com o da fonte.
Registre a resolução em `resolucao`. Se o gabarito oficial parecer errado, avise o professor —
não corrija em silêncio.

### 5. Especificação
Copie `referencia/exemplo-avaliacao.yaml` para `saidas/<avaliacao>/spec.yaml` e preencha.
Valores com vírgula, entre aspas (`"0,25"`). Marcação nos textos:

| Escreva | Sai |
|---|---|
| `10^{-34}`, `v_{0}` | sobrescrito, subscrito |
| `**negrito**`, `*itálico*` | negrito, itálico |
| `\(\frac{a}{b}\)` | equação nativa do Word (LaTeX via pandoc; requer `libreoffice-math` para o PDF) |
| `\*`, `\^`, `\_` | caractere literal |
| linha em branco no texto | novo parágrafo |

Por questão: `tipo` (objetiva/discursiva), `fonte`, `valor`, `enunciado`, `alternativas` +
`gabarito` (letra) ou `itens` (texto/valor/espaco_linhas) + `resposta_esperada`, `imagem`
(`arquivo`, `largura_cm`, `origem`), `espaco_linhas` (padrão 3 objetiva / 7 discursiva),
`situacao_problema`, `rotulo`, `resolucao`.

### 6. Gerar
```bash
python3 $MP gerar saidas/<avaliacao>/spec.yaml --modelo saidas/MODELO_AVALIACOES.modelo.docx \
  --saida saidas/<avaliacao>          # --so-validar para conferir só a especificação
```
Saída: `<Série> – Avaliação – <Disciplina>.docx/.pdf`, `… – GABARITO PROFESSOR.docx/.pdf`,
`… – manifesto.json` e `previa/pagina-N.png`. Leva ~10 s. `gate: BLOQUEADO` lista os erros:
corrija a especificação e rode de novo. Opções: `--cabecalho-preto`, `--docx-com-fontes`
(o DOCX padrão sai sem as fontes embutidas do modelo: ~35 KB em vez de ~3 MB; Tahoma e Arial
existem no Windows, macOS e Google Docs).

Dependências: `python-docx`, `PyYAML`, `lxml`, LibreOffice (`soffice`), `poppler-utils`; para
`\( \)` também `pandoc` e `libreoffice-math` (`sudo apt-get install -y libreoffice-math`); para
`figura` e para o robô da Poliedro, Node com `playwright` e Pillow.

### 7. Inspeção visual (obrigatória)
Abra **todas** as `previa/pagina-N.png` com Read e confira: cabeçalho preenchido e só na
página 1; nenhuma questão cortada, sobreposta ou fora de ordem; alternativas recomeçando em
a); figuras nítidas; espaço de resposta suficiente; nenhum resto do texto de exemplo do modelo.
Corrija e gere de novo até passar.

### 8. Entrega
- Envie com `SendUserFile` o PDF e o DOCX do aluno e, em mensagem separada, o gabarito.
- E-mail: os conectores do Gmail e do Drive recebem o arquivo em base64 dentro da chamada
  (~1 token por caractere). A prova (DOCX ~80 KB, PDF ~200 KB) não cabe: não tente anexar.
  Ofereça um link que o professor autorizar, ou o encaminhamento pelo app.
- Resuma: nº de questões, soma, páginas, distribuição do gabarito, fontes usadas e avisos do gate.
- Drive (pasta `Colégio São Conrado/Avaliações <N>º Bimestre <ano>/<Série> — <Disciplina>/`, gabarito
  em `Gabaritos — Professor/`): mesma limitação do base64; só arquivos pequenos.
- Registrar no Jair OS (`jair_os_salvar_memoria`) só quando o Jair pedir.
