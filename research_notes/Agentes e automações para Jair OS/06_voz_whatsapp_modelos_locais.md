# Voice AI, WhatsApp Business automation (Brazil) and local/on-device models for Jair OS (state as of 23 Nov 2026)

Research notes compiled 2026-11-23. Every claim carries a date or "[background]" (pre-2026) tag and an inline source. Prices are USD unless noted. Many figures come from vendor pages or third-party aggregators. Those are flagged. Method note: the session's web-search budget ran out partway through, and a fetch rate limit was hit before a short final pass. Some sub-questions (Retell/Ultravox, Kokoro, LM Studio MCP, Brazilian phone numbers, BSP fee tables) are therefore only partly covered. See each Gaps list.

---

## A1. Speech-to-speech / realtime APIs in 2026 (OpenAI, Gemini Live, Amazon Nova Sonic, others): pricing and latency

### Takeaway
As of Nov 2026, Google's Gemini 3.8 Live is clearly the cheapest major speech-to-speech API, at about $0.005/min of audio in and $0.018/min of audio out, with a free tier. OpenAI's gpt-realtime-2 is the premium reasoning option: $32 in and $64 out per 1M audio tokens. Amazon Nova 2.5 Sonic (Oct 2026) supports Portuguese but has no São Paulo region. For Jair OS's low-spend "Jarvis front door", Gemini Live on the paid tier, or a cascaded STT→LLM→TTS pipeline, is the cost-rational default.

### Cited Findings
**OpenAI**
- `gpt-realtime-2` costs, per 1M tokens: text $4 input, $0.40 cached, $24 output; audio $32 input, $0.40 cached, $64 output; image $5 input. It has a 128K context and 32K max output, takes text/audio/image in and gives text/audio out, and supports configurable reasoning effort ("higher effort can add latency"), function calling and prompt caching. Its only endpoint is `v1/realtime`. Page read 2026-11-23. — [OpenAI gpt-realtime-2 model page](https://developers.openai.com/api/docs/models/gpt-realtime-2)
- The same page lists `gpt-realtime-1.5` at $4 input and $16 output per 1M text tokens. gpt-realtime-2 has the higher text-output price. — [OpenAI gpt-realtime-2](https://developers.openai.com/api/docs/models/gpt-realtime-2)
- `gpt-realtime-mini` costs $0.60/$2.40 per 1M text tokens. Its default snapshot is dated 2025-12-15. — [OpenAI gpt-realtime-mini](https://developers.openai.com/api/docs/models/gpt-realtime-mini.md) (via search snippet)
- [Background, 2025] Original gpt-realtime audio cost $32 in and $64 out per 1M tokens, and mini cost $10/$20. — [heise.de](https://heise.de/-11170104)
- A WebRTC session created through the sessions endpoint bills 15 s of voice at initialization. — [OpenAI realtime costs guide](https://developers.openai.com/api/docs/guides/realtime-costs) (search snippet, not fetched)
- Unverified third-party claims: a "gpt-realtime-2.1" exists, and the original gpt-realtime and gpt-realtime-mini shut down on 2027-01-20. I could not confirm either on OpenAI's pages. — [Cekura blog](https://www.cekura.ai/blogs/openai-realtime-api-pricing)
- OpenAI also lists `gpt-realtime-translate` at $0.034/min. This comes from a search snippet of the pricing page and was not verified, because the fetched pricing page showed only ChatGPT seat plans (it lists GPT-6 Luna and GPT-5.6 Luna as ChatGPT models). — [openai.com/api/pricing](https://openai.com/api/pricing/)

**Google Gemini Live API** (official pricing page, read 2026-11-23)
- `gemini-3.8-live`, `gemini-3.8-live-extended-thinking` and `gemini-3.1-flash-live-preview` cost, per 1M tokens: input $0.75 text, $3.00 audio (≈$0.005/min), $1.00 image/video; output $4.50 text, $12.00 audio (≈$0.018/min). They have a free tier and support Google Search grounding. Audio is billed at 25 tokens/s. — [Google AI Studio pricing](https://aistudio.google.com/docs/pricing)
- `gemini-2.5-flash-native-audio-preview-12-2025` costs $0.50 text and $3.00 audio input, $2.00 text and $12.00 audio output (preview). `gemini-3.5-live-translate-preview` is speech-to-speech translation for 70+ languages at $0.0053/min in and $0.0315/min out. — [Google AI Studio pricing](https://aistudio.google.com/docs/pricing)
- Free-tier usage "may be used to improve Google's products"; paid usage is not. — [Google AI Studio pricing](https://aistudio.google.com/docs/pricing)
- Vertex AI's GA `gemini-live-2.5-flash-native-audio` has a discontinuation date of 2026-12-13. — [Vertex AI docs (pt-BR)](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-live-api?hl=pt-br)
- Conflict: a third-party guide says 3.1 Flash Live Preview and 2.5 Flash Native Audio preview shut down in the Developer API on 2026-11-17. Google's pricing page still listed both on 2026-11-23. — [Cekura](https://www.cekura.ai/blogs/gemini-live-api-pricing) vs [Google pricing](https://aistudio.google.com/docs/pricing)
- Deprecations relevant to any existing Jair OS model IDs: `gemini-2.5-flash` routes to `gemini-3.5-flash-lite` on 2026-12-01, and `gemini-2.5-pro` routes to `gemini-3.8-flash` on 2026-12-01. `gemini-3.8-flash` prices double on 2027-01-01, from $0.75/$3.75 to $1.50/$7.50 per 1M. — [Google pricing](https://aistudio.google.com/docs/pricing)

**Amazon Nova Sonic**
- [Background, Dec 2025] Nova 2 Sonic launched and added Portuguese and Hindi to English, French, Italian, German and Spanish, with polyglot voices. — [AWS What's New, Dec 2025](https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-nova-2-sonic-real-time-conversational-ai) (via search summary)
- Nova 2.5 Sonic launched 2026-10-05 (EOL no sooner than 2027-10-05). It has a 256K context and 64K max output, tool use, asynchronous tool calling, polyglot voices, code-switching, configurable turn detection, streaming transcripts and "lower latency". Regions are us-east-1, us-west-2, eu-north-1 and ap-northeast-1 (no sa-east-1/São Paulo). The default limit is 20 concurrent bidirectional sessions. Pricing is only on the Bedrock pricing page. — [AWS Bedrock model card Nova 2.5 Sonic](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-5-sonic.md)
- Third-party figure: speech tokens at $3/1M in and $12/1M out, "checked Oct 20, 2026", or about $0.015/min per another source. Not verified on AWS's site. — [developersdigest](https://www.developersdigest.tech/voice-agents/amazon-nova-sonic); [TechPlained](https://www.techplained.com/amazon-nova-2)

**Latency**
- No independent 2026 speech-to-speech latency benchmark was found. For cascaded components, a Nov 2026 test measured STT reply p50 at 0.61 s (gpt-transcribe) and 0.62 s (Deepgram Nova-3, file mode), and TTS time-to-first-audio p50 at 0.22 s (ElevenLabs Flash v2.5) and 0.47 s (Gemini 3.8 Flash Lite TTS). — [Stork.AI phone-audio test, 2026-11-12](https://www.stork.ai/blog/pt/speech-to-text-phone-audio-test-2026.md)

### Inferences
- Rough cost, Jarvis front door at 10 min/day × 22 days ≈ 220 min/month with the model speaking about half the time: Gemini 3.8 Live audio ≈ 220×$0.005 + 110×$0.018 ≈ $3/month, plus text and thinking tokens. The same usage on ElevenLabs Agents (A4) is ≈ $17.60 plus LLM. OpenAI gpt-realtime-2 would cost several times more than Gemini at the same token volume, since its audio rates are about 10× and 5× Gemini's per-token rates.
- Do not put student data through Gemini's free tier, because of the product-improvement clause. Use a paid key for anything with student names or grades (LGPD).
- Nova Sonic's lack of a Brazilian region and its AWS-only bidirectional-stream API make it a poor fit for a small personal system.
- The teacher's use cases (post-class debrief, grade dictation) do not need full-duplex speech-to-speech. A push-to-talk cascaded pipeline is cheaper, easier to audit (the transcript is stored) and easier to correct.

### Gaps
- No official OpenAI per-minute audio-token conversion or measured realtime latency was retrieved. The `voice-latency-cost` guide was found but not read.
- Exact Bedrock Nova Sonic pricing and Brazilian Portuguese voice quality were not verified.
- Others (xAI voice, Ultravox, Hume, Kyutai/Moshi) were not researched for lack of search budget.

---

## A2. STT for Brazilian Portuguese (cloud and on-device), including dictated numbers and names

### Takeaway
Current cloud STT leaders are statistically tied: OpenAI `gpt-transcribe` (new in 2026, $0.0045/min), ElevenLabs Scribe v2 ($0.20/h), Gemini 3.5 Transcribe (≈$0.003/min in) and Whisper large-v3. Deepgram Nova-3 trails slightly, and the older `gpt-4o-transcribe` performs poorly, with truncated outputs. No independent 2026 PT-BR benchmark covering dictated numbers and names exists, so Jair OS must run its own 20-clip test. Vocabulary/keyword hints (the class roster) plus LLM post-processing with read-back confirmation are what make "Fulano, sete e meio" reliable.

### Cited Findings
- `gpt-transcribe` costs $0.0045/min. It supports streaming, completed files and Realtime transcription sessions, and accepts "unstructured context, keyword hints, and multiple language hints" for domain terms and code-switching. — [OpenAI gpt-transcribe](https://developers.openai.com/api/docs/models/gpt-transcribe.md). A dated snapshot `gpt-transcribe-20260805` exists. — [OpenRouter](https://openrouter.ai/openai/gpt-transcribe-20260805)
- `gpt-live-transcribe` (streaming) is reported at $0.017/min and whisper-1 at $0.006/min. Third-party figures. — [OpenAI gpt-live-transcribe page](https://developers.openai.com/api/docs/models/gpt-live-transcribe.md) (via search summary); [Memeburn](https://memeburn.com/openai-gpt-transcribe-cuts-ai-audio-costs-in-2026/)
- Gemini transcription models: `gemini-3.5-transcribe` costs $2.00/1M audio in (≈$0.003/min) and $12/1M text out (≈$0.002/min), with language detection, diarization and timestamps. `gemini-3.5-transcribe-live` (WebSocket streaming) costs ≈$0.005/min in and ≈$0.004/min out. Both have a free tier. — [Google AI Studio pricing](https://aistudio.google.com/docs/pricing)
- ElevenLabs STT: Scribe v2 $0.20/h, Scribe v2 Realtime $0.22/h, keyterm prompting +$0.05/h (Realtime +$0.08/h). — [ElevenLabs API pricing (pt)](https://elevenlabs.io/pt/pricing/api)
- Nov 2026 benchmark (Stork.AI, tests run 2026-11-11/12). This is important to caveat: **the audio was English** (Harper Valley Bank caller corpus plus VoxPopuli, English forced), and only the article is in Portuguese. Results on a simulated 8 kHz phone line, with WER, names correct, and "names/digits/addresses" correct:
  - gpt-transcribe 5.5% / 93% / 97.5%, p50 0.61 s, $0.27/h
  - gpt-4o-mini-transcribe 5.5% / 91% / 96.3%
  - Scribe v2 5.9% / 89% / 95.9% ($0.20/h direct)
  - Gemini 3.5 Transcribe 5.9% / 93% / 95.9% (~$0.30/h)
  - Gemini 3.8 Flash 6.0%
  - Whisper large-v3 6.1% / 87% / 95.1%
  - Deepgram Nova-3 7.6% / 82% / 92.7% ($0.26/h pre-recorded, $0.46/h streaming)
  - gpt-4o-transcribe 15.0%, with partial transcripts on 6 of 60 recordings

  The top five are statistically tied (gpt-transcribe 95% CI 3.9–7.4%). — [Stork.AI, 2026-11-12](https://www.stork.ai/blog/pt/speech-to-text-phone-audio-test-2026.md)
- Vendor PT claims, not independent: ElevenLabs reports Scribe at 2.3% WER on FLEURS Portuguese vs Deepgram Nova 2 at 10.5% (old Deepgram model). — [ElevenLabs PT STT page](https://elevenlabs.io/speech-to-text/portuguese). Soniox reports 1.25% WER vs 3.16% for Scribe v2 Realtime on its 2026 Portuguese streaming benchmark. — [Soniox vs ElevenLabs (Portuguese)](https://soniox.com/compare-stt/soniox-vs-elevenlabs/portuguese)
- Deepgram's Portuguese page claims real-time PT STT under 300 ms but publishes no PT accuracy. — [Deepgram Portuguese](https://deepgram.com/product/speech-to-text/portuguese)
- Whisper on PT-BR: no reliable single 2026 leaderboard. Blog figures for large-v3 range from about 5–6% WER on clean audio to 7–10% on lecture or meeting audio, without methodology. A 2026 CPS (São Paulo state tech college) thesis cites Whisper *medium* at ≈11.46% WER on real meeting audio. A PROPOR 2026 paper evaluates Whisper punctuation and capitalization on Museu da Pessoa oral histories. — [novascribe](https://novascribe.ai/pt/como-precisa-e-o-whisper); [CPS 2026 PDF](https://ric.cps.sp.gov.br/bitstream/123456789/47717/1/ads_2026_01_arivaldoagrochafilho_sistemaopensourceparatranscricao.pdf); [PROPOR 2026](https://preview.aclanthology.org/ingest-dnd/2026.propor-1.30.pdf)
- On-device: NVIDIA Parakeet-TDT-0.6B-v3 covers 25 European languages including Portuguese. **NVIDIA notes its training data is European Portuguese while most benchmarks use Brazilian Portuguese.** An MLX port (`parakeet-mlx`, `mlx-community/parakeet-tdt-0.6b-v3`) and Core ML builds (FluidInference, Apache-2.0, run on the Apple Neural Engine) exist. One community table reports int8 with "zero WER loss, 40% smaller, 30% faster". — [Parakeet v3 Core ML (HF)](https://huggingface.co/FluidInference/parakeet-tdt-0.6b-v3-coreml); [parakeet-mlx (PyPI)](https://pypi.org/project/parakeet-mlx/); [whispernotes blog](https://whispernotes.app/blog/parakeet-v3-default-mac-model)
- Gemma 4 E2B, E4B and 12B Unified accept audio input for ASR and speech-to-translated-text. No list of speech languages is published. — [Gemma 4 model card](https://gemma.ai/models/gemma-4/model-card/)
- Apple Intelligence lists "Portuguese (Brazil)" specifically for Notes transcription summaries, voicemail summaries and Live Translation (page published 2026-11-05). — [Apple Support 121115](https://support.apple.com/en-us/121115)

### Inferences
- For grade dictation, the failure modes are name misrecognition and number normalization ("sete e meio" → 7.5, "oito vírgula dois" → 8.2, "dez" vs "dês"). Recommended pattern:
  1. STT with the class roster passed as keyword/context hints (gpt-transcribe "keyword hints" or Scribe keyterms).
  2. An LLM step with a JSON schema {aluno_id, nota, comentário}, constrained to the roster via fuzzy match.
  3. Range validation (0–10, step 0.1 or 0.5).
  4. TTS or on-screen read-back ("Entendi: Fulano 7,5. Confirma?") before any write to Supabase.
- Cost is negligible. At 110 min/month of post-class dictation: gpt-transcribe ≈ $0.50/month, Scribe v2 ≈ $0.37 (+$0.09 keyterms), Gemini 3.5 Transcribe ≈ $0.55. Accuracy and privacy should drive the choice, not price.
- Privacy-first option: run Whisper large-v3-turbo (whisper.cpp/MLX) or Parakeet v3 on the Mac worker so student names never leave the device. Parakeet's European-Portuguese training is a real risk for Rio accents, so A/B test it against Whisper and gpt-transcribe on 20 real clips.
- Avoid `gpt-4o-transcribe` for this use case, because of its silent truncation (6 of 60 in the test).

### Gaps
- No independent 2026 benchmark on **Brazilian Portuguese** audio with numbers and names was found. The Stork test is English audio, and vendor PT numbers are self-reported.
- AssemblyAI Universal (search results mention "AssemblyAI-STT-3.7"), Speechmatics, Soniox and Azure PT-BR accuracy were not verified.
- No measured PT-BR WER for MLX Whisper, whisper.cpp turbo or Parakeet on Brazilian speech was found.

---

## A3. TTS in PT-BR and voice cloning for a teacher-creator (with ethics)

### Takeaway
ElevenLabs now offers v4 ($0.08/1K chars) and v4 Turbo ($0.04/1K), next to v3, and leads on latency (Flash v2.5 TTFA ≈0.22 s). Google's Gemini 3.8 Flash/Flash-Lite TTS is far cheaper per hour but **doubles in price on 2027-01-01**. Ollama added local TTS models in Oct 2026. Cloning the teacher's own voice for content is technically trivial, but should be limited to his own voice, disclosed as AI-generated, and never applied to students.

### Cited Findings
- ElevenLabs TTS per 1K characters: v4 $0.08, v4 Turbo $0.04, v3 $0.08, v3 Conversational $0.04, Multilingual v2 $0.08, Flash/Turbo $0.04. The models cite "90+ languages" without naming PT explicitly on that page. — [ElevenLabs API pricing (pt)](https://elevenlabs.io/pt/pricing/api). ElevenLabs' Portuguese blog announces Eleven v4 as its "most expressive model yet". — [ElevenLabs PT blog](https://elevenlabs.io/pt/blog/ai-voice-agent-pricing-guide) (via search summary)
- Gemini TTS: `gemini-3.8-flash-tts` costs $0.50/1M text in and $9/1M audio out through 2026-12-31, then $1.00 and $18 from 2027-01-01. `gemini-3.8-flash-lite-tts` costs $0.50/$6 through 2026, then $1/$12. Both have a free tier. — [Google AI Studio pricing](https://aistudio.google.com/docs/pricing)
- TTS latency and price (Nov 2026 test; time to first audio p50/p90; price per hour of audio):

  | Model | p50 / p90 | Price per hour |
  |---|---|---|
  | ElevenLabs Flash v2.5 | 0.22 / 0.28 s | $2.37 |
  | ElevenLabs v4 Turbo | 0.29 / 0.45 s | $2.01 |
  | Gemini 3.8 Flash Lite TTS | 0.47 / 0.51 s | $0.54 |
  | OpenAI gpt-4o-mini-tts | 0.64 / 0.77 s | n/a |
  | Gemini 3.8 Flash TTS | 0.68 s | $0.81 |
  | OpenAI tts-1 | 1.20 s | $0.80 |

  — [Stork.AI, 2026-11-12](https://www.stork.ai/blog/pt/speech-to-text-phone-audio-test-2026.md)
- 2026-10-24: "Speech models in Ollama", starting with Phonon from Gradium for "fast multilingual text-to-speech" running locally. — [Ollama blog](https://ollama.com/blog)
- A 2026 AIMultiple TTS comparison exists in Portuguese, but its content was not retrieved. — [AIMultiple PT TTS](https://aimultiple.com/pt/text-to-speech-software)

### Inferences
- For course videos and podcasts in PT-BR, ElevenLabs v3/v4 with a Professional Voice Clone of the teacher himself is the practical quality leader. For bulk, lower-stakes audio (e.g., reading exercise statements), Gemini 3.8 Flash-Lite TTS at about $0.54/h is far cheaper, but budget for the 2027 doubling.
- Ethics guardrails to adopt:
  1. Clone only the teacher's own voice, with written self-consent stored.
  2. Label AI-narrated content as such for students and parents.
  3. Never clone or synthesize students' voices; voice is biometric-adjacent personal data under LGPD, and minors get extra protection (B4).
  4. Disable or limit API access to the cloned voice ID, and protect the account with MFA, so the voice can't be misused for impersonation (e.g., fake WhatsApp audio "from the teacher" to parents).

### Gaps
- No independent PT-BR naturalness ranking (MOS) for 2026 was found. OpenAI's newest TTS models and Cartesia Sonic PT-BR quality were not verified.
- Kokoro and other open TTS PT-BR quality, and Phonon's PT support, were not verified.
- ElevenLabs voice-cloning plan requirements and its consent/verification process were not retrieved this session.

---

## A4. Voice agent frameworks (Pipecat, LiveKit Agents, Vapi, Retell, ElevenLabs Agents, Ultravox) and phone integration in Brazil

### Takeaway
For a self-hosted, low-spend system, use open-source **Pipecat** (BSD-2) or **LiveKit Agents** (Apache-2.0). LiveKit has the larger adoption and handles WebRTC transport for you. For a managed option, ElevenLabs Agents costs a flat $0.08/min plus LLM. Vapi and Retell are closed managed platforms. None of this is needed for the post-class workflow. It matters only if Jair OS adds live voice conversations or a phone line.

### Cited Findings
- Pipecat "hands you the parts" (pipeline you assemble), LiveKit "hands you a room your agent joins" (WebRTC media server included), Vapi is a "managed pipeline you configure by API", and Retell is a "finished phone agent builder". — [DEV Community comparison, 2026](https://dev.to/agdex_ai/best-voice-ai-agent-platforms-and-frameworks-in-2026-livekit-vs-pipecat-vs-vapi-vs-retell-47jk) (via search summary)
- Licenses: LiveKit Agents Apache-2.0, Pipecat BSD-2-Clause. A LiveKit-sourced comparison claims about 400,000 vs 90,000 weekly downloads (Jan 2026). This is vendor-sourced. — [LiveKit field guide](https://livekit.io/field-guides/guide/livekit-vs-pipecat)
- Conflicting version data: one source gives livekit-agents 1.8.10 (2026-10-29, ~15.1k stars), another 1.5.9 (2026-05-13). — [search summary of FutureAGI / LiveKit pages](https://futureagi.com/blog/livekit-alternatives-2026/)
- Unverified claim that Vapi retired its visual workflow builder on 2026-08-18 and that LiveKit shipped a no-code "Agent Builder". — [CloudTalk](https://www.cloudtalk.io/livekit-vs-vapi-ai/)
- ElevenLabs Agents: $0.08/min on all paid plans, $0.16/min for burst above the concurrency limit. Concurrency is Starter 6, Creator 10, Pro 20, Scale 30, Business 40. LLM and telephony are billed separately. — [ElevenLabs agents pricing (fr)](https://elevenlabs.io/fr/pricing/agents); [Stork.AI ElevenLabs Agents pricing 2026](https://www.stork.ai/blog/elevenlabs-agents-pricing-2026). Silent periods over 10 s get a 95% discount. — [ElevenLabs help center](https://elevenlabs.io/docs/pt/help-center/product/eleven-agents/how-much-does-eleven-agents-cost)
- ElevenLabs API page lists "Realtime v1 Mini and v1 Max" agents at $0.08/min connected audio plus LLM usage. — [ElevenLabs API pricing (pt)](https://elevenlabs.io/pt/pricing/api)
- Ollama blog (2026-05-28): "OpenJarvis: a local-first personal AI", an open-source framework for personal agents on your own hardware. — [Ollama blog](https://ollama.com/blog)

### Inferences
- For Jair OS, the voice front door can be a Pipecat pipeline running on the Mac: VAD → gpt-transcribe/Scribe or local Whisper → Claude or a local model with Jair OS MCP tools → ElevenLabs Flash or Gemini TTS. It can be reached through the existing Tailscale network, with no telephony at all, so no Brazilian DID is needed.
- If a phone line for the enrollment concierge is ever wanted, prefer WhatsApp voice or text (B-sections) over PSTN. In Brazil, prospective students already use WhatsApp, and PSTN adds telephony costs and regulatory work.
- OpenJarvis is worth a quick look given the "Jarvis front door" naming and the local-first goal.

### Gaps
- Retell and Ultravox 2026 pricing and features, plus Brazilian phone number provisioning (Twilio/Telnyx/Vonage +55 numbers, Anatel requirements), were not researched (search budget exhausted).
- No PT-BR-specific turn-detection/VAD quality data was found.

---

## A5. Wearables / ambient capture for teachers (Limitless, Plaud, Bee): brief, with privacy around minors

### Takeaway
The ambient-capture market consolidated in 2025: Meta bought Limitless and Amazon bought Bee. Plaud is the main independent left. For a teacher, an always-on recorder in a classroom with minors creates serious LGPD and ECA Digital exposure. Deliberate post-class dictation is the better pattern.

### Cited Findings
- [Background, Dec 2025] Meta acquired Limitless. The pendant stopped selling to new customers, existing users are supported for one year on a free Unlimited plan, and they must accept updated privacy terms. — [BetaNews, 2025-12-08](https://betanews.com/2025/12/08/meta-has-acquired-limitless-a-startup-that-produces-ai-powered-wearables/); [Engadget](https://www.engadget.com/ai/metas-latest-acquisition-suggests-hardware-plans-beyond-glasses-and-headsets-212930339.html)
- [Background, Jul 2025] Amazon acquired Bee, a wrist wearable with mics that summarizes conversations. Privacy was flagged from the outset. Bee's policy said audio isn't stored or used for training. — [eWeek](https://www.eweek.com/news/amazon-acquires-bee-wearable-ai-startup/)
- Plaud is described as the main independent hardware note-taker, leaning into professional workflows and compliance. — [Sacra analysis](https://sacra.com/research/why-meta-bought-limitless/)
- ANPD is, under ECA Digital (Lei 15.211/2025), the autonomous authority for children's and adolescents' rights online. Its staff state LGPD Art. 14 supervisory power over children's data is "fully in effect". — [ANPD 2026 technical note](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/ts-04-2026-nota-tecnica-no-20-2026.pdf/@@display-file/file) (via search summary)

### Inferences
- In the public adult-education school, most students are adults, but recording them still needs a legal basis and transparency. In private tutoring with minors, recording requires specific parental consent (LGPD Art. 14 §1).
- Recommendation: no ambient wearable in class. If recording a tutoring session is valuable (e.g., for a lesson summary to parents), use explicit, per-session, opt-in recording with local transcription on the Mac and auto-deletion of the audio after transcription.

### Gaps
- 2026 status of Plaud and Bee products and privacy terms, and any school-specific ANPD guidance, were not found.

---

## B1. Meta WhatsApp Business Platform policy changes 2025–2026: general-purpose AI ban, Brazil (CADE), AI-provider charges, Meta Business Agent

### Takeaway
Since 2026-01-15, WhatsApp's Business Solution Terms restrict "AI Providers" offering general-purpose assistants. In Brazil, however, CADE's preventive measure forced Meta (Mar 2026) to keep allowing them, while charging AI Providers per service message from 2026-03-11. **Business-specific assistants, such as an enrollment concierge or a tutoring-parent assistant, were never the target and remain allowed.** Jair OS should stay clearly business-scoped and must keep a human-escalation path.

### Cited Findings
- [Background, Oct 2025] Meta added an "AI providers" section to the Business API terms barring general-purpose chatbots. It applied to new users from 2025-10-15 and to all users from 2026-01-15. Affected services named in reporting include ChatGPT, Perplexity, Luzia and Poke. Business bots for support, FAQs or orders are unaffected. — [TechCrunch, 2025-10-18](https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform); [respond.io](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban)
- Meta's AI-provider pricing page: AI Providers are "Providers and developers of artificial intelligence or machine learning technologies" (Terms updated 2026-01-15). They "are only permitted to offer general-purpose AI assistants" where Meta is legally required to allow them. Timeline:
  - 2026-02-16: policy effective; Italy charges start.
  - **2026-03-11: Brazil (+55) and 29 European markets start charges.**
  - 2026-05-13: Italy and EU charges end.
  - 2026-10-15: Türkiye added at no charge.

  Brazil has no end date. AI-provider traffic appears as `pricing_category = AI_BOT` and webhook category `general_purpose_ai`. — [Meta: AI providers pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers)
- The AI-provider rate for Brazil is reported as US$0.0625 per non-template message from 2026-03-11 (Canaltech citing TechCrunch). — [Canaltech, 2026-03-06](https://canaltech.com.br/mercado/whatsapp-libera-ia-de-terceiros-novamente-no-brasil-apos-nova-decisao-do-cade/)
- CADE timeline:
  - Jan 2026: CADE opened an inquiry and issued a preventive measure. The new terms took effect worldwide except Brazil and Italy.
  - Shortly after: the Federal Court (DF) suspended the measure and Meta applied the ban in Brazil.
  - Mar 2026: the CADE Tribunal reinstated the injunction.
  - 2026-03-06: Meta re-allowed third-party AI chatbots in Brazil, "updating its terms and pricing model" where legally required. — [Canaltech, 2026-03-06](https://canaltech.com.br/mercado/whatsapp-libera-ia-de-terceiros-novamente-no-brasil-apos-nova-decisao-do-cade/)
- CADE later unanimously upheld a R$250k/day fine for non-compliance ([Tecnoblog](https://tecnoblog.net/noticias/cade-mantem-multa-diaria-de-r-250-mil-contra-meta/)). A later TecMundo report says the SP Federal Court suspended the fine ([TecMundo](https://www.tecmundo.com.br/mercado/412842-justica-federal-suspende-multa-de-r-250-mil-do-cade-contra-o-whatsapp.htm)). The exact dates and the Nov 2026 status are unresolved, and the sources conflict.
- **Meta Business Agent** ("any non-template message powered by the Meta Business Agent Platform") is charged $2.00 per 1M tokens (input + output, cache not charged). Meta says one message "typically consumes 20,000–25,000 tokens", or about 4–5 US cents per message. It is still charged inside free-entry-point windows. — [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing.md)
- [Background, Jun 2024] Meta announced business AI tests in São Paulo, with Brazil expansion "coming soon". — [Meta Newsroom, 2024-06](https://about.fb.com/news/2024/06/new-ai-tools-meta-verified-and-more-for-businesses-on-whatsapp/). No 2026 Brazil launch announcement for Business AI was found.
- Business Messaging Policy (last updated 2026-09-23):
  - Automation is allowed but "must also have available prompt, clear, and direct escalation paths" (human transfer, phone, email, web, in-store, or form).
  - Opt-in is required.
  - Businesses must not "share or ask people to share full length individual payment card numbers", financial account numbers, **personal ID card numbers** or other sensitive identifiers.
  - Messages for Regulated Verticals may not go to under-18s.

  — [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)

### Inferences
- Jair OS is a business serving its own contacts (prospective students, tutoring parents), not an "AI Provider" offering a general assistant. Keep the bot's system prompt and scope narrow: enrollment, schedules, documents, tutoring logistics. Out-of-scope requests get a polite refusal and a handoff. Monitor the `pricing_category` in analytics to confirm messages never get classified as `AI_BOT`.
- Meta Business Agent at about 4–5¢ per message is roughly 30× more expensive than a self-run Gemini 3.5 Flash-Lite reply (≈$0.0014 for 3K tokens in and 200 out at $0.30/$2.50 per 1M). Self-hosted logic via Supabase and Claude or Gemini is the better fit for "very low model spend".
- **Concrete policy constraint for the enrollment concierge:** do not ask for CPF/RG numbers inside WhatsApp, since "personal ID card numbers" are prohibited. Point to the official enrollment form, the secretariat or in-person delivery of documents.

### Gaps
- The definitive Nov 2026 legal status of CADE v. Meta (fine suspended or not; merits decision) was not established.
- The full text of the 2026-01-15 Business Solution Terms "AI Providers" clause was not read directly.

---

## B2. WhatsApp pricing: per-message model, Oct 2026 changes, Brazil rates, BRL billing, government exemption

### Takeaway
Pricing has been per delivered message since 2025-07-01, and user-to-business messages are free. **Since 2026-10-01, service (free-form) replies are free only up to 1,000 per business phone number per month**, and utility templates inside the 24 h window are charged again. Eligible **government entities are exempt** from service-message charges through 2027-12-31. Brazil billing can move to BRL (rollout since 2026-07-01), with a mandatory migration by 2027-06-30. A Brazil utility template costs about 0.68¢ (≈US$0.0068). Marketing is about US$0.06–0.07 (unofficial figures).

### Cited Findings
- [Background] Per-message pricing since 2025-07-01 by category and recipient country. "Meta does not charge for messages from users to businesses." Volume tiers apply only to utility and authentication, aggregated per business portfolio and reset monthly. — [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- Service messages were free since 2024-11-01. **From 2026-10-01: one free tier of 1,000 delivered service messages per business phone number per month**, with no rollover. Utility messages inside an open customer-service window were free from 2025-07-01, and **Meta resumed charging for them on 2026-10-01**. A payment method was needed on file by 2026-09-30. — [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- **Government / non-profit exemption:** "Service messages remain free beyond the monthly free tier only for eligible government and non-profit organizations", from 2026-10-01 through 2027-12-31. It covers government departments and agencies, inter-governmental organizations, and community non-profits (public health, crisis response, civic engagement). Meta identifies eligible accounts itself: a `paid_exempt` webhook subtype (from 2026-10-12) and the account field `service_pricing_policy = PAID_EXEMPT` (from 2026-10-23). A review-request process is "being built" with no date. — [Meta pricing (md)](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing.md)
- Free entry point: users arriving via Click-to-WhatsApp ads get a window of up to 7 days in which all categories are free, except Meta Business Agent messages. — [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- Pricing calendar: Meta may change prices only on Jan 1, Apr 1, Jul 1 or Oct 1, with 1 month's notice for rate cards, 3 months for add-ons and 6 months for model changes. The 2026-10-01 update changed 40 rates. No Brazil-specific rate change was listed for 2026. — [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- **BRL billing:** rollout began 2026-07-01 for eligible Solution Providers and direct businesses with Brazil as the Sold-To country. All eligible customers could create BRL accounts from 2026-07-16. Non-BRL Brazilian accounts must migrate by 2027-06-30, and messages stop delivering from 2027-07-01. A Currency Migration API has been available since 2026-06-01. — [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- Brazil rates:
  - Meta's page cites "0.68¢ per message" for utility/authentication to Brazil. — [Meta pricing (md)](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing.md)
  - Third-party rate tables conflict: marketing $0.07188, utility/authentication $0.00782, service $0.0068 (SleekFlow, undated) vs marketing $0.0625, utility/authentication $0.0068 (older guide). — [SleekFlow](https://help.sleekflow.io/en_US/pricing); [sent.dm guide](https://docs.sent.dm/docs/guides/whatsapp-pricing)
- 2026 introduced a max-price feature for the Marketing Messages API to cap per-message marketing charges. — [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- [Background] Meta's On-Premises API stopped delivering messages on 2025-10-23. The remaining options are the Cloud API directly, a BSP, or higher-risk connected-account routes. — [YCloud blog (pt)](https://www.ycloud.com/pt/blog/official-vs-unofficial-whatsapp-business-api.md) (via search summary)

### Inferences
- Example monthly volume for Jair OS:
  - 300 enrollment conversations × 3 bot replies = 900 service messages. That stays within the free 1,000 per number, so it costs $0.
  - About 200 utility reminders to tutoring parents ≈ 200 × $0.0068 ≈ $1.40.
  - Marketing broadcasts are the only expensive category (≈ $0.06–0.07 each). Avoid them, or use them sparingly with opt-in.
- If the enrollment concierge runs on **the school's own WABA registered to the public entity**, it may qualify as `PAID_EXEMPT`. Check the `service_pricing_policy` field. If it runs on the teacher's personal or business number, it does not qualify.
- Two separate numbers (school concierge vs private tutoring) are advisable anyway: separate data controllers under LGPD, separate free tiers, separate templates and branding.
- Put "migrate WABA currency to BRL before 2027-06-30" on the Jair OS task list.

### Gaps
- The official Brazil BRL/USD rate card (CSV/PDF) was not opened, so the exact current marketing, utility, authentication and service rates for +55 are unverified.
- The service-message rate above the free tier for Brazil was not found.

---

## B3. WhatsApp Flows, payments (Pix), BSP options in Brazil, unofficial libraries (Baileys/Evolution API/Z-API) and their risks

### Takeaway
Use the **official Cloud API** for anything institutional: directly with Meta, or through a BSP if a UI or inbox is wanted. Pix payments work natively through the Payments API (`order_details` with a dynamic Pix code). Unofficial WhatsApp-Web-protocol gateways (Z-API, Baileys, Evolution API in Baileys mode) are cheaper and template-free but carry ban and compliance risk. They are unacceptable for a public school's number.

### Cited Findings
- **Payments API Brazil:** businesses send an `order_details` interactive message with a unique `reference_id`. Payment methods are dynamic Pix codes (copy into a bank app, or WhatsApp opens it), payment links, boleto, and one-click offsite card. "WhatsApp doesn't support payment reconciliation", so reconcile with your PSP via `reference_id`. — [Meta Payments API Brazil](https://developers.facebook.com/docs/whatsapp/cloud-api/payments-api/payments-br); 360dialog lists Pix code, boleto, payment links and one-click. — [360dialog docs](https://docs.360dialog.com/partner/messaging/commerce-and-payments/payments-api-brazil)
- Unverified single source: Brazil discontinued direct in-chat card payments for new purchases (January, year unclear), while Pix, boleto and links continue. — [Sinch blog](https://sinch.com/pt/blog/whatsapp-pay-noticias-estatisticas-desenvolvimento-pagamentos-moveis/)
- [Background] Twilio added Pix payments via WhatsApp templates in Apr 2025. — [Twilio changelog, 2025-04-16](https://www.twilio.com/en-us/changelog/twilio-pay)
- **Z-API** (own marketing page, undated) says its API is "all based on the web application protocol", emulates a phone, and offers "unlimited messages for a fixed fee" and "any content" without template approval. It also admits that unofficial libraries "as a rule ... immediately get numbers banned", and cites about 2,000,000 users blocked per month for policy violations. Its claims about the official API ("requires at least 15,000 messages/month", "bills in USD", "subscription of hundreds to thousands") contradict Meta's current docs: per-message pricing with no stated minimum, and BRL billing since 2026-07. — [Z-API vs API oficial](https://developer.z-api.io/en/tips/Z-APIvsAPI-OFICIAL.md); [Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- **Baileys** README: "not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp". The maintainers "do not in any way condone the use ... in practices that violate the Terms of Service" and "discourage any stalkerware, bulk or automated messaging usage". About 11.7k stars. — [GitHub WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys)
- A BSP resells the same Cloud API and adds integration support, tools and its own margin or subscription. Zenvia advises always requesting an updated quote. — [YCloud (pt)](https://www.ycloud.com/pt/blog/whatsapp-api-provider-vs-bsp-vs-operating-platform); [Zenvia blog 2026](https://zenvia.com/blog/whatsapp-business-api-o-que-e-como-funciona-e-vantagens-fundamentais-para-empresas/)
- Brazilian BSP and provider lists for 2026 exist (AiSensy top-20; YCloud top-10, including Blip, Zenvia, Twilio, 360dialog and others), but they are vendor-authored. — [AiSensy](https://m.aisensy.com/blog/top-provedores-whatsapp-business-api-brasil/); [YCloud](https://www.ycloud.com/pt/blog/top-whatsapp-business-api-solution-providers-brazil)
- **WhatsApp Flows:** BSP guides (e.g., Wati) show drag-and-drop Flow builders with templates ("Geração de Leads", "Formulário de Feedback"). Submissions are stored as JSON per flow plus per-field attributes. — [Wati support (pt-BR)](https://support.wati.io/pt-BR/articles/11463180-como-criar-e-usar-whatsapp-flows-no-wati). An n8n tutorial shows a school-enrollment WhatsApp agent that collects name, grade and course, stores them in a DB, confirms with the guardian, and hands off to staff. — [Hora de Codar](https://horadecodar.com.br/agente-escolas-n8n-whatsapp/)

### Inferences
- Recommended stack for Jair OS: Meta Cloud API directly, with webhooks into a Supabase Edge Function. Use it for both numbers. This avoids BSP margins and keeps data in Jair OS's own backend. Add a BSP only if a shared human inbox for school staff is required (Blip, Zenvia, 360dialog or Twilio; get quotes).
- Use a WhatsApp Flow for the enrollment pre-screening form: course or level of interest, preferred shift, contact preference, and LGPD notice acknowledgment. Avoid CPF/RG fields (B1 policy).
- For tutoring, use `order_details` with a dynamic Pix code generated by a PSP (e.g., a Pix-enabled bank API), and reconcile by `reference_id` in Supabase.
- Evolution API is acceptable only in its official Cloud API mode, not Baileys mode. It was not verified this session that Evolution API supports both modes; see Gaps.

### Gaps
- No 2026 BSP fee comparison (Blip, Zenvia, Twilio, 360dialog per-message markups) was retrieved.
- Evolution API's 2026 feature and mode status, and any documented 2026 ban waves in Brazil, were not verified (search budget).
- Official WhatsApp Flows limits and Brazil education examples from Meta were not found.

---

## B4. Best practices: enrollment concierge (public school) and tutoring-parent assistant (templates, opt-in, LGPD consent, human handoff)

### Takeaway
Compliance comes from six things: narrow scope, documented opt-in, an LGPD notice at the first message, no sensitive identifiers in chat, a visible human-escalation path, and parental consent for minors' data in tutoring. The public-school concierge should be run with, and ideally on behalf of, the school as data controller.

### Cited Findings
- WhatsApp policy requires opt-in permission before contacting people, and the business chooses the opt-in method and meets notice requirements. Free-form replies are allowed only inside the 24 h window; outside it, only approved templates. Automation must offer prompt, clear, direct escalation to a human. — [WhatsApp Business Messaging Policy, updated 2026-09-23](https://whatsappbusiness.com/policy/)
- Personal ID card numbers and other sensitive identifiers must not be requested in chat. — [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/)
- LGPD Art. 14 safeguards for children's and adolescents' data are in force, and ANPD supervises them. A 2026 ANPD document cites Art. 14 §1 parental-consent rules as the basis for consent-verification improvements. ECA Digital (Lei 15.211/2025) made ANPD the autonomous authority for children's digital rights. — [ANPD TS-04/2026 Nota Técnica 20/2026](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/ts-04-2026-nota-tecnica-no-20-2026.pdf/@@display-file/file) (via search summary)
- An academic article argues that ECA + Marco Civil + LGPD + ECA Digital reshape school management's legal responsibilities, with the MEC connected-schools strategy increasing public-school data collection. — [Revista UFG Interação](https://revistas.ufg.br/interacao/article/download/86228/45744/446331)
- Practitioner advice: build the enrollment bot at least two weeks before enrollment opens, not in the opening week. — [SocialHub blog](https://www.socialhub.pro/blog/chatbot-para-escola-e-curso/)

### Inferences
Enrollment concierge design:
1. Use the school's official number and WABA (ask the school or secretaria about `PAID_EXEMPT`).
2. The first reply carries a short LGPD notice with a link to the privacy notice (controller = the school), states that a bot answers, and explains how to reach a human.
3. Keep the scope to FAQ (courses, ages and eligibility, documents list, calendar, address, shifts). Flows can capture interest and shift.
4. Hand off to a human for exceptions, transfers, special needs and any complaint.
5. Never ask for CPF/RG or document photos in chat. Point to the official channel.
6. Use utility templates for "enrollment window opened" or "missing document" reminders, sent only to people who opted in.
7. Keep a conversation log in Supabase with a retention limit (e.g., delete or anonymize after the enrollment cycle).

Tutoring-parent assistant:
1. Get a written opt-in plus specific parental consent for processing the child's data (Art. 14 §1).
2. Send per-session summaries only to the consenting guardian.
3. Use the Pix `order_details` flow for invoices.
4. Keep minors' data minimal (first name, grade, topics).
5. Route anything about behavior, health or conflicts to the teacher personally.

Use the local model (C3) to redact or classify inbound messages before sending them to cloud LLMs.

### Gaps
- No ANPD guidance specific to schools or education chatbots was found. A Brazilian legal opinion on whether a public school may delegate WhatsApp enrollment triage to an individual teacher's system was not found. This is an institutional question to raise with the school administration.
- The LGPD Art. 7/11/14 text was not re-read this session (cited only through ANPD documents).

---

## C1. Best open-weight models for Apple Silicon and consumer Windows PCs (late 2026): Portuguese quality and tool calling

### Takeaway
The 2026 defaults by memory tier:

| Memory | Default models |
|---|---|
| 32–64 GB | **Qwen3.6-35B-A3B** (Apache-2.0, 3B active, strong agentic/tool scores) and **Gemma 4 26B-A4B or 31B** (Apache-2.0, native function calling, MMMLU 86–88) |
| 16 GB | Gemma 4 E4B or 12B, Qwen3.5-9B |
| 8 GB / classifiers | Gemma 4 E2B, Qwen3.5-4B |
| 128 GB | gpt-oss-120b or DeepSeek V4-Flash (heavily quantized) |

No current Brazilian-Portuguese leaderboard places these models side by side, so a small in-house PT-BR eval is needed.

### Cited Findings
- **Qwen3.6-35B-A3B:** sparse MoE, 35B total and 3B active, Apache-2.0. Reported release 2026-04-02 (secondary source). Tool calling uses the `qwen3_coder` parser in SGLang. Model card benchmarks: Tool Decathlon 26.9, MCPMark 37.0, SWE-bench Verified 73.4. A "thinking preservation" option keeps reasoning context across turns. — [NYU Shanghai RITS summary](https://rits.shanghai.nyu.edu/ai/qwen3-6-35b-a3b-alibaba-open-sources-a-frontier-class-agentic-coder/); [Unsloth GGUF card](https://huggingface.co/unsloth/Qwen3.6-35B-A3B-GGUF)
- Qwen 3.7-Max and 3.8-Max previews are "API-only — no open weights" (as of Jul 2026). — [InsiderLLM, updated 2026-07-23](https://insiderllm.com/guides/best-local-llms-mac-2026/). Conflict: another guide names a "Qwen3.8-27B" for 36 GB Macs. — [openclawdc](https://openclawdc.com/blog/best-local-llm-macbook/) (unverified)
- **Gemma 4** (launch blog, April 2026):
  - Sizes: E2B, E4B, 12B Unified, 26B A4B MoE (~3.8B active) and 31B Dense.
  - Context: 128K for E2B/E4B, 256K for the others.
  - Native structured tool use and function calling.
  - Language: "out-of-the-box support for 35+ languages, pre-trained on 140+".
  - Audio input on E2B, E4B and 12B.
  - **Apache 2.0**.
  - MMMLU (multilingual MMLU): 31B 88.4, 26B A4B 86.3, 12B 83.4, E4B 76.6, E2B 67.4, vs Gemma 3 27B 70.7.

  — [Gemma 4 model card](https://gemma.ai/models/gemma-4/model-card/); [Google blog: Gemma 4](https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/?hl=th)
- Mac tier recommendations (InsiderLLM, updated 2026-07-23):

  | Memory | Models and approximate speed |
  |---|---|
  | 8 GB | Gemma 4 E2B (30–45 tok/s), Qwen 3.5 4B, Phi-4 Mini 3.8B |
  | 16 GB | Qwen 3.5 9B Q4 (20–40 tok/s), Gemma 4 E4B, DeepSeek-R1-Distill-Qwen-8B |
  | 24 GB | Qwen 3.6-27B Q4 (18–28 tok/s), Mistral Nemo 12B |
  | 32–48 GB | Qwen 3.6-35B-A3B Q4 (35–55 tok/s; "2026 default"), Gemma 4 26B-A4B (30–45), Gemma 4 31B (18–28) |
  | 96–128 GB | Llama 4 Scout, DeepSeek V4-Flash IQ2 (27–34 tok/s), Qwen3 235B-A22B |

  Qwen 3.6-35B-A3B Q4 on an M4 Max runs at about 45–55 tok/s in MLX-LM, 40–50 in Ollama and 40–55 in LM Studio. — [InsiderLLM](https://insiderllm.com/guides/best-local-llms-mac-2026/)
- gpt-oss-120B reported at 79.7 tok/s on an M5 Max (third-party). — [Pinggy blog](https://pinggy.io/blog/top_5_local_llm_tools_and_models/). [Background, Aug 2025] gpt-oss models arrived in Ollama, and gpt-oss-safeguard 20B/120B (safety-classification reasoning models, Apache-2.0) followed on 2025-10-29. — [Ollama blog](https://ollama.com/blog)
- Other 2026 open models on Ollama: NVIDIA Nemotron 3.5 Lightning (30B, 3B active, "built for long-running, tool-using agents on local hardware", 2026-08-11); Muse Glimmer from Meta Superintelligence Labs (30B multimodal, Apache-2.0, MLX-accelerated, 2026-08-10); Reflection Beam (2026-10-16); Cloudflare Clef 27B decision model (2026-10-19). — [Ollama blog](https://ollama.com/blog)
- Portuguese evaluation resources:
  - PoETa v2: 40+ PT tasks, 20+ models. — [arXiv 2511.17808](https://arxiv.org/html/2511.17808v2)
  - CLARIN-PT-LDB: European-PT leaderboard, PROPOR 2026. — [arXiv 2603.12872](https://arxiv.org/abs/2603.12872)
  - Open PT LLM Leaderboard (PT-BR, includes ENEM): its latest visible update is from 2025.
  - Tucano 2 (Mar 2026): open PT models of 0.5–3.7B that claim to beat similar-size multilingual models on PT benchmarks. — [arXiv 2603.03543](https://arxiv.org/html/2603.03543)

### Inferences
- For a Mac "Local AI Worker" with 16 GB, use Gemma 4 E4B (or 12B if memory allows) as the general PT-BR worker. It covers audio, tool calling and Apache-2.0 licensing. Use Qwen3.5-4B or Gemma 4 E2B for fast classification.
- With ≥32 GB, Qwen3.6-35B-A3B is the strongest local agent and tool caller, and Gemma 4 26B-A4B is the alternative with likely better PT fluency. That is inferred from Gemma's multilingual focus and MMMLU, not measured on PT-BR.
- Windows PCs without large GPUs: use the same small models (Gemma 4 E2B/E4B, Qwen3.5-4B/9B) via Ollama or Foundry Local.
- Build a 30-item PT-BR eval from real Jair OS tasks (classify a WhatsApp message, extract grades from a transcript, redact names, route to a workflow) and score candidate models. This matters more than public leaderboards.

### Gaps
- No 2026 PT-BR head-to-head scores (ENEM/PoETa) for Qwen3.6 vs Gemma 4 vs gpt-oss were retrieved.
- Mistral Small/Magistral 2026 versions, Phi-5 (if any) and Llama 2026 releases were not researched.
- Consumer Windows GPU throughput numbers were not retrieved.

---

## C2. On-device platforms and runtimes: Apple Foundation Models / Apple Intelligence, Windows AI Foundry / Foundry Local, Ollama, LM Studio, MLX

### Takeaway
2026 made local inference much easier on both platforms.
- **Apple** shipped a rebuilt on-device model with better tool calling, a Python SDK, an `fm` CLI in macOS 27, and free Private Cloud Compute (PCC) for small developers.
- **Ollama** moved to MLX on Apple Silicon, added Anthropic-API compatibility (Claude Code and Claude Desktop with local models), TTS models and per-token cloud plans, and offers an opt-out for cloud routing.
- **Windows** has Foundry Local, an OpenAI-compatible local server for any hardware.

### Cited Findings
- **Apple Foundation Models (WWDC26 session 241):**
  - New on-device model, "rebuilt from the ground up ... better at logic and tool calling", with an 8,192-token context and image input.
  - Context and token-count APIs since iOS/macOS 26.4.
  - `PrivateCloudComputeLanguageModel` with a 32K context and reasoning levels; "no prompts are ever stored"; **"no cloud API costs to developers who have less than 2 million first time downloads"** (entitlement required).
  - A `LanguageModel` protocol so Anthropic and Google Swift packages plug in (you handle auth and billing).
  - The framework goes **open source**, including `MLXLanguageModel` and `CoreAILanguageModel`, and can run "everywhere Swift runs, including Linux servers".
  - **Python SDK `apple_fm_sdk`**; **`fm` command-line tool in macOS 27**.
  - Built-in `OCRTool`, `BarcodeReaderTool` and a Spotlight search tool for fully local RAG.
  - Dynamic Profiles to switch model per branch, with the advice to consider "privacy boundaries, model capabilities, and cost".
  - An Evaluations framework.

  — [Apple WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241/)
- Apple Intelligence languages include Portuguese (main list just "Portuguese"; several features specify "Portuguese (Brazil)"). Requires a Mac with M1 or later. Page published 2026-11-05. — [Apple Support 121115](https://support.apple.com/en-us/121115)
- WWDC26 session 232 covers running agentic AI on a Mac with MLX. — [Apple WWDC26 session 232](https://developer.apple.com/videos/play/wwdc2026/232/)
- **Microsoft Foundry on Windows** has three layers:
  - Windows AI APIs: built-in models, Copilot+ PCs (docs say only Copilot+; a dev page says preview beyond Copilot+, so the sources conflict).
  - **Foundry Local**: SDK generally available; runs 20+ open-source models via an OpenAI-compatible REST API on any Windows hardware.
  - Windows ML: ONNX Runtime for your own models.

  — [Microsoft Foundry on Windows](https://developer.microsoft.com/windows/ai/); [Microsoft Learn overview](https://learn.microsoft.com/en-us/windows/ai/overview)
- **Ollama 2026 timeline** (official blog):

  | Date | Change |
  |---|---|
  | 2026-01-15 | Codex CLI support |
  | **2026-01-16** | **Anthropic Messages API compatibility (Claude Code with open models)** |
  | 2026-01-23 | `ollama launch` (one-command setup for Claude Code, OpenCode, Codex) |
  | 2026-02-16 | Subagents and web search in Claude Code |
  | 2026-03-30 | MLX on Apple Silicon (preview) |
  | 2026-05-28 | OpenJarvis local-first personal AI |
  | 2026-06-05 | Ollama 0.30 adds llama.cpp-based GGUF |
  | 2026-06-11 | Highest-performance MLX engine |
  | 2026-06-29 | Faster Gemma 4 on MLX with multi-token prediction (Ollama 0.31) |
  | 2026-07-09 | $88M funding, 8.9M developers |
  | **2026-08-25** | **Claude Desktop can use Ollama as a gateway for open models** |
  | 2026-08-31 | Cloud plans (Pro/Max/Team) move to per-token pricing |
  | 2026-10-24 | Speech (TTS) models |
  | 2026-11-16 | Prefix caching and routing for long-horizon agent workloads |

  [Background 2025: cloud models preview 2025-09-19, web search API 2025-09-24, new app for macOS/Windows 2025-07-30, tool-call streaming 2025-05-28, structured outputs Dec 2024.] — [Ollama blog](https://ollama.com/blog)
- Ollama reportedly makes MLX the default for supported architectures from v0.40.0, and `OLLAMA_NO_CLOUD=1` (from v0.16.2) disables all cloud model routing. Both come from secondary changelog aggregators, and version numbering conflicts across sources. — [search summary of releasebot / insiderllm](https://insiderllm.com/guides/ollama-0-17-new-features/)
- No MCP-specific Ollama release was found. MCP is handled by the client (Claude Desktop/Code, LM Studio, etc.). — [Ollama blog](https://ollama.com/blog)
- Practitioner debate: an AI Indigo review says Ollama is "still the best choice for 90% of users", with an MLX speed advantage that is negligible for chat. A YouTube video ("Finally, The CORRECT Way to Run Local AI on a Mac") argues oMLX beats Ollama and LM Studio for pro workflows (third-party summary only). — [AI Indigo](https://aiindigo.com/blog/local-llms-is-ollama-still-the-best-choice-for-mac-users); [videohighlight summary](https://videohighlight.com/v/JpJaEPGzPF4)

### Inferences
- Mac Local AI Worker stack: Ollama (MLX backend) as the single local inference server, exposing an OpenAI/Anthropic-compatible endpoint over Tailscale to Supabase Edge Functions and the Jair OS MCP server.
- Set `OLLAMA_NO_CLOUD=1` on the worker that touches student data, so "local" really means local.
- Optionally use Apple's `apple_fm_sdk` or `fm` CLI (once on macOS 27) for zero-cost on-device extraction and OCR. Apple's on-device model is free, but its 8K context and unverified PT-BR quality limit it to short tasks.
- Windows PCs: Foundry Local or Ollama for small models. Windows AI APIs only if a PC is a Copilot+ PC.
- Ollama's Anthropic-API compatibility lets the same Claude-based Jair OS tooling route cheap sub-tasks to local models with minimal code changes.

### Gaps
- Apple's on-device model language list (whether it officially covers PT-BR for developers) was not confirmed.
- LM Studio's 2026 features (MCP host, headless server, MLX engine) were not researched.
- Foundry Local's current model catalog (whether it includes Gemma 4 or Qwen3.6) was not verified.

---

## C3. What a local worker should do vs cloud; hybrid routing; LGPD privacy benefits for student data

### Takeaway
Keep raw student data local: audio of dictations, names with grades, inbound WhatsApp text for redaction and classification, OCR of handwritten work, and embeddings of student records. Send only redacted or aggregated context to cloud models for heavy reasoning and content generation. Use a rule-plus-classifier router with a privacy tag on every task.

### Cited Findings
- Apple explicitly frames Dynamic Profiles as switching model per task with attention to "privacy boundaries, model capabilities, and cost", and offers built-in on-device OCR and Spotlight-based local RAG tools. — [Apple WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241/)
- [Background, 2025] Ollama published "Minions" (Feb 2025: small on-device models collaborating with larger cloud models to shift workloads) and "Secure Minions" (Jun 2025: encrypted local-remote collaboration protocol from Stanford Hazy Research). — [Ollama blog](https://ollama.com/blog)
- Gemini free-tier data "may be used to improve Google's products", but paid usage is not. — [Google AI Studio pricing](https://aistudio.google.com/docs/pricing)
- Apple PCC: "No prompts are ever stored", verifiable by independent researchers. — [Apple WWDC26 session 241](https://developer.apple.com/videos/play/wwdc2026/241/)
- ANPD supervision of children's data (Art. 14) is in force, and ECA Digital adds child-specific digital obligations. — [ANPD 2026 note](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/ts-04-2026-nota-tecnica-no-20-2026.pdf/@@display-file/file)
- `gpt-oss-safeguard` (Oct 2025) is an open safety-classification reasoning model usable for local policy checks. — [Ollama blog](https://ollama.com/blog)

### Inferences
Suggested split:

| Local (Mac worker or Windows) | Cloud |
|---|---|
| STT of private audio (Whisper/Parakeet) | Long-form lesson and content generation |
| PII detection and redaction (names, CPF, phone) before cloud calls | Complex multi-step planning |
| Intent classification and routing of WhatsApp messages and voice commands | Final polished parent communications (after redaction) |
| Grade extraction and roster matching | Realtime voice (Gemini Live) when the debrief has no sensitive content |
| Embeddings for Supabase pgvector (e.g., a small multilingual embedding model via Ollama) | Hard reasoning |
| OCR of worksheets (Apple OCRTool or Vision) | |
| Duplicate detection, summarization of private notes | |

Router logic:
1. Tag each task {contains_minor_data, contains_PII, needs_reasoning_depth, latency_budget}.
2. If it contains minor or PII data, run local or redact first.
3. If needs_reasoning_depth is high and the data is redacted, use the cloud (Claude/Gemini).
4. If the local model's confidence is low, escalate to the cloud with redacted input.
5. Log the routing decision in Supabase for auditability (LGPD accountability).

This also directly supports the "very low model spend" goal: classification and extraction volume moves to $0 marginal cost.

### Gaps
- No 2026 benchmark of local PII-redaction quality in PT-BR was found. Embedding-model recommendations (multilingual-e5, bge-m3, embeddinggemma, etc.) for PT-BR were not researched this session.

---

## C4 (all areas). Practitioner videos and talks from 2026

### Takeaway
Official and conference sessions are the most reliable dated videos found. The search budget prevented a fuller YouTube survey, especially for WhatsApp/Brazil content.

### Cited Findings
- Apple WWDC26 session 241, "What's new in the Foundation Models framework" (Erik Hornberger, Zhen Li). — [developer.apple.com](https://developer.apple.com/videos/play/wwdc2026/241/)
- Apple WWDC26 session 232: agentic AI on Mac with MLX, with setup demos. — [developer.apple.com](https://developer.apple.com/videos/play/wwdc2026/232/)
- AI Engineer Europe 2026: "Engineering voice agents: Latency, quality, and scale" (discusses orchestrators such as Pipecat and LiveKit). — [ai.engineer](https://ai.engineer/talks/engineering-voice-agents-latency-quality-and-scale)
- LiveKit's video page lists dated videos from late 2025 to Feb 2026. — [LiveKit blog/video](https://livekit.com/blog/video)
- [Background 2025] AI Engineer World's Fair 2025 workshop "Realtime Voice AI" (Mark Backman, Daily/Pipecat). — [ai.engineer](https://ai.engineer/talks/full-workshop-realtime-voice-ai-mark-backman-daily)
- YouTube "Finally, The CORRECT Way to Run Local AI on a Mac" (oMLX vs Ollama/LM Studio; third-party summary, reportedly June 2026). — [videohighlight](https://videohighlight.com/v/JpJaEPGzPF4)
- A video on local AI on a Mac with LM Studio + Qwen + Hermes custom endpoint, dated 2026-10-21. — [openclawdatabase](https://openclawdatabase.com/news/videos/2026-10-21-local-ai-on-a-mac-lm-studio-qwen-hermes-custom-endpoint/)
- PyCon US 2026 has a scheduled presentation (#101) surfaced by a voice-agent query. Its content was not verified. — [us.pycon.org](https://us.pycon.org/2026/schedule/presentation/101/)

### Inferences
- For a teacher-builder, the WWDC26 sessions (241, 232) and the AI Engineer voice-agent talk are the highest-signal watch list. Brazilian WhatsApp/BSP YouTube content is abundant but mostly vendor marketing.

### Gaps
- No dated 2026 YouTube videos specifically on WhatsApp Cloud API + AI agents in Brazil, PT-BR STT comparisons, or Gemma 4/Qwen3.6 in Portuguese were verified (search budget exhausted).

---

## Concrete recommendations for Jair OS (synthesis of the above)

### Takeaway
1. **Voice:** make "post-class by voice" a push-to-talk, non-realtime pipeline (STT → structured extraction → read-back → Supabase), with a local-first option on the Mac.
2. **WhatsApp:** official Cloud API only, two separate numbers, business-scoped bots with human handoff and no ID numbers in chat.
3. **Local models:** reactivate the Mac Local AI Worker with Ollama (MLX) and Gemma 4 / Qwen3.6 for redaction, routing, classification and STT, sending only redacted context to the cloud.

The expected incremental spend is a few US dollars per month.

### Cited Findings
- STT costs: gpt-transcribe $0.0045/min ([OpenAI](https://developers.openai.com/api/docs/models/gpt-transcribe.md)); Scribe v2 $0.20/h ([ElevenLabs](https://elevenlabs.io/pt/pricing/api)); Gemini 3.5 Transcribe ≈$0.003/min in ([Google](https://aistudio.google.com/docs/pricing)).
- Realtime: Gemini 3.8 Live $0.005/min in, $0.018/min out ([Google](https://aistudio.google.com/docs/pricing)); ElevenLabs Agents $0.08/min ([ElevenLabs](https://elevenlabs.io/fr/pricing/agents)).
- WhatsApp: 1,000 free service messages per number per month since 2026-10-01; government exemption through 2027-12-31; BRL migration by 2027-06-30; Meta Business Agent ≈4–5¢ per message ([Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing.md)). No ID numbers in chat; human escalation required ([WhatsApp policy](https://whatsappbusiness.com/policy/)).
- Local: Ollama Anthropic-API compatibility and MLX ([Ollama blog](https://ollama.com/blog)); Gemma 4 Apache-2.0 with function calling and audio ([Gemma 4 card](https://gemma.ai/models/gemma-4/model-card/)); Apple `apple_fm_sdk`, `fm` CLI and free PCC ([WWDC26 241](https://developer.apple.com/videos/play/wwdc2026/241/)).

### Inferences
Prioritized actions:
1. **Audit model IDs** before 2026-12-01: any `gemini-2.5-flash` or `gemini-2.5-pro` usage gets silently rerouted. Budget for Gemini 3.8 Flash and TTS price doubling on 2027-01-01.
2. **Post-class by voice v2:**
   - Phone or Mac push-to-talk recording goes to the Mac worker.
   - Local Whisper large-v3-turbo or Parakeet v3, A/B tested on 20 real PT-BR clips. Fall back to gpt-transcribe with roster keyword hints.
   - Extraction to JSON with a local Gemma 4 or Qwen model, then roster fuzzy-match and 0–10 validation.
   - Read-back confirmation, then write to Supabase.
   - Delete the audio after N days.
3. **Grade dictation:** the same pipeline with a strict grammar ("<nome>, <nota>") and number normalization tests ("sete e meio", "oito vírgula cinco", "dez"). Always confirm before committing.
4. **Jarvis front door:** start text-first via the MCP server. If voice is wanted, use a Pipecat pipeline (cascaded) on the Mac via Tailscale. Use Gemini 3.8 Live (paid tier) only for non-sensitive conversations.
5. **Windows voice worker** (previously revoked): do not revive always-on listening. If needed, use push-to-talk with local whisper.cpp and Foundry Local or Ollama, with explicit user activation.
6. **WhatsApp enrollment concierge:**
   - Use the school's official WABA if possible (check `PAID_EXEMPT`).
   - LGPD notice at first contact; Flows for non-sensitive pre-screening; no CPF/RG in chat.
   - Human handoff; utility templates for reminders.
   - Monitor for `AI_BOT` classification.
7. **Tutoring parents:** a separate number; written opt-in plus parental consent; Pix `order_details` invoices reconciled via PSP; session summaries sent only to the consenting guardian.
8. **Avoid** Baileys, Z-API and Evolution in Baileys mode for any institutional number.
9. **Mac Local AI Worker** (reactivate):
   - Ollama + MLX with `OLLAMA_NO_CLOUD=1`.
   - Models: Gemma 4 E4B or 12B (16 GB) or Qwen3.6-35B-A3B and Gemma 4 26B-A4B (≥32 GB). Add a small embedding model for pgvector.
   - Expose an OpenAI/Anthropic-compatible endpoint over Tailscale. Register "local" tools in the MCP server (redact, classify, extract_grades, transcribe).
10. **Content voice:** an ElevenLabs v3/v4 clone of the teacher's own voice only, labeled as AI, with the voice ID locked down. Never synthesize student voices.
11. **No ambient wearables** in classrooms or tutoring with minors.

### Gaps
- The Mac's RAM and the Windows PCs' GPUs are unknown to this researcher, so model-tier choices must be confirmed against the actual hardware.
- Whether the public school will act as data controller and own the WABA is an institutional decision outside this research.
