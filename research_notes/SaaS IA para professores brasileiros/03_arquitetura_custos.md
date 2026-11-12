# Arquitetura técnica e custos operacionais reais por professor (USD/BRL) — SaaS de IA para professores brasileiros (nov/2026)

> RASCUNHO EM ANDAMENTO (salvo cedo por precaução). Data de consulta de todas as fontes: 2026-11-12, salvo indicação.
> Câmbio usado: PTAX venda BCB 12/11/2026 = **R$ 5,6143 / US$** — [BCB Olinda PTAX API](https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='11-01-2026'&@dataFinalCotacao='11-12-2026'&$format=json)

## Preços de LLM (por 1M tokens)

### Cited Findings (parcial)
- Claude Haiku 5.5: US$0,10 in / US$0,125 cache write 5m / US$0,01 cache hit / US$0,50 out (prompts ≤100k); >100k: 0,50/2,50 — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Claude Sonnet 5.5: 2 / 2,50 / 0,10 / 10 — mesma fonte
- Claude Opus 5.5: 4 / 5 / 0,20 / 20 — mesma fonte
- Claude Fable 5.2: 8 / 10 / 0,20 / 40 — mesma fonte
- Batch API: −50% input e output (Haiku 5.5 batch 0,05/0,25; Sonnet 5.5 1/5; Opus 5.5 2/10) — mesma fonte
- OpenAI gpt-5.6-luna 0,20/0,02 cache/1,20; gpt-5-nano 0,05/0,005/0,40; gpt-5-mini 0,25/0,025/2,00; gpt-5.4-mini 0,75/0,075/4,50; Batch/Flex ≈ −50% — [OpenAI pricing](https://developers.openai.com/api/docs/pricing)
- Gemini 3.1 Flash-Lite 0,25 in (0,50 áudio)/1,50 out; 3.5 Flash-Lite 0,30/2,50; 3.8 Flash 0,75/3,75 (sobe p/ 1,50/7,50 em 1/12/2026 ou 1/1/2027); free tier com uso dos dados — [Google AI pricing](https://aistudio.google.com/docs/pricing)
- DeepSeek flash (V4.1-Flash-1017): cache hit 0,006, miss 0,30, out 1,20 (pico); metade off-peak — [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing)
- Groq gpt-oss-120b 0,15/0,60; gpt-oss-20b 0,075/0,30 — [Groq models](https://console.groq.com/docs/models)
- Maritaca S5 R$0,50/R$2,50; Sabiá-4 R$5/R$20; Sabiazinho-4 R$1/R$4; −50% noturno/batch; br-sp +30% — [Maritaca pricing](https://www.maritaca.ai/en/pricing)

(continua — seções completas abaixo serão substituídas na versão final)
