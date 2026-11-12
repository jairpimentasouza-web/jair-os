# Arquitetura técnica e custo operacional real por professor (USD/BRL) — SaaS de IA para professores brasileiros (nov/2026)

Data de consulta de todas as fontes: **2026-11-12** (salvo indicação). Preços em USD convertidos pela **PTAX venda BCB de 12/11/2026 = R$ 5,6143/US$** (ver seção "Câmbio"). Arredondamentos meus. Nenhum dado pessoal ou nome de escola foi usado nas buscas.

---

## 1. Câmbio USD/BRL (nov/2026)

### Takeaway
PTAX venda de 12/11/2026 = **R$ 5,6143**; o dólar subiu ~2,2% em nove dias (R$ 5,4935 em 03/11). Use uma margem: um orçamento a R$ 5,80/US$ cobre o ruído recente.

### Cited Findings
- Série oficial PTAX (venda): 03/11 5,4935; 04/11 5,4778; 05/11 5,4621; 06/11 5,5013; 09/11 5,5146; 10/11 5,5840; 11/11 5,5606; **12/11 5,6143** — [BCB Olinda PTAX API](https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='11-01-2026'&@dataFinalCotacao='11-12-2026'&$format=json)
- Notícia de 09/11/2026: o dólar comercial fechou perto de R$ 5,51 — [Brasil 61](https://brasil61.com/n/dolar-hoje-fecha-em-leve-alta-a-r-5-51-apos-oscilar-entre-queda-e-valorizacao-bras2617447)
- Algumas tabelas de fornecedores usam um câmbio mais antigo. A Maritaca indica "cerca de R$ 5,14/US$" [(Maritaca pricing)](https://www.maritaca.ai/en/pricing), e as tabelas em BRL do WhatsApp equivalem a ~R$ 5,15. Os preços já fixados em BRL não acompanham a PTAX.

### Inferences
- Preços cobrados em BRL (Maritaca, Meta em BRL, Asaas e Mercado Pago) protegem contra o câmbio. Os custos em USD (Anthropic, OpenAI, Google, Supabase) sobem junto com o dólar.

### Gaps
- Não há projeção de câmbio para 2027. O que está acima é só o valor à vista.

---

## 2. Preços de LLM (por 1M tokens) e estimativa de tokens por tarefa

### Takeaway
A geração 2026 baixou o custo por token: **Claude Haiku 5.5 sai a US$ 0,10/0,50** e **Sonnet 5.5 a US$ 2/10**. Com Haiku 5.5, gerar uma prova custa menos de 1 centavo de dólar. Com Sonnet 5.5, custa ~US$ 0,11. Mesmo no uso pesado, o LLM fica abaixo de R$ 2/mês por professor se tudo rodar em Haiku 5.5 (ou Maritaca S5, GPT‑5.6‑luna ou Gemini Flash‑Lite). Se os documentos usarem Sonnet 5.5, o custo sobe para R$ 3–35/mês conforme o perfil. A escolha do modelo para gerar documentos é a principal alavanca de custo do LLM.

### Cited Findings
**Anthropic (Claude 5.x)**: preços da API 1st‑party, global. Colunas: entrada | escrita de cache 5 min | escrita de cache 1 h | leitura de cache | saída.
- **Claude Haiku 5.5** (`claude-haiku-5-5`), prompts ≤100k tokens: $0,10 | $0,125 | $0,20 | **$0,01** | $0,50. Prompts >100k: $0,50 | $0,625 | $1 | $0,05 | $2,50 — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- **Claude Sonnet 5.5** (`claude-sonnet-5-5`): $2 | $2,50 | $4 | $0,10 (0,05×) | $10 — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- **Claude Opus 5.5** (`claude-opus-5-5`): $4 | $5 | $8 | $0,20 (0,05×) | $20. Fast mode: $8/$40 — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- **Claude Fable 5.2** (`claude-fable-5-2`): $8 | $10 | $16 | $0,20 (0,025×) | $40 — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- **Batch API**: −50% em entrada e saída. Haiku 5.5 fica em $0,05/$0,25, Sonnet 5.5 em $1/$5, Opus 5.5 em $2/$10 e Fable 5.2 em $4/$20. O desconto de batch se acumula com o de caching — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Contexto de 1M tokens a preço padrão em todos os modelos 4.6+, exceto Haiku 5.5, que tem preço mais alto acima de 100k tokens. `inference_geo: "us"` aplica 1,1×. Não existe opção de residência no Brasil — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Overhead de tool use: 286 tokens de system prompt no Haiku, Sonnet e Opus 5.5 — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Overhead de agentes de navegador: o toolset `computer_toolset_20260801` adiciona ~4.520 tokens de entrada por request. O `browser_toolset_20260801` adiciona ~6.610 tokens, mais as screenshots cobradas como imagem — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Custo de imagem: ⌈largura/28⌉ × ⌈altura/28⌉ tokens. Modelos Claude 4.7+ usam o tier de alta resolução (até 2.576 px e 4.784 tokens). Exemplos: 1920×1080 = 2.691 tokens no tier de alta resolução e 1.560 no padrão; 1000×1000 = 1.296 tokens. Screenshots devolvidas ao toolset que excedem o limite são rejeitadas, então é preciso redimensionar no cliente — [Anthropic vision](https://platform.claude.com/docs/en/build-with-claude/vision)
- Notas da skill oficial `claude-api` (cache de 2026‑11‑03): o Haiku 5.5 tem thinking adaptativo ligado por padrão, com effort padrão `medium`. O tokenizer novo conta ~30% mais tokens que o do Haiku 4.5. O Opus 5.5 não permite desligar o thinking. Thinking é cobrado como saída. Confirmar em [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview).

**OpenAI** (Standard; Batch e Flex ≈ −50%) — [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
- gpt‑5.6‑luna: $0,20 entrada / $0,02 cache / $1,20 saída. gpt‑5.6‑terra: 2/0,20/12. gpt‑5.6‑sol: 4/0,40/20.
- gpt‑5.4‑mini: 0,75/0,075/4,50. gpt‑5.4‑nano: 0,20/0,02/1,25. gpt‑5‑mini: 0,25/0,025/2,00. gpt‑5‑nano: 0,05/0,005/0,40. gpt‑5.5: 5/0,50/30.

**Google Gemini** (tier pago; a página não traz data, e vários preços **mudam em 01/12/2026 ou 01/01/2027**) — [Google AI pricing](https://aistudio.google.com/docs/pricing)
- gemini‑3.1‑flash‑lite: $0,25 texto ($0,50 áudio) / $1,50 saída. Batch: $0,125/$0,75.
- gemini‑3.5‑flash‑lite: $0,30 (inclusive áudio) / $2,50.
- gemini‑3.8‑flash: $0,75 / $3,75, **passando a $1,50 / $7,50** na data de mudança.
- gemini‑4‑carbon/argon: $2/$10, passando a $4/$20. Sem free tier.
- gemini‑2.5‑flash‑lite (descontinuado): $0,10/$0,40. Os modelos 2.5 serão roteados para os mais novos em 01/12/2026.
- **Existe free tier** para Flash e Flash‑Lite, mas com a ressalva "content used to improve products". O tier pago não usa os dados para isso.
- Áudio é contado a **32 tokens/s, ou 1.920 tokens/min**, com até 9,5 h por prompt — [Gemini audio docs](https://aistudio.google.com/docs/audio)

**DeepSeek** — [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing)
- deepseek‑flash (V4.1‑Flash‑1017), no pico: cache hit $0,006, miss $0,30, saída $1,20. **Fora do pico custa metade**, e o pico é 01–04h e 06–10h UTC em dias úteis. Contexto de 1M.
- deepseek‑v4‑pro: miss $1,32 / saída $3,96 no pico.

**Groq**: gpt‑oss‑120b a $0,15/$0,60 e gpt‑oss‑20b a $0,075/$0,30. Os modelos Llama aparecem como "ContactSales" — [Groq models](https://console.groq.com/docs/models). A página groq.com/pricing não mostrava preços na consulta — [groq.com/pricing](https://groq.com/pricing)

**Mistral**: Mistral Large a $0,5/$1,5. Batch −50%, cache até −90% — [Mistral pricing](https://mistral.ai/pricing)

**Maritaca (Brasil, preços em R$)** — [Maritaca pricing](https://www.maritaca.ai/en/pricing)
- **S5: R$ 0,50 entrada / R$ 2,50 saída**, o que dá ≈ US$ 0,089/0,445 na PTAX de 12/11.
- Sabiá‑4: R$ 5/R$ 20. Sabiá‑4 Thinking: R$ 5/R$ 40. Sabiazinho‑4: R$ 1/R$ 4.
- Até −50% para uso noturno e em batch.
- Versão "br‑sp", com inferência 100% em território nacional: +30%.

**Estimativas de tokens por tarefa** (premissas minhas, não medidas; thinking incluído na saída):

| Tarefa | Entrada nova | Entrada em cache | Saída (+thinking) | Premissa |
|---|---|---|---|---|
| Prova de 10 questões + gabarito (gerar + 1 passe de quality gate) | 9.000 | 6.000 | 9.000 | Padrão editorial e cabeçalho em cache (~6k). Conteúdo mestre ~4k. 10×250 tok de questões + ~1,5k de gabarito/resolução + ~3k de thinking. QA: reenvio de ~5k + ~0,5k de saída |
| Lista de 20 exercícios (gerar + QA) | 10.000 | 6.000 | 11.000 | 20×200 tok + resoluções curtas + thinking |
| Comando de voz → JSON de notas/faltas | 1.200 | 1.500 | 600 | Transcrição ~150 tok/min + chamada de ~40 alunos (~400 tok) + schema. Saída JSON com 40 itens |
| Sessão de diário com receita determinística (1–2 chamadas) | 3.000 | 1.500 | 800 | A extensão extrai a tabela da turma e o LLM só faz o mapeamento nome falado → nome oficial |
| Agente DOM/a11y conduzindo a sessão inteira (40 passos) | ~529k no total | (parte em cache) | 8.000 | Snapshot de ~5k por passo + histórico |
| Computer use com screenshots (40 passos, browser_toolset) | ~608k no total | (maior parte em cache) | 12.000 | Toolset de 6.610 + screenshot 1366×768 = 1.372 tok, mantendo as 3 últimas |

**Custo por tarefa (US$)**, calculado como entrada×preço + cache×preço + saída×preço. Script em `/tmp/claude-0/-home-user-jair-os/17426b28-d294-53f1-8ad4-5f6bcb61c164/scratchpad/costs.py`:

| Modelo | Prova 10q | Lista 20 | Voz → JSON | Diário (receita) |
|---|---|---|---|---|
| Claude Haiku 5.5 | 0,0055 | 0,0066 | 0,00044 | 0,00072 |
| Claude Sonnet 5.5 | 0,109 | 0,131 | 0,0086 | 0,0142 |
| Claude Opus 5.5 | 0,217 | 0,261 | 0,0171 | 0,0283 |
| GPT‑5.6‑luna | 0,0127 | 0,0153 | 0,0010 | 0,0016 |
| GPT‑5‑nano | 0,0041 | 0,0049 | 0,0003 | 0,0005 |
| GPT‑5.4‑mini | 0,0477 | 0,0575 | 0,0037 | 0,0060 |
| Gemini 3.1 Flash‑Lite | 0,0159 | 0,0192 | 0,0012 | 0,0020 |
| Gemini 3.8 Flash (até 30/11) | 0,0410 | 0,0492 | 0,0033 | 0,0054 |
| DeepSeek flash (pico) | 0,0135 | 0,0162 | 0,0011 | 0,0019 |
| gpt‑oss‑120b @ Groq | 0,0077 | 0,0090 | 0,0008 | 0,0012 |
| Maritaca S5 | 0,0053 | 0,0063 | 0,0005 | 0,0008 |
| Maritaca Sabiazinho‑4 | 0,0091 | 0,0107 | 0,0009 | 0,0014 |

Exemplo da conta (prova com Sonnet 5.5): 9.000×$2/1M = $0,018. Somando 6.000×$0,10/1M = $0,0006 e 9.000×$10/1M = $0,090, o total é **$0,1086 ≈ R$ 0,61**. Com Haiku 5.5: 9.000×0,10 + 6.000×0,01 + 9.000×0,50 = 5.460 /1M = **$0,0055 ≈ R$ 0,03**.

**Navegador: DOM vs. screenshot** (40 passos, por sessão de lançamento; script `costs2.py`):
- Receita determinística: **US$ 0,0007** com Haiku 5.5 e US$ 0,014 com Sonnet 5.5, ou seja, R$ 0,004 a R$ 0,08.
- Agente DOM/a11y: US$ 0,028 (Haiku), US$ 0,52 (Sonnet) ou US$ 1,04 (Opus), equivalentes a R$ 0,16 / R$ 2,92 / R$ 5,84.
- Computer use com screenshots: US$ 0,018 (Haiku), US$ 0,30 (Sonnet), US$ 0,59 (Opus) ou US$ 0,038 (GPT‑5.6‑luna), equivalentes a R$ 0,10 / R$ 1,66 / R$ 3,33 / R$ 0,21.
- Ou seja, a receita determinística custa **~40× menos** que um agente com o mesmo modelo, além de ser mais rápida e previsível.

Evidência externa sobre tokens por passo (fontes de praticantes, sem estudo controlado):
- Uma tarefa custa ~114k tokens com Playwright MCP contra ~27k com Playwright CLI, porque o MCP devolve o snapshot de acessibilidade inteiro a cada ação — [dev.to (Playwright MCP 114k)](https://dev.to/leonting1010/playwright-mcp-burns-114k-tokens-for-one-workflow-heres-why-and-what-to-do-about-it-57k8); [Morph](https://morphllm.com/playwright-mcp); [ITNEXT](https://itnext.io/why-does-playwright-mcp-use-so-many-tokens-da56b6dbd2db)
- No passo 15, a conversa já carrega 60–80k tokens de estado de páginas anteriores. A árvore de acessibilidade não vê canvas — [TinyFish](https://current.tinyfish.ai/issue/31/foundations/article/18062/what-browser-agents-see-before-they-think)
- Benchmark WindTunnel (ago/2026): WebMCP resolveu 97% das tentativas, contra 84–94% de computer use e de agentes DOM, sendo 3–11× mais barato — [WindTunnel results](https://nekuda-windtunnel-results-explorer.static.hf.space/index.html)

### Inferences
- Para provas e listas de Física/Matemática com quality gate, uma estratégia razoável é gerar com Haiku 5.5 e fazer a revisão com Sonnet 5.5 só nos itens reprovados pelo gate. Isso deve ficar perto do custo do Haiku, mas precisa ser validado com eval (50+ casos), porque não encontrei benchmark público de qualidade para Haiku 5.5 em provas em PT‑BR.
- O Batch (−50%) só serve para geração agendada ("receba a prova até amanhã de manhã"), porque o processamento é assíncrono. O caching do prefixo (padrão editorial + cabeçalho da escola) cai para 0,05×–0,1× e é o ganho grátis mais importante.
- Maritaca S5 tem custo equivalente ao Haiku 5.5, com preço em R$ e opção de inferência no Brasil (+30%). É um argumento de LGPD e de soberania de dados para atender secretarias.
- O free tier do Gemini usa os dados para melhorar produtos. Isso é inadequado para dados de alunos menores de idade (inferência; ver o relatório jurídico).

### Gaps
- Preços da Cerebras: não consultados. Mistral Small/Medium/Ministral: a página só mostrava o Large.
- Limites de requisição do free tier do Gemini: não aparecem na página consultada.
- Não houve medição real de tokens das provas do Jair OS. Recomendo `count_tokens` e os logs de `usage` dos workflows atuais.
- Não há benchmark público de qualidade pedagógica entre os modelos.

---

## 3. Speech-to-text para notas de voz em português

### Takeaway
Transcrever no servidor custa de **US$ 0,0007/min** (Groq whisper‑large‑v3‑turbo) a ~US$ 0,006/min (gpt‑4o‑transcribe, Deepgram). No perfil típico (30 min/mês) isso dá **R$ 0,11 a R$ 0,88 por professor**, um valor irrelevante perto do WhatsApp e do LLM. Reconhecimento no aparelho custa zero. Uma alternativa é mandar o áudio direto ao Gemini Flash‑Lite e receber o JSON estruturado numa só chamada.

### Cited Findings
- **OpenAI**: gpt‑4o‑mini‑transcribe ~$0,003/min; gpt‑4o‑transcribe ~$0,006/min; **gpt‑transcribe $0,0045/min**; Whisper $0,006/min. Tempo real: gpt‑realtime‑whisper e gpt‑live‑transcribe a $0,017/min — [OpenAI pricing](https://developers.openai.com/api/docs/pricing)
- **Groq**: whisper‑large‑v3 **$0,111/hora**; whisper‑large‑v3‑turbo **$0,04/hora** (≈ $0,00067/min). Cobrança mínima por arquivo não informada — [Groq models](https://console.groq.com/docs/models)
- **Deepgram**: pré‑gravado Nova‑3 multilingual $0,0052/min PAYG ($0,0043 Growth); monolingual $0,0043. Streaming Nova‑3 multi $0,0092; Flux Multilingual $0,0078. **US$ 200 de crédito grátis**. A página não cita português explicitamente ("60+ languages") — [Deepgram pricing](https://deepgram.com/pricing)
- **AssemblyAI**: Universal‑3.5 Pro $0,21/h ($0,0035/min); Universal‑2 $0,15/h ($0,0025/min). Streaming multilingual $0,15/h, cobrado pela duração da sessão WebSocket. US$ 50 de crédito. A página não lista português — [AssemblyAI pricing](https://www.assemblyai.com/pricing)
- **Gemini como STT + parser**: 1.920 tokens/min de áudio. No 3.1 Flash‑Lite, o áudio de entrada custa $0,50/1M, o que dá $0,00096/min, mais ~150 tokens de saída — [Gemini audio](https://aistudio.google.com/docs/audio); [Google AI pricing](https://aistudio.google.com/docs/pricing)
- **Web Speech API**: "By default… a server-based recognition engine. Your audio is sent to a web service". Há modo no aparelho com `processLocally = true` e pacote de idioma baixado uma vez, que depois funciona offline — [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)
- **Google Cloud STT**: a página de preços não renderizou o conteúdo na consulta — [Google STT pricing](https://cloud.google.com/speech-to-text/pricing)

Conta por perfil (minutos de áudio/mês: leve 6, típico 30, pesado 120):

| STT | Leve | Típico | Pesado |
|---|---|---|---|
| Groq whisper‑v3‑turbo | R$ 0,02 | R$ 0,11 | R$ 0,45 |
| Gemini 3.1 FL (áudio + JSON) | R$ 0,04 | R$ 0,20 | R$ 0,80 |
| AssemblyAI Universal‑2 | R$ 0,08 | R$ 0,42 | R$ 1,68 |
| OpenAI gpt‑4o‑mini‑transcribe | R$ 0,10 | R$ 0,51 | R$ 2,02 |
| Deepgram Nova‑3 multi | R$ 0,18 | R$ 0,88 | R$ 3,50 |
| No aparelho (Web Speech local / Android) | R$ 0 | R$ 0 | R$ 0 |

### Inferences
- Para mapear nomes falados aos oficiais, a qualidade do STT importa menos que o pós‑processamento. O LLM recebe a lista oficial da turma e faz correspondência fuzzy, e depois vem a leitura de confirmação. Por isso o Groq turbo, ou a transcrição embutida no Gemini, tende a bastar. Nomes próprios incomuns são o risco principal. Mitigação: confirmar a correspondência e marcar os casos de baixa confiança.
- O modo padrão da Web Speech no Chrome manda áudio para servidor. Para privacidade de dados de menores, prefira `processLocally` ou STT próprio com DPA.

### Gaps
- Preço do Google Cloud STT/Chirp: página ilegível.
- Cobrança mínima por requisição no Groq: não confirmada.
- Não há benchmark de WER em PT‑BR com nomes próprios.
- Não encontrei fonte oficial sobre o custo e as políticas de áudio do `SpeechRecognizer` do Android (gratuito para o app, mas pode depender dos serviços do Google).

---

## 4. WhatsApp Business Platform (Cloud API): preço Brasil, BSPs, mídia e política de IA

### Takeaway
Desde **01/10/2026**, a Meta cobra também as **mensagens de serviço**, isto é, as respostas livres dentro da janela de 24 h. Cada número tem 1.000 grátis por mês e depois paga **R$ 0,035 por mensagem entregue** (≈ US$ 0,0068). Num bot conversacional, **cada resposta do bot custa**: o perfil típico, com ~166 mensagens enviadas por mês, gasta ~R$ 5,81, mais que o LLM inteiro em Haiku. BSPs como a Twilio somam US$ 0,005 por mensagem, entrada e saída. A cláusula 4.7 dos termos proíbe provedores de IA quando a IA é a função **principal**. Um assistente de tarefas escolares é aceitável em tese, mas Meta decide "a seu exclusivo critério", então há risco de plataforma.

### Cited Findings
**Modelo de cobrança**
- Cobrança por mensagem entregue desde 01/07/2025. Mensagens do usuário para a empresa são gratuitas.
- Categorias cobradas: marketing, utility, authentication e service.
- Template de utility dentro da janela era grátis até 30/09/2026 e é **cobrado desde 01/10/2026**.
- **1.000 mensagens de serviço grátis por mês por número comercial**, sem acúmulo.
- Janela de entrada gratuita (FEP) de até 7 dias para quem chega por anúncio Click‑to‑WhatsApp.
- Faturamento em BRL disponível desde 01/07/2026. Migração obrigatória até 30/06/2027.
- A página oficial cita Brasil utility/authentication = **0,68¢ por mensagem**.
- Fonte de tudo acima: [Meta WhatsApp pricing](https://developers.facebook.com/docs/whatsapp/pricing)

**Tabela Brasil em BRL (fonte secundária que cita a tabela Meta)** — [ChatMaxima BR](https://chatmaxima.com/pt-br/whatsapp-api-pricing/brazil/); valores iguais em [dragapp](https://www.dragapp.com/pt-br/blog/api-oficial-do-whatsapp/)
- Marketing R$ 0,3217. Utility, authentication e service: **R$ 0,0350**.
- Descontos de volume só para utility e authentication: −5% a −25%, chegando a R$ 0,0263.
- Sem forma de pagamento cadastrada, as mensagens de serviço acima das 1.000 grátis não são entregues.
- Em USD: marketing US$ 0,0625 e utility US$ 0,0068 — [Leadsales](https://leadsales.io/pt/ferramentas/calculadora-api-whatsapp/)

**Conflito sobre utility dentro da janela**
- A página oficial da Meta diz que passou a ser cobrada em 01/10/2026 — [Meta](https://developers.facebook.com/docs/whatsapp/pricing)
- A ChatMaxima diz que "continuam gratuitos" — [ChatMaxima](https://chatmaxima.com/pt-br/whatsapp-api-pricing/brazil/)
- Prevalece a fonte oficial.

**Mídia** — [Cloud API media](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media)
- Áudio de até 16 MB, inclusive OGG/Opus mono (formato da nota de voz).
- Documentos PDF, DOC/DOCX, XLS e PPT de até **100 MB**. Imagens de até 5 MB.
- A mídia recebida chega como ID no webhook. A URL de download expira em **5 min**, e o ID vale 7 dias.
- PDF pode ser enviado via Media Upload API e depois como mensagem de documento.
- Portanto, o bot **recebe nota de voz e PDF de cabeçalho** e **devolve PDF/DOCX**.

**BSPs**
- **Twilio**: US$ 0,005 por mensagem, entrada ou saída, mais as tarifas Meta. Sem mensalidade — [Twilio WhatsApp pricing](https://www.twilio.com/en-us/whatsapp/pricing)
- **360dialog**: licença de €49, €99 ou €500 por número/mês, mais as tarifas Meta. A página não mostra markup por mensagem — [360dialog pricing](https://www.360dialog.com/pricing)
- **Whapi.Cloud** (API não oficial): US$ 29/mês por número, segundo o próprio fornecedor — [Whapi](https://whapi.cloud/blog/pt/how-to-calculate-whatsapp-api-bill-after-october-1-2026-with-examples)
- **Z‑API** (não oficial): "a partir de R$ 97/mês por instância", com mensagens ilimitadas, segundo comparativo de terceiros sem data — [CupomOnline](https://cupomonline.com.br/melhores-api-whatsapp/)

**Política de IA**
- Cláusula 4.7 ("AI Providers") dos Meta Terms for WhatsApp Business Platform (última modificação 23/09/2026): provedores de IA "are strictly prohibited from accessing or using the WhatsApp Business Platform… when such technologies are the primary (rather than incidental or ancillary) functionality", "as determined by Meta in its sole discretion".
- A mesma cláusula proíbe usar dados da plataforma para treinar modelos, exceto fine‑tuning de uso exclusivo.
- Fonte: [Meta Terms WBP](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform)
- A imprensa noticiou a vigência a partir de **15/01/2026**, atingindo ChatGPT, Copilot e Perplexity. Bots de suporte, vendas e notificações continuam permitidos — [respond.io](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban); [Business Standard](https://www.business-standard.com/technology/tech-news/meta-bans-ai-chatbots-from-whatsapp-business-api-chatgpt-to-shut-down-jan-2026-125102200335_1.html)
- Um blog de fornecedor menciona suspensões ordenadas no Brasil e na Itália e investigação na UE. Não verificado — [respond.io policy 2026](https://respond.io/blog/whatsapp-chatbot-policy-2026)

**Conta do WhatsApp por professor** (premissa de ~3 mensagens do bot por comando de voz: leitura de confirmação, "lançado" e eventual correção; 2 por documento: status e PDF; mais avisos avulsos)

| Perfil | Msgs enviadas/mês | Meta direto (R$ 0,035) | Taxa extra Twilio (entrada + saída × US$ 0,005) |
|---|---|---|---|
| Leve | 42 | R$ 1,47 | +R$ 2,02 (72 msgs) |
| Típico | 166 | **R$ 5,81** | +R$ 7,19 (256 msgs) |
| Pesado | 480 | R$ 16,80 | +R$ 20,77 (740 msgs) |

Com 2 mensagens por comando (uma leitura de confirmação, com o "ok" do professor fechando a ação), o típico cai para ~106 mensagens = R$ 3,71.

### Inferences
- **Use a Cloud API direto da Meta, sem BSP com taxa por mensagem.** A Twilio mais que dobra o custo do canal. 360dialog é uma taxa fixa e só faz sentido acima de ~1.500 mensagens/mês por número.
- **Projete o bot para ser econômico em mensagens.** Consolide a leitura de confirmação numa só mensagem com botões. Entregue a prova como 1 PDF e o DOCX só sob pedido. Mande o aviso de "pronto" por e‑mail ou PWA quando possível.
- **Risco da cláusula 4.7.** Posicione o produto como serviço de gestão escolar (lançamento no diário, entrega de documentos) em que a IA é auxiliar. Evite chat livre ("pergunte qualquer coisa"). Mantenha um canal alternativo pronto (PWA com voz no aparelho; Telegram é uma alternativa sem custo por mensagem, mas não verifiquei a fonte).
- **APIs não oficiais** (Z‑API, Whapi) emulam o WhatsApp Web, com custo fixo baixo. Infiro que haja risco de banimento do número e de violação dos termos. Não encontrei fonte primária com estatística de banimento.

### Gaps
- PDF/CSV oficial da tabela de tarifas Meta para o Brasil: não baixado. Os R$ 0,3217 e R$ 0,035 vêm de fontes secundárias, mas batem com os 0,68¢ oficiais (0,0068 × 5,15 ≈ 0,035).
- Taxas da Gupshup: não consultadas.
- Não há fonte primária sobre o enforcement da cláusula 4.7 no Brasil, nem sobre como a Meta classifica bots verticais com IA generativa.

---

## 5. Automação do navegador: opções, custos, segurança e produtos existentes

### Takeaway
A opção mais barata e de menor responsabilidade é a **(A) extensão Chrome/Edge no navegador do próprio professor**. Ele faz o login, e a extensão roda **receitas determinísticas por sistema escolar**: seletores e passos gravados uma vez com ajuda do LLM e reproduzidos sem LLM. O LLM entra só para mapear nomes e, como fallback, quando a página muda. O custo marginal é ~R$ 0,004 por lançamento, e as credenciais nunca saem do aparelho. Navegadores em nuvem saem a US$ 0,02–0,12 por browser‑hora, mas exigem guardar credenciais ou sessões, sofrem com IP de datacenter, CAPTCHA e login gov.br, e transferem a responsabilidade para você.

### Cited Findings
**Navegadores em nuvem**
- **Browserbase**: Free (1 h); **Developer US$ 20/mês com 100 h, excedente US$ 0,12/h**, proxy US$ 12/GB; **Startup US$ 99/mês com 500 h, US$ 0,10/h**, proxy US$ 10/GB — [Browserbase pricing](https://www.browserbase.com/pricing)
- **Steel**: Launch US$ 0 + uso (US$ 30 de crédito por 90 dias), **US$ 0,10/h**, proxy US$ 10/GB, CAPTCHA US$ 3/mil, sessão máxima de 15 min. Scale US$ 250/mês, **US$ 0,08/h**, proxy US$ 6/GB, CAPTCHA US$ 1/mil. Cobrança por minuto — [Steel pricing](https://docs.steel.dev/overview/pricinglimits)
- **Hyperbrowser**: ~US$ 0,10/h e proxy US$ 10/GB, segundo blog do próprio fornecedor — [Hyperbrowser blog](https://tech.hyperbrowser.ai/task/blog/best-price-performance-headless-browser-automation-3)
- **Browser Use Cloud** (verificado em 05/11/2026): **sessão de navegador US$ 0,02/h**; passo de agente API V2 a partir de US$ 0,006 + US$ 0,01 por tarefa; proxy residencial US$ 5/GB. Modelos hospedados com markup: claude‑sonnet‑5‑5 a US$ 2,40/US$ 12, ou 1,2× o preço do provedor — [Browser Use pricing](https://browser-use.com/pricing.md)
- **Skyvern**: abandonou o preço de US$ 0,05 por passo e passou a créditos mensais — [Skyvern blog](https://www.skyvern.com/blog/launch-week-day-5-simpler-pricing-model/). Planos Hobby US$ 29 e Pro US$ 149, segundo review de terceiros — [dailyaifixs](https://dailyaifixs.com/blog/skyvern-pricing-2026-what-credits-really-buy)

**Agentes de navegador de consumidor**
- **Claude in Chrome**: extensão no navegador do usuário, disponível nos planos pagos (Pro, Max, Team, Enterprise) sem custo extra. Ampliada a todos os pagantes por volta de 26/08/2026 (fontes secundárias com datas divergentes) — [Anthropic blog](https://claude.com/blog/claude-for-chrome); [Gigazine](https://gigazine.net/gsc_news/en/20260827-claude-chrome-available/)
- **ChatGPT Atlas**: navegador gratuito. O Agent Mode só existe nos planos pagos (Plus US$ 20 ou mais) — [TechCrunch](https://techcrunch.com/2025/10/21/openai-launches-an-ai-powered-browser-chatgpt-atlas); [eesel](https://eesel.ai/blog/chatgpt-atlas-pricing)
- Os dois operam **na sessão do próprio usuário**, mesmo padrão da opção A.

**Replay determinístico com fallback**
- No Stagehand, com `cacheDir`, "Stagehand saves every action and agent step to a local file on first run" e depois "replays those cached actions… with no LLM calls, no token cost".
- "If the page content or structure changes, the action won't get a cache HIT and the LLM will be called."
- A chave de cache usa instrução, URL e opções. Valores dinâmicos devem ir em `variables`.
- Fonte: [Stagehand caching](https://docs.stagehand.dev/v3/best-practices/caching)

**Custo de tokens** (seção 2): por sessão de 40 passos, a receita determinística custa R$ 0,004 com Haiku, o agente DOM R$ 0,16 com Haiku e R$ 2,92 com Sonnet, e o computer use R$ 0,10 com Haiku e R$ 1,66 com Sonnet.

**Custo de navegador em nuvem por professor** (sessão de 5 min; lançamentos/mês: 8 / 40 / 120):
- Browserbase a US$ 0,12/h: 0,67 h / 3,3 h / 10 h → **R$ 0,45 / R$ 2,25 / R$ 6,74**
- Browser Use a US$ 0,02/h: R$ 0,07 / R$ 0,37 / R$ 1,12
- Proxies residenciais não incluídos.

### Inferences (comparação das opções)

| Opção | Custo marginal | Credenciais | Robustez | Alcance |
|---|---|---|---|---|
| **A. Extensão Chrome/Edge (MV3)** no navegador do professor | ~R$ 0 + LLM mínimo | Ficam no aparelho; a sessão é do professor | Alta com receitas por sistema; IP residencial do próprio professor; ele resolve CAPTCHA e gov.br | Só desktop/notebook. Chrome no Android não aceita extensões (inferência, não verificado) |
| **B. Navegador em nuvem** (Browserbase, Steel, Browser Use) | R$ 0,07–6,74/mês + proxy | Precisa guardar senha ou cookies; o servidor vira alvo e você vira operador dos dados | Média: IP de datacenter, CAPTCHA, 2FA, gov.br | Qualquer aparelho, inclusive via WhatsApp |
| **C. App desktop** (Electron/Tauri com Playwright local) | ~R$ 0 | Ficam no aparelho (keychain do SO) | Alta | Desktop; instalação mais difícil para baixo letramento |
| **D. App Android** (WebView com injeção da receita JS e STT no aparelho) | ~R$ 0 | Ficam no aparelho (Android Keystore) | Alta se o sistema escolar funcionar em WebView | Muito alto (muitos professores só têm celular) |

- **Recomendação**: A como padrão, com D para quem só usa celular. B só como recurso pago e opt‑in, ou para sistemas sem alternativa. Fluxo pelo WhatsApp: o professor manda a voz, o servidor gera o JSON e a fila de lançamentos, e a extensão ou o app executa quando o professor abre o diário já logado. Um único botão "Lançar pendências" mostra a leitura de confirmação e salva.
- **Receitas baratas de manter**:
  1. Gravar uma vez com LLM, gerando seletores estáveis (aria/label/texto, nunca XPath posicional) e passos em JSON.
  2. Versionar por sistema e por versão de layout.
  3. Validar invariantes antes de digitar (número de alunos, cabeçalho da turma, data).
  4. Reproduzir sem LLM.
  5. Em caso de falha, mandar um snapshot DOM reduzido ao Haiku para propor novo seletor, aplicar só depois de leitura de confirmação e alimentar uma correção centralizada (todos os professores daquele sistema ganham o conserto).
  6. Telemetria de falha por sistema.
- Isso transforma o custo de manutenção num custo fixo por sistema escolar, e não por professor.

### Gaps
- Preço oficial da Browserless e da Anchor: não verificados (só estimativas de terceiros).
- Não confirmei se o Chrome Android aceita extensões em 2026, nem a compatibilidade dos diários estaduais e municipais com WebView.
- Não há dados de taxa de quebra de layout dos diários escolares brasileiros.

---

## 6. Segurança de credenciais

### Takeaway
**Não armazene senhas.** O modelo de menor responsabilidade é "o professor clica em Entrar e a IA trabalha na sessão dele", como já faz o Jair OS. Se for indispensável lembrar credenciais, guarde **só no aparelho**, cifradas com chave do SO (Keychain, Android Keystore, DPAPI) ou com chave derivada de um PIN, no modelo de conhecimento zero. O servidor nunca vê o texto claro. O Supabase Vault serve para segredos do sistema (chaves de API), não para senhas de milhares de professores.

### Cited Findings
- O **Supabase Vault** usa criptografia autenticada (AEAD, libsodium). A chave fica fora do banco, gerenciada pela Supabase por projeto, e a Management API pode retornar a root key do projeto.
- A view `vault.decrypted_secrets` decifra os segredos na consulta: "anyone that has access to the view has access to decrypted secrets".
- Fonte: [Supabase Vault](https://supabase.com/docs/guides/database/vault)
- Extensões e agentes de consumidor (Claude in Chrome, Atlas) operam na sessão já autenticada do usuário, sem custodiar senha — [Anthropic blog](https://claude.com/blog/claude-for-chrome); [TechCrunch](https://techcrunch.com/2025/10/21/openai-launches-an-ai-powered-browser-chatgpt-atlas)

### Inferences
- Hierarquia de responsabilidade, da menor para a maior:
  1. Sessão do professor, sem armazenar nada.
  2. Cofre local no aparelho (Keystore/Keychain ou WebCrypto AES‑GCM com chave derivada de PIN via PBKDF2/Argon2, não exportável).
  3. Conhecimento zero sincronizado, estilo Bitwarden: o servidor guarda só o blob cifrado no cliente.
  4. Envelope encryption no servidor com KMS (AWS KMS ou GCP KMS), com DEK por usuário.
  5. Supabase Vault, que tem chave única por projeto e é legível por quem tiver SQL.
- As opções 4 e 5 tornam o SaaS um alvo concentrado de senhas de sistemas governamentais e um operador de dados sensíveis segundo a LGPD (inferência; ver o relatório jurídico).
- Navegador em nuvem (opção B) quase obriga a escolher a 3 ou a 4.

### Gaps
- Não consultei preços de KMS (AWS/GCP) nem a documentação de Android Keystore ou Bitwarden nesta rodada.
- Não verifiquei os termos de uso dos sistemas de diário quanto a automação ou login por terceiros.

---

## 7. Infraestrutura: Supabase, edge, armazenamento, e‑mail, PDF/DOCX, matemática

### Takeaway
A infraestrutura fixa é pequena: ~US$ 30/mês com 100 professores e ~US$ 314/mês com 50 mil (R$ 168 a R$ 1.762). Por professor, isso vai de **R$ 1,68 a R$ 0,035**. As ferramentas de PDF e DOCX são open source (Typst Apache‑2.0, Gotenberg MIT), então o custo é só de computação.

### Cited Findings
- **Supabase** — [Supabase pricing](https://supabase.com/pricing)
  - Pro "a partir de US$ 25/mês", com 100k MAU, 8 GB de disco por projeto, 250 GB de egress, 100 GB de storage, 2M invocações de Edge Function e US$ 10 de crédito de computação (Micro).
  - Excedentes: US$ 0,00325 por MAU, US$ 0,0213/GB de storage, US$ 0,09/GB de egress, US$ 2 por milhão de invocações.
  - Computação: Micro US$ 10, Small US$ 15, Medium US$ 60, Large US$ 110, XL US$ 210. Team: US$ 599/mês.
- **Cloudflare** — [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
  - Workers Paid: US$ 5/mês com 10M requisições e 30M ms de CPU, depois US$ 0,30 por milhão de requisições e US$ 0,02 por milhão de ms de CPU.
  - R2: US$ 0,015/GB‑mês, **egress grátis**, 10 GB grátis.
- **Resend** — [Resend pricing](https://resend.com/pricing)
  - Free: 3.000 e‑mails/mês (100/dia). Pro: US$ 20 por 50k e US$ 35 por 100k. Excedente US$ 0,90 por mil.
- **Typst**: licença Apache‑2.0, compila para PDF via CLI, tipografia matemática nativa — [Typst GitHub](https://github.com/typst/typst)
- **Gotenberg**: API em Docker que converte HTML, Markdown e Office em PDF via Chromium e LibreOffice. Licença MIT — [Gotenberg GitHub](https://github.com/gotenberg/gotenberg)

**Infra fixa por escala** (premissas: 2 MB de PDF+DOCX por professor/mês retidos por 12 meses; 300 invocações de Edge Function por professor/mês; 2 e‑mails por professor/mês; computação Micro, Small, Medium ou XL conforme a escala; Workers US$ 5; sem observabilidade paga):

| Professores pagantes | Supabase (Pro + computação − crédito) | Storage extra | Edge Fn extra | Resend | CF | **Total/mês** | **Por professor** |
|---|---|---|---|---|---|---|---|
| 100 | US$ 25 | 0 | 0 | 0 | 5 | **US$ 30 = R$ 168** | R$ 1,68 |
| 1.000 | US$ 30 | 0 | 0 | 0 | 5 | **US$ 35 = R$ 197** | R$ 0,20 |
| 10.000 | US$ 75 | US$ 3 (234 GB) | US$ 2 | 20 | 5 | **US$ 105 = R$ 589** | R$ 0,06 |
| 50.000 | US$ 225 | US$ 23 (1,17 TB) | US$ 26 | 35 | 5 | **US$ 314 = R$ 1.762** | R$ 0,035 |

### Inferences
- **PDF e DOCX.** Typst é a melhor relação custo/qualidade para prova A4 com fórmulas: um binário único e rápido. Pode rodar como job no worker do Jair OS ou numa VM pequena; uma Edge Function do Supabase provavelmente não roda o binário (não verificado). Para DOCX: a biblioteca `docx` (JS) ou `python-docx` (não verifiquei licença e estado nesta rodada). Gotenberg serve como plano B para HTML→PDF.
- **Matemática.** KaTeX no cliente para pré‑visualização e Typst para o PDF final.
- **Figuras de Física.** Diagramas gerados como código (TikZ, Typst/CeTZ ou SVG pelo LLM) custam só tokens de saída. Imagens geradas por modelo de imagem não são necessárias e custariam mais. Os preços de modelos de imagem não foram consultados.
- **Observabilidade.** Sentry, Logflare ou Grafana têm free tier; o preço não foi consultado, então reserve US$ 0–50/mês como premissa.
- R2, com egress grátis, compensa para PDFs acima de ~100 GB. Antes disso, o Supabase Storage incluído basta.

### Gaps
- Preços de Vercel, Fly.io, Hetzner e outros hosts de container para Typst/Gotenberg: não consultados.
- Preço de disco extra do Supabase acima de 8 GB: não capturado.
- Preço do Cloudflare Browser Rendering: não estava na página.

---

## 8. Taxas de pagamento de assinaturas no Brasil

### Takeaway
Para um ticket de R$ 19,90/mês, as taxas por cobrança são estas:
- Pix via Mercado Pago (0,99%) ou Stripe (1,19% + 0,7% de Billing): **R$ 0,20–0,38**.
- Cartão no Asaas, Stripe ou Mercado Pago: **R$ 1,0–1,3** (5–7%).
- Pix no Asaas pela tabela padrão: R$ 1,99 (10%).
- Plataformas de infoproduto (Hotmart, Kiwify, Eduzz): **17–22%**. Inadequadas para SaaS de ticket baixo.

### Cited Findings
- **Stripe Brasil**: cartão nacional 3,99% + R$ 0,39; internacional +2%; **Pix 1,19%** (só por convite); boleto R$ 3,45; **Stripe Billing 0,7%** do volume — [Stripe BR pricing](https://stripe.com/br/pricing)
- **Asaas** (página oficial, parcialmente legível):
  - Pix e boleto R$ 1,99 ou R$ 0,99 por transação recebida (promoção). Débito R$ 0,35 + 1,89%. Sem mensalidade — [Asaas preços](https://www.asaas.com/precos-e-taxas)
  - Segundo terceiros (consulta de 16/10/2026): cartão à vista R$ 0,49 + 2,99%; promoção de 3 meses com Pix e boleto a R$ 0,99 e cartão a R$ 0,49 + 1,99% — [Quasa](https://quasa.io/pt/media/asaas-ou-iugu-tarifa-publicada-vence-ate-o-volume-pedir-proposta)
  - Tabela de parceiro: Pix R$ 0,99, boleto R$ 1,79, cartão 2,89% + R$ 0,29 — [Asaas parceiro](https://www.asaas.com/parceiros/caldeira)
- **Mercado Pago** (link de pagamento): crédito a 4,98% com recebimento na hora, 4,48% em 14 dias e 3,99% em 30 dias; **Pix 0,99%**; sem mensalidade — [Mercado Pago link de pagamento](https://www.mercadopago.com.br/ferramentas-para-vender/link-de-pagamento?code=1H1A5)
- **Hotmart** 9,9% + R$ 2,49 (o fixo subiu de R$ 1,00 para R$ 2,49 em 21/09/2026). **Kiwify** 8,99% + R$ 2,49. **Eduzz** 4,9% + R$ 2,49 na venda direta. Fontes de terceiros com divergências — [HeroSpark](https://herospark.com/guias/taxas-e-margem); [ViniEnsina](https://viniensina.com.br/?p=4267); [Tactus](https://tactus.com.br/taxas-da-hotmart-para-produtor/)

Conta sobre R$ 19,90: Asaas cartão = 0,49 + 2,99% × 19,90 = **R$ 1,09 (5,5%)**. Stripe cartão + Billing = 0,39 + 3,99% + 0,7% = **R$ 1,32 (6,6%)**. Stripe Pix + Billing = **R$ 0,38 (1,9%)**. MP Pix = **R$ 0,20 (1,0%)**. Hotmart = 1,97 + 2,49 = **R$ 4,46 (22,4%)**. Kiwify = **R$ 4,28 (21,5%)**. Eduzz = **R$ 3,47 (17,4%)**.

### Inferences
- **Plano anual por Pix** dilui as tarifas fixas: R$ 199/ano no Pix do MP custa R$ 1,97 de taxa, ou R$ 0,16/mês.
- **Pix Automático** para recorrência mensal seria o ideal. Não verifiquei suporte nem preço em cada gateway.
- **Venda B2G ou B2B** (secretaria ou escola pagando) elimina o custo por professor e a inadimplência.

### Gaps
- Tabela oficial e completa do Asaas para cartão e assinatura: não renderizou.
- Preço oficial do plano de assinaturas do Mercado Pago, preços da Pagar.me e suporte a Pix Automático por gateway: não verificados.

---

## 9. Custo por professor ativo/mês (leve, típico, pesado) e arquitetura recomendada

### Takeaway
O custo variável real por professor ativo depende quase todo de duas escolhas: **o modelo usado nos documentos** e **o WhatsApp como canal**.
- **Arquitetura econômica** (extensão/PWA + voz no aparelho + Haiku 5.5): **R$ 0,19 / R$ 0,53 / R$ 1,79** por mês nos perfis leve, típico e pesado.
- **Arquitetura recomendada com WhatsApp** (Cloud API direta + Groq + Haiku 5.5 para voz e diário + Sonnet 5.5 para documentos): **R$ 4,23 / R$ 11,55 / R$ 38,17**.
- **Com WhatsApp, mas Haiku em tudo e 2 mensagens por comando**: **≈ R$ 1,40 / R$ 4,35 / R$ 14,14**.
- **"Premium ingênua"** (Twilio + Opus + navegador em nuvem + computer use): **R$ 13 / R$ 45 / R$ 142**. Mostra o que evitar.

A infra fixa acrescenta R$ 1,68 (100 professores) a R$ 0,035 (50 mil) por professor. Pagamento: R$ 0,20–1,32 por cobrança mensal.

### Cited Findings
- Todos os preços unitários vêm das seções 2–8: [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing), [OpenAI](https://developers.openai.com/api/docs/pricing), [Google](https://aistudio.google.com/docs/pricing), [Groq](https://console.groq.com/docs/models), [Meta WhatsApp](https://developers.facebook.com/docs/whatsapp/pricing), [ChatMaxima BR](https://chatmaxima.com/pt-br/whatsapp-api-pricing/brazil/), [Twilio](https://www.twilio.com/en-us/whatsapp/pricing), [Browserbase](https://www.browserbase.com/pricing), [Supabase](https://supabase.com/pricing), [BCB PTAX](https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='11-01-2026'&@dataFinalCotacao='11-12-2026'&$format=json)

**Premissas de uso** (minhas; validar com telemetria do Jair OS):

| Perfil | Provas | Listas | Comandos de voz | Sessões de diário | Áudio (min) | Msgs enviadas pelo bot | Msgs recebidas |
|---|---|---|---|---|---|---|---|
| Leve | 2 | 2 | 8 | 8 | 6 | 42 | 30 |
| Típico | 4 | 4 | 40 | 40 | 30 | 166 | 90 |
| Pesado | 15 | 15 | 120 | 120 | 120 | 480 | 260 |

**Resultado por professor/mês (R$, PTAX 5,6143)**:

| Arquitetura | Leve | Típico | Pesado | Composição no típico |
|---|---|---|---|---|
| **B. Econômica**: PWA + extensão + STT no aparelho + Haiku 5.5 em tudo, sem WhatsApp | **0,19** | **0,53** | **1,79** | Só LLM |
| **A'. WhatsApp enxuto**: Cloud API direta, 2 msgs/comando, Groq turbo, Haiku 5.5 em tudo, extensão com receitas | ~1,40 | ~4,35 | ~14,14 | WA 3,71 + LLM 0,53 + STT 0,11 |
| **A. Recomendada com qualidade**: WhatsApp direto (3 msgs/comando) + Groq turbo + Haiku 5.5 (voz e diário) + **Sonnet 5.5 (documentos)** + extensão | **4,23** | **11,55** | **38,17** | LLM 5,63 + WA 5,81 + STT 0,11 |
| A com documentos em Batch (−50%, entrega agendada) | ~2,89 | ~8,87 | ~28,10 | LLM 2,94 + WA 5,81 + STT 0,11 |
| **C. "Premium ingênua"**: Twilio + gpt‑4o‑transcribe + Opus 5.5 docs + Browserbase + 20% de computer use com Sonnet | 13,07 | 44,77 | 141,97 | LLM 12,66 + CU 15,86 + WA 13,00 + browser 2,25 + STT 1,01 |

Contas (típico, arquitetura A):
- LLM: 4 provas × US$ 0,1086 + 4 listas × US$ 0,1306 = US$ 0,9568 (Sonnet). Depois 40 comandos de voz × US$ 0,00044 + 40 sessões × US$ 0,00072 = US$ 0,0464 (Haiku). Total US$ 1,003 = **R$ 5,63**.
- STT: 30 min × US$ 0,000667 = US$ 0,02 = **R$ 0,11**.
- WhatsApp: 166 × R$ 0,035 = **R$ 5,81**.
- Total: **R$ 11,55**.

**Custo total por professor pagante (típico) somando infra e pagamento**, com um ticket hipotético de R$ 19,90 cobrado via Pix do Mercado Pago (R$ 0,20):

| Pagantes | Infra/prof | B econômica | A' WA enxuto | A recomendada | Fixo total/mês |
|---|---|---|---|---|---|
| 100 | R$ 1,68 | R$ 2,41 | R$ 6,23 | R$ 13,43 | R$ 168 |
| 1.000 | R$ 0,20 | R$ 0,93 | R$ 4,75 | R$ 11,95 | R$ 197 |
| 10.000 | R$ 0,06 | R$ 0,79 | R$ 4,61 | R$ 11,81 | R$ 589 |
| 50.000 | R$ 0,035 | R$ 0,77 | R$ 4,59 | R$ 11,79 | R$ 1.762 |

(Professores pagantes inativos custam só a infra e a taxa de pagamento.)

**Arquitetura recomendada** (evolução do Jair OS):
1. **Núcleo**: Supabase (Postgres multi‑tenant com RLS, Edge Functions, pg_cron para filas e lembretes, Storage) + worker Typst para PDF e DOCX. Conteúdo mestre e cabeçalho da escola ficam versionados por professor.
2. **LLM com roteamento**:
   - Haiku 5.5 (ou Maritaca S5 / GPT‑5.6‑luna como segundo fornecedor) para parsing de voz, mapeamento de nomes e rascunho de questões.
   - Sonnet 5.5 só para o quality gate ou para reescrever questões reprovadas.
   - Caching do prefixo editorial.
   - Batch para geração agendada.
   - Fallback multi‑fornecedor.
3. **Canais**:
   - **WhatsApp Cloud API direta**: pedidos de prova e lista, recebimento de PDF de cabeçalho, entrega de PDF, notas de voz. Mensagens consolidadas e botões interativos.
   - **PWA**: mesmas funções sem custo por mensagem; voz no aparelho.
   - **Extensão Chrome/Edge**: execução no diário.
   - **App Android com WebView**: para professores só de celular.
4. **Diário**: comando de voz → JSON validado → fila "pendências". A extensão ou o app lê a turma na página, faz a leitura de confirmação ("Ana Souza 8,5; João P. falta…"), o professor confirma, a ferramenta digita, relê a tela e salva. Tudo com receitas determinísticas por sistema e fallback via LLM com snapshot DOM reduzido. Nunca computer use por screenshot como caminho principal.
5. **Credenciais**: nenhuma no servidor (seção 6).

### Inferences
- **O WhatsApp é o maior custo variável no cenário econômico.** Com Haiku, o canal custa 7–10× o LLM. Vale oferecer o WhatsApp como canal conveniente, mas dirigir o uso intensivo (lançamento diário de frequência) para a extensão ou o app, onde a mensagem custa zero.
- **Um preço de R$ 14,90–19,90/mês tem margem bruta >70% na arquitetura A'**, mas não na A para usuários pesados (R$ 38). Imponha limites ("até X provas/mês") ou cobre o pacote pesado à parte (inferência para o relatório de precificação).
- A diferença entre receita determinística e agente de screenshot (R$ 0,004 contra R$ 1,66 por sessão com Sonnet) justifica investir em receitas por sistema. Cada sistema estadual ou municipal coberto é um custo fixo de engenharia, não um custo por usuário.
- Alertas de mudança de preço: o Gemini 3.8 Flash dobra de preço em 01/12/2026 ou 01/01/2027, e o WhatsApp mudou as regras em 01/10/2026. Não amarre o produto a um único fornecedor.

### Gaps
- Não há telemetria real de uso por professor. As premissas de volume são estimativas e devem ser calibradas com os logs do Jair OS (workflows de prova, execuções e sessões da extensão).
- Custos de suporte humano, aquisição (CAC), impostos (Simples Nacional/ISS) e emissão de NFS‑e ficaram fora do escopo.
- Não validei a qualidade do Haiku 5.5 contra o Sonnet 5.5 em provas de Física/Matemática em PT‑BR; o custo só vale se a qualidade passar no quality gate.
