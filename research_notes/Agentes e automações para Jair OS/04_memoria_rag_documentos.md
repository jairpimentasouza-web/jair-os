# Agent memory, RAG, context engineering and document AI (STEM/PDF): state of the art as of November 2026, with implications for Jair OS

Research date: 2026-11-23. Date convention: every finding gives the date of the source or event. **[BG]** marks pre-2026 background. Most benchmark numbers are **vendor-reported** unless marked otherwise. Sources often disagree on dates and scores, and those conflicts are noted where they show up.

---

## 1. Agent memory in 2026: products, benchmarks and design patterns worth building in Postgres

### Takeaway
By late 2026, memory is its own architectural layer with its own benchmarks (LoCoMo, LongMemEval, BEAM). The top systems report 90%+ on LoCoMo and LongMemEval, but nobody has independently reproduced those scores. The design pattern most worth copying is Anthropic's November 2026 four-layer hierarchy plus an offline consolidation pass. The layers are transcripts, then memory notes with verification, then a wiki-like representation, then a small injected context. That pass ("dreaming") corrects, links, promotes and prunes notes. Mem0's 2026 approach also maps directly onto Supabase: single-pass ADD-only extraction, entity linking instead of a graph DB, and semantic + BM25 + entity fusion.

### Cited Findings
**Benchmarks (definitions)**
- LoCoMo has 1,540 questions covering single-hop, multi-hop, open-domain and temporal recall. LongMemEval has 500 questions and adds two categories LoCoMo does not score: **knowledge updates** and **abstention**. BEAM runs to 1M and 10M-token conversations (described 2026). — [Mem0: AI Memory Benchmarks 2026](https://mem0.ai/blog/ai-memory-benchmarks-in-2026); [Mem0 State of AI Agent Memory 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)
- Mem0's own post says results vary with dataset version, answer model, top-k, reranking, prompt format and judge model. It adds that recall-only scores run higher than end-to-end scores. — [Mem0 State of 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)

**Mem0**
- [BG, Apr 2025] Mem0 paper (arXiv:2504.19413, ECAI 2025) compared ten memory approaches. It reports roughly 26k tokens per conversation for the full-context baseline. — [Mem0 State of 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)
- **April 2026 algorithm (self-reported):** LoCoMo 92.5, LongMemEval 94.4, BEAM-1M 64.1, BEAM-10M 48.6, at about 6.7k–7k tokens per retrieval call. Gains over the previous algorithm were +29.6 points on temporal queries and +23.1 on multi-hop. The post is dated Apr 1, 2026, updated Oct 10, 2026, with conflicting metadata. — [Mem0 State of 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026); [mem0 GitHub README](https://github.com/mem0ai/mem0)
- Earlier 2026 figures of 91.6 LoCoMo and 93.4 LongMemEval circulate and appear to be an earlier version of the same algorithm. — [Mem0 benchmarks post](https://mem0.ai/blog/ai-memory-benchmarks-in-2026)
- **2026 design changes:**
  - External graph stores were replaced by built-in **entity linking**. Entities live in a parallel collection and boost matching memories, and the `relations` field was removed.
  - Extraction is **single-pass, ADD-only**, and agent-generated facts are stored alongside user-stated facts.
  - Retrieval fuses **semantic similarity + BM25 + entity matching** into one score, with optional reranking.
  - Source: [Mem0 State of 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)
- As cited by Mem0 (competitor numbers, not independently verified):
  - Zep: LoCoMo 80.32% at 189 ms (up to ~83% depending on configuration), LongMemEval 71.2 (GPT-4o).
  - Letta: LoCoMo 74.0 (gpt-4o-mini, filesystem storage).
  - OpenAI Memory: LoCoMo 52.9, which Mem0 itself flags as unconfirmed.
  - Source: [Mem0 State of 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)

**Zep / Graphiti**
- [BG, Jan 2025] Zep paper (arXiv:2501.13956) describes a **bi-temporal** model: timeline T is the chronological order of events, and T′ is the order in which Zep ingested the data. It reports beating MemGPT on DMR and LongMemEval. — [arXiv 2501.13956](https://arxiv.org/abs/2501.13956)
- Graphiti (open source) builds temporal context graphs. Edges carry validity metadata, and retrieval combines semantic + keyword + graph traversal. It ships an **MCP server** for Claude and Cursor. README referenced "as of March 2026". — [getzep/graphiti](https://github.com/getzep/graphiti)

**Letta (ex-MemGPT)**
- [BG, Apr 21 2025] Sleep-time compute (Letta + UC Berkeley, arXiv:2504.13171) uses idle time to pre-process context. It reports about 5× less test-time compute at matched accuracy on Stateful GSM-Symbolic and Stateful AIME. — [Letta blog](https://letta.com/blog/sleep-time-compute); [arXiv 2504.13171](https://arxiv.org/html/2504.13171v1)
- Sleep-time agents share memory blocks with the primary agent, edit them asynchronously, and are enabled with `enable_sleeptime`. Docs still label the feature experimental (accessed 2026). — [Letta docs](https://docs.letta.com/guides/agents/architectures/sleeptime/index.md)
- On Mar 16, 2026, Letta made **Letta Code** its flagship and changed its memory architecture, moving toward a model-agnostic runtime. Letta's site mentions git-tracked context ("MemFS") and "Skill Learning" (undated; secondary source). — [Latent Space wiki on Letta](https://latent.space/wiki/letta-ai-558a42a5/); [Letta site](https://letta.com/agent/)

**Anthropic guidance: "The components of agent memory" (Nov 6, 2026), the most relevant source for Jair OS**
- **Four layers:**
  1. Transcripts (a searchable event log).
  2. Memory notes (rules, verified facts, warnings).
  3. Memory representations (e.g., wikis with linked pages).
  4. Injected context (loaded into every session).
  - Anthropic excludes compaction from "memory". — [Anthropic, components of agent memory](https://anthropic.com/research/components-of-agent-memory)
- **Recommendations:**
  - Write notes as verified facts **plus how they were verified**.
  - Tell the model the *purpose* of memory, not a rigid procedure. Telling Opus 5 and Opus 4.7 to "record only failures" cut their memory gains by 0.234 and 0.150.
  - **Keep the top layer small** and push detail down the hierarchy with links.
  - Use **scoped ownership**. Several agents writing one shared table lost 16 of 57 contract facts, while one agent per page quoting verbatim kept all 57.
  - Prune bloat. One wiki grew to 1.77× its source corpus.
  - Source: [Anthropic](https://anthropic.com/research/components-of-agent-memory)
- **"Dreaming" (offline consolidation)** reviews transcripts and existing memory to correct wrong notes, build wikis incrementally, fix links, and promote high-value notes into injected context.
  - Wiki-only accuracy on an internal corpus rose from 13% to 48% across 128 sessions.
  - Anthropic advises focusing dreaming on information likely to change and tuning its frequency to how often memories are accessed.
  - Source: [Anthropic](https://anthropic.com/research/components-of-agent-memory)
- **Wiki + search beats either alone:** 61% vs 53% (search only) vs 48% (wiki only), saving about 20k tokens per question. On multi-document legal questions, the wiki lifted scores from 73% to 87%, but it helped little on single-document lookups. — [Anthropic](https://anthropic.com/research/components-of-agent-memory)
- Claude Code loads only the first **200 lines / 25 KB** of its `MEMORY.md` index at session start. — [Anthropic](https://anthropic.com/research/components-of-agent-memory)
- CL-Bench (mean reward, baseline → with memory): Opus 5.5 0.655→0.838, Sonnet 5 0.306→0.610, Sonnet 4.6 0.330→0.364 (0.641 with refined instructions). — [Anthropic](https://anthropic.com/research/components-of-agent-memory)
- In the Pokémon evaluation, an over-elaborate memory (413 files, ~978k chars) stalled, while a compact one (10 files, ~43k chars, with a `global.md` dashboard) did better. — [Anthropic](https://anthropic.com/research/components-of-agent-memory)

**Claude / ChatGPT consumer memory**
- On Mar 2, 2026, Anthropic added memory for free users plus an "Import Memory" tool. You paste a ChatGPT-generated summary of your saved context; it is not a chat-log transfer. — [MacRumors](https://www.macrumors.com/2026/03/02/anthropic-memory-import-tool/); [PCWorld](https://pcworld.com/article/3076376/claude-can-now-import-chat-histories-from-chatgpt-and-other-ais.html)
- Gemini added a full chat-history ZIP import in late March 2026. — [PCWorld](https://www.pcworld.com/article/3100804/google-gemini-can-now-import-your-chatgpt-or-claude-chat-history.html)
- An AI Engineer World's Fair 2026 talk ("Lessons from Studying Every Memory System") reverse-engineered the memory of ChatGPT, Claude, Gemini and Poke. Its main point is that **stored facts go stale and mislead later**. — [ai.engineer talk page](https://ai.engineer/talks/lessons-from-studying-every-memory-system)

**Other systems (self-reported, low confidence)**
- Cognee claims SOTA on BEAM (up to 10M tokens) in its own 2026 benchmark post, which its founder states is "cognee's benchmark, not an independent study". — [Cognee AI memory benchmarks](https://www.cognee.ai/ai-memory-benchmarks)
- Third-party 2026 comparisons list Supermemory at about 81.6–85.4% LongMemEval (self-reported) and Hindsight at about 91.4%. They also say LangMem had no published LongMemEval score as of May 2026. — [automem comparison](https://automem-website.pages.dev/blog/agent-memory-in-2026-an-honest-comparison-of-mem0-zep-letta-and-the-rest); [dev.to comparison](https://dev.to/varun_pratapbhardwaj_b13/5-ai-agent-memory-systems-compared-mem0-zep-letta-supermemory-superlocalmemory-2026-benchmark-59p3)
- Mem0's 2026 trends: procedural memory is emerging as a third type alongside episodic and semantic. Open problems are temporal reasoning at scale, staleness, cross-session identity and privacy. — [Mem0 State of 2026](https://mem0.ai/blog/state-of-ai-agent-memory-2026)

### Inferences (for Jair OS on Supabase/Postgres)
- **Jair OS already has the four-layer shape**, so the gap is consolidation, not storage:
  - Supabase memory rows are notes.
  - The Obsidian vault is the wiki/representation layer.
  - The MCP `jair_os_contexto` acts as injected context.
  - Anthropic's wiki + search > either result argues for keeping the Obsidian sync *and* the vector/BM25 search, rather than choosing one.
- **The "Brain" layer (distill cognitive DNA, conclave audit) is essentially "dreaming".** Formalize it as a nightly job (pg_cron + Edge Function or a Claude workflow) that:
  1. Reads the day's episodic entries and transcripts.
  2. Dedupes and merges.
  3. Marks contradictions as superseded.
  4. Promotes stable, high-access facts to a small injected profile (aim for 200 lines or fewer, mirroring Claude Code's MEMORY.md limit).
  5. Prunes notes that are never accessed.
- **Schema additions worth implementing** (all cheap in Postgres):
  - `memory_type` (episodic | semantic | procedural).
  - Bi-temporal fields à la Zep: `valid_from`, `valid_to` (truth in the world) plus `recorded_at` (ingestion).
  - `superseded_by` (FK).
  - `verified_how` / `evidence_ref`, per Anthropic's "record how it was verified". This is a natural extension of the existing provenance.
  - `confidence`, `access_count`, `last_accessed_at` for decay-weighted ranking.
  - `writer_agent`, for scoped ownership: one writer agent per namespace, which avoids the 16/57 fact-loss failure mode.
  - An `entities` + `memory_entities` join table, Mem0-2026 style, instead of a graph DB.
- **Retrieval fusion for memory:** semantic + BM25 + entity match (+ optional rerank), as Mem0 does, with a recency/validity filter (`valid_to IS NULL`) by default.
- **Evaluate memory on the LongMemEval categories that matter for a tutor**: knowledge updates (a student's schedule or grade changed) and abstention (don't invent facts about a student). The current RAG metrics do not test either.
- **Privacy:** the `students` namespace holds data about minors. Staleness and over-retention are known open problems (Mem0, AI Engineer talk). Expiry/decay policies and access scoping per namespace are worth adding. This is an inference; LGPD specifics were not researched here.

### Gaps
- No independent reproduction of Mem0, Zep, Cognee or Supermemory headline scores was found. All are vendor-run.
- No primary 2026 source on **ChatGPT memory** architecture or changes was found in this session.
- LangMem's 2026 status beyond "no published LongMemEval score (May 2026)" was not found.
- GitHub star/commit activity for mem0, graphiti and letta was not collected.

---

## 2. Context engineering: compaction, context editing, just-in-time retrieval, agentic vs vector search, long context vs RAG

### Takeaway
The 2025–2026 consensus (Anthropic, practitioners) treats context as a finite "attention budget". Agents should load small, high-signal context up front and fetch the rest just-in-time through tools. Context editing, compaction and file-based memory are first-party API features in the Claude API as of late 2026. Evidence on "grep beats embeddings" is real but depends on the harness: a May 2026 study found grep won when results were delivered inline, while file-based delivery reversed that lead in half of the cases. Hybrid is the defensible default.

### Cited Findings
- [BG, Sep 29 2025] Anthropic's "Effective context engineering for AI agents" frames context as a limited resource and recommends the smallest set of high-signal tokens. It describes several techniques:
  - **Just-in-time retrieval** via lightweight identifiers (paths, IDs) that the agent dereferences with tools.
  - **Hybrid** loading (e.g., CLAUDE.md up front, plus glob/grep on demand).
  - **Compaction**, **structured note-taking** (agent-maintained notes outside the window) and **sub-agent** architectures.
  - Source: [Anthropic Engineering](https://anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [BG, Sep 29 2025] Context editing clears stale tool calls and results near the limit. On a 100-turn web-search evaluation it let agents finish workflows that would otherwise fail, while cutting token consumption by 84%. Memory tool + context editing improved performance by 39% over baseline, and context editing alone by 29%. These are Anthropic internal numbers. — [Anthropic: context management](https://www.anthropic.com/news/context-management)
- Late 2026 Claude API: server-side **compaction** comes in two forms, both in beta:
  - "Compaction on demand" uses beta header `compact-2026-09-04` and a top-level `compaction` parameter. It supports keeping recent turns verbatim and background compaction.
  - "Compaction at a token threshold" is triggered by the API.
  - Context editing remains the rule-based alternative for clearing old tool results and thinking blocks.
  - Source: [Claude docs: Compaction overview](https://platform.claude.com/docs/en/build-with-claude/compaction)
- A March 2026 Anthropic cookbook explains that Claude Code uses compaction for long conversations and two complementary memory systems for cross-session persistence. — [Claude cookbook: context engineering tools](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools)
- **Grep vs vector (May 14, 2026):** "Is Grep All You Need? How Agent Harnesses Reshape Agentic Search" (arXiv:2605.15184) tested 116 LongMemEval-S questions.
  - With **inline** delivery of results, grep beat vector in every harness–model pair.
  - With **file-based** delivery, vector won in 5 of 10 pairs.
  - The harness alone changed accuracy massively. For GPT-5.4/Codex, inline grep scored 93.1%, programmatic grep 55.2% and programmatic vector 67.2%.
  - Source: [arXiv 2605.15184](https://arxiv.org/abs/2605.15184); [LlamaIndex blog on it](https://www.llamaindex.ai/blog/is-grep-all-you-need-lexical-vs-sematic-search-for-agents)
- Claude Code and Codex CLI ship without a semantic index and use grep/ls/cat. Cursor reportedly found that semantic search + grep beat grep alone by double digits on coding tasks (secondary source, not verified against the primary). Vector search is said to be better when queries use different words from the answer, across languages, and for images. — [dbggr.dev](https://dbggr.dev/articles/embeddings-vs-grep-agentic-search/); [GeeksforGeeks summary](https://www.geeksforgeeks.org/blogs/do-ai-agents-still-need-vector-search-agentic-retrieval-vs-vector-rag/)
- A May 2026 paper argues for "direct corpus interaction" (agents reading and grepping the corpus) as an alternative to similarity-only retrieval. — [arXiv 2605.05242](https://arxiv.org/pdf/2605.05242)
- [BG, Jul 2025] Chroma's "Context Rot" study tested 18 models and found performance degrades as input length grows, even on simple tasks, and worse with distractors. — [Chroma research](https://research.trychroma.com/context-rot)
- Long context vs RAG, 2026:
  - A reported June 2026 study found long-context prompting reached 73.1% correctness vs 65.4% for semantic RAG, at **26× the per-query token cost**. This is secondary and the paper was not located.
  - Practitioner guidance converges on hybrid: retrieve 50k–200k relevant tokens, then reason over them in long context.
  - Prefill at 1M tokens can exceed 2 minutes.
  - Sources: [HackerNoon](https://hackernoon.com/long-context-beats-rag-on-accuracyso-why-keep-retrieval); [DEV: RAG vs long context 2026](https://dev.to/alexcloudstar/rag-vs-long-context-in-2026-when-to-retrieve-and-when-to-just-stuff-the-window-dgb)
- LOCA-bench (Feb 2026) benchmarks agents under controllable, extreme context growth. — [arXiv 2602.07962](https://arxiv.org/pdf/2602.07962)

### Inferences (for Jair OS)
- **MCP tool design:** make `search_memory` / `search_knowledge` return compact hits (id, title, namespace, 1–2 sentence snippet, score, provenance) and add a `get_item(id)` / `read_document(id, section)` tool. That is Anthropic's lightweight-identifier/JIT pattern. It keeps Claude's window small, and full text only enters when needed.
- **Add an exact/lexical tool next to semantic search**, for example `search_exact` using `pg_trgm`/ILIKE/regex over question text, LaTeX source, codes and exam IDs. Formula strings ("v = v0 + at"), exam names ("ENEM 2023 Q47") and student codes are the cases where lexical search wins. The grep study suggests letting the agent pick the tool.
- For long-running Brain/ingestion workflows driven by Claude, use API compaction (on-demand, keep recent turns) and context editing (clear old tool results) instead of a custom summarizer.
- **Do not switch to "stuff everything into 1M context".** The 26× cost and the context-rot evidence favor the current RAG plus selective long-context reading of a few retrieved documents.

### Gaps
- No primary source on how OpenAI's agent products manage context in 2026 was collected.
- The Cursor "semantic + grep" result was only seen second-hand.

---

## 3. RAG advances: chunking, hybrid search in Postgres, rerankers, embeddings (Portuguese), GraphRAG, agentic RAG, evaluation

### Takeaway
For a Supabase solo stack, the highest-ROI moves in late 2026 are:
1. **True BM25** instead of `ts_rank` in hybrid fusion. Measured 2026 tests show `ts_rank` hybrids can be *worse* than vector-only.
2. Picking embeddings from the **native Brazilian-Portuguese benchmark MTEB-BR** (July 2026), not the multilingual MTEB board.
3. A strong multilingual reranker.
4. A **harder, judge-calibrated eval set**, because Jair OS's MRR 0.956 and groundedness 1.00 look saturated.

Contextual retrieval and late chunking show marginal or inconsistent gains in independent 2026 evaluations. GraphRAG costs 100–300× more tokens per query and rarely pays off at this scale.

### Cited Findings
**Chunking / contextualization**
- [BG, Sep 2024] Anthropic Contextual Retrieval prepends an LLM-generated context to each chunk before embedding and BM25. It reported top-20 retrieval failures reduced by 35% (embeddings), 49% (+BM25) and 67% (+rerank), at a one-time cost of about $1.02 per million document tokens with prompt caching. — [Anthropic: Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- An Oct 2026 placebo-controlled ablation notes Anthropic's figure comes from an internal, non-peer-reviewed benchmark. It says Anthropic-style contexts give only **marginal gains** in independent evaluation, and cites late chunking **dropping 21 nDCG@10 on CovidQA**. — [arXiv 2610.10170](https://arxiv.org/pdf/2610.10170)
- An Aug 2026 small benchmark (88 hand-written queries) found neither late chunking nor contextual retrieval beat naive chunking. On 10-K filings, late chunking scored MRR 0.891 vs naive 0.986. This is single-author and suggestive only. — [rag-chunking-benchmark](https://github.com/Tirthg995/rag-chunking-benchmark/blob/main/README.md)
- [BG] Jina's late chunking improved nDCG@10 by about 3.6% relative over naive chunking on BEIR in secondary summaries, with gains growing with document length. — [Splunk: chunking benchmarks](https://www.splunk.com/en_us/blog/artificial-intelligence/chunking-techniques.html)
- MongoDB/Voyage's **voyage-context-4** (GA Jul 1, 2026; $0.12/M tokens) is a contextualized-chunk embedding model, pitched as "stop worrying about chunking". It is a drop-in replacement for voyage-context-3 ($0.18/M), and the vendor reports +1.4% at document level and +2.08% at chunk level over it. — [MongoDB: Now GA voyage-context-4](https://www.mongodb.com/products/updates/now-ga-voyage-context-4/); [Voyage pricing](https://docs.voyageai.com/docs/pricing)

**Hybrid search inside Postgres**
- 2026 SciFact measurement (Postgres 17, pg_textsearch 1.3.0 + pgvector 0.8.2), nDCG@10: built-in `ts_rank` **0.07**, BM25 (pg_textsearch) 0.69, pgvector alone 0.66, RRF hybrid 0.70. — [daen8584-spec/hybrid-search](https://github.com/daen8584-spec/hybrid-search)
- Another 2026 test ("Hybrid search with pgvector got worse until I added BM25"), nDCG@10:
  - Fusing `ts_rank_cd` with pgvector: 0.594, *below* vector-only at 0.703.
  - Fusing real BM25 instead: 0.727 (pg_textsearch) and 0.735 (ParadeDB pg_search).
  - Source: [zeybek.dev](https://zeybek.dev/blog/hybrid-search-in-postgres-measured)
- `ts_rank`/`ts_rank_cd` score by term frequency and proximity **without corpus-wide IDF**, which is why they underperform BM25. A zero-extension RRF library (pghybrid) exists, but its author concedes pg_search's BM25 is better if you can install it. — [pghybrid](https://github.com/pavangupta352/pghybrid); [ajayk.sh guide](https://www.ajayk.sh/blog/hybrid-search-postgres-bm25-vector-guide/)
- A different dataset showed pgvector at 19.0 ms vs BM25 at 3.4 ms, with the embedding API call dominating end-to-end vector latency. Recall overall was a near-tie (+0.002). — [DEV: Full-text vs pgvector vs hybrid, measured](https://dev.to/devopsdaily/full-text-vs-pgvector-vs-hybrid-search-measured-50jj)
- **pg_textsearch** (Tiger Data) has v1.0 released under the PostgreSQL License and targets PG 17/18. It is offered on AlloyDB and Azure HorizonDB. Its announcement calls ParadeDB's AGPL license much more restrictive. — [PostgreSQL news: pg_textsearch v1.0](https://www.postgresql.org/about/news/pg_textsearch-v10-3264); [Tiger Data blog](https://www.tigerdata.com/blog/introducing-pg_textsearch-true-bm25-ranking-hybrid-retrieval-postgres)
- **Supabase + ParadeDB:** Supabase's partner page describes ParadeDB as a *separate* read-optimized instance fed by logical replication, with `pg_search` enabled on the ParadeDB side, not inside Supabase. — [Supabase partners: ParadeDB](https://supabase.com/partners/integrations/paradedb)
- ParadeDB (2026, vendor claim) says its filter-aware vector index gives 2.0–9.5× VectorChord's throughput on filtered queries, and that competitors ran out of memory under an 8 GB limit on MS MARCO. — [ParadeDB blog](https://www.paradedb.com/blog/filter-aware-vector-search)
- **Supabase Vector Buckets** (Dec 1, 2025, public alpha) is S3-compatible vector storage with built-in similarity search for indexes up to 50M vectors. Supabase positions pgvector for smaller, latency-sensitive sets. — [Supabase blog: Vector Buckets](https://supabase.com/blog/vector-buckets)

**Embeddings: Portuguese evidence**
- **MTEB-BR** (arXiv:2607.04581, v2 Jul 7, 2026) has 22 tasks from 17 corpora authored natively in Brazilian Portuguese and evaluates 93 models (73 open, 20 commercial APIs). Top overall (Mean22):
  1. gemini-embedding-001: 0.682
  2. Qwen3-Embedding-8B: 0.670
  3. KaLM-Gemma3-12B: 0.670
  4. voyage-context-4: 0.668
  5. Octen-8B: 0.667
  6. Qwen3-Embedding-4B: 0.662
  - Other models: text-embedding-3-large 0.645, multilingual-e5-large-instruct 0.641, harrier-oss-v1-27b 0.639, gemini-embedding-2 0.633.
  - The top six are statistically indistinguishable (within 0.020).
  - Source: [arXiv 2607.04581](https://arxiv.org/html/2607.04581v2)
- MTEB-BR **retrieval** (nDCG@10 averaged over six tasks; mean derived from the paper's Table V):
  - voyage-context-4: 0.714
  - voyage-3-large: 0.702
  - voyage-context-3: 0.694
  - gemini-embedding-001: 0.686
  - Qwen3-Embedding-8B: 0.676
  - text-embedding-3-large: 0.649
  - multilingual-e5-large-instruct: 0.599
  - Source: [arXiv 2607.04581](https://arxiv.org/html/2607.04581v2)
- Further MTEB-BR findings:
  - Multilingual performance explains only about **57% of the variance** in native Portuguese performance, and the multilingual MTEB board correlates only moderately with MTEB-BR (Spearman ρ = 0.75).
  - Llama-Embed-Nemotron-8B, a multilingual leader, drops significantly on Portuguese retrieval.
  - Cheapest Pareto-optimal API: **voyage-3.5-lite ($0.02/M tokens)**. Top scorer: gemini-embedding-001 ($0.15/M).
  - The evaluation used a 512-token cap that disadvantages long-context models.
  - Source: [arXiv 2607.04581](https://arxiv.org/html/2607.04581v2); [MTEB-BR results on HF](https://huggingface.co/datasets/MTEB-BR/mteb-pt-results)
- A separate **MTEB-PT** (14 MMTEB datasets, BRACIS 2026) also exists. — [arXiv 2607.04071](https://arxiv.org/abs/2607.04071)
- Multilingual MTEB:
  - [BG, Jun 2025] Qwen3-Embedding-8B scores about 70.6, ahead of Gemini Embedding at 68.4 (Dec 2025 snapshot). — [Qwen3 Embedding paper](https://arxiv.org/pdf/2506.05176); [Qwen3-VL-Embedding paper](https://arxiv.org/pdf/2601.04720)
  - A Nov 2026 blog claims Microsoft harrier-oss-v1-27b leads MMTEB v2 at 74.27 (unconfirmed). — [ergini.com](https://ergini.com/blog/embedding-models-comparison)
  - Contrast: harrier is only 0.639 on MTEB-BR, which illustrates the paper's point.
- Voyage pricing (accessed Nov 2026): voyage-4 $0.06/M tokens with the first 200M tokens free, voyage-context-4 $0.12/M, voyage-multimodal-3.5 $0.12/M text + $0.60 per billion pixels. Release dates conflict (Jan 15 vs Jul 27, 2026). — [Voyage pricing](https://docs.voyageai.com/pricing); [OpenRouter voyage-4](https://openrouter.ai/voyageai/voyage-4)

**Rerankers (2026; third-party leaderboards disagree)**
- Agentset ELO leaderboard (snapshots Feb–Jul 2026):

  | Reranker | ELO | Latency | Price | License |
  |---|---|---|---|---|
  | zerank-2 | 1638 | ~265 ms | $0.025/M | CC-BY-NC weights |
  | Cohere Rerank 4 Pro | 1629 | ~614 ms | ~$0.05/M | proprietary API |
  | Voyage rerank-2.5 | 1544 | ~613 ms | ~$0.05/M | proprietary API |
  | Qwen3-Reranker-8B | 1473 | ~4.7 s | self-hosted | Apache-2.0 |

  Source: [Agentset rerankers](https://agentset.ai/rerankers); [benchmarklist mirror](https://benchmarklist.com/benchmarks/agentset_reranker_leaderboard/)
- Mixpeek ranks Cohere Rerank 4 first on its own list. Practitioners call Cohere better for broad multilingual use and Voyage better for instruction-following. — [Mixpeek](https://mixpeek.com/curated-lists/best-rerankers); [bestaiweb guide](https://www.bestaiweb.ai/how-to-add-reranking-to-your-rag-pipeline-with-cohere-rerank-4-pro-voyage-rerank-2-5-and-zerank-2-in-2026/)
- A Sept 28, 2026 tracker entry lists a Voyage "code-4 / rerank-3" launch (single aggregator source, unverified). — [usagepricing](https://www.usagepricing.com/blueprint/activity/voyage-ai-2026-09-28-code-4-rerank-3-launch)

**GraphRAG / LightRAG**
- ICLR 2026 "When to use Graphs in RAG" (GraphRAG-Bench) was motivated by reports that GraphRAG often underperforms naive RAG, e.g., a 13.4% accuracy deficit on Natural Questions. — [arXiv 2506.05690](https://arxiv.org/pdf/2506.05690v3); [paper note](https://en.papernotes.org/ICLR2026/information_retrieval/when_to_use_graphs_in_rag_a_comprehensive_analysis_for_graph_retrieval-augmented/)
- Reported prompt tokens per question on that benchmark: vector RAG about 879, **LightRAG about 100,832**, **GraphRAG global about 331,375**. — [beri.net analysis](https://www.beri.net/article/graphrag-vs-vector-rag-indexing-query-cost-lightrag-lazygraphrag-2026)
- WildGraphBench (Feb 2026) shows no uniform winner between GraphRAG and LightRAG. In an independent SEC-filings test (40 questions), LightRAG scored 45% vs vector 42.5%. — [arXiv 2602.02053](https://arxiv.org/html/2602.02053v1); [bestin-it](https://bestin-it.com/lightrag-benchmark-sec-filings/)

**RAG evaluation pitfalls**
- A Feb 2026 paper argues generic RAGAS-style metrics miss precision-sensitive enterprise failures. It mitigates judge bias with evidence-only inputs plus cross-judge and human checks. — [arXiv 2602.20379](https://arxiv.org/html/2602.20379v1)
- Known judge pitfalls:
  - Length/verbosity, position and self-preference bias.
  - Run-to-run variance: pin the judge version and use temperature 0.
  - RAGAS internal prompt edits shift scores.
  - Faithfulness misses support for paraphrased claims.
  - Malformed judge JSON produces NaN.
  - Recommended: validate the judge against 50–100 expert labels.
  - Sources: [qaskills RAGAS guide](https://qaskills.sh/blog/ragas-faithfulness-answer-relevancy-guide); [Kili: separate retrieval from generation](https://kili-technology.com/blog/rag-evaluation-guide-measuring-retrieval-and-generation-as-separate-problems)

### Inferences (for Jair OS)
- **Check what the current hybrid uses.** Supabase's own hybrid-search guide uses Postgres full-text ranking (background, not re-fetched). If Jair OS fuses `ts_rank`/`ts_rank_cd` with pgvector, the 2026 measurements say that fusion may be hurting.
  - Run `select * from pg_available_extensions` on the project to see whether `pg_textsearch`, `vchord` or `pg_search` can be installed. Availability on Supabase managed Postgres was **not confirmed**; see Gaps.
  - If none are available, there are two options. One is a ParadeDB replica (adds ops cost). The other is to compute BM25-style IDF in SQL: maintain a term-document-frequency table with `ts_stat` and score with a BM25 formula in a SQL function. That is feasible for corpora of tens of thousands of chunks.
  - Either way, use the `portuguese` text-search config plus `unaccent`.
- **Embeddings:** re-run the internal eval with a native-PT benchmark mindset.
  - Strong candidates: voyage-context-4 (best PT retrieval, $0.12/M), voyage-3.5-lite/voyage-4 (cheap; 200M free tokens covers a teacher's whole corpus many times over), gemini-embedding-001 ($0.15/M), and Qwen3-Embedding-4B/8B (open, Apache-2.0, needs a GPU host).
  - Use pgvector `halfvec` to halve storage if dimensions are large. This is background knowledge about pgvector ≥0.7, not re-verified here.
- **Reranker:** if not already using one, Cohere Rerank 4 Pro or Voyage rerank-2.5 are the safe multilingual managed defaults. zerank-2's open weights are non-commercial. Qwen3-Reranker-8B is too slow on CPU.
- **Contextual retrieval:** worth an A/B only for long textbook chapters, where chunks lose context. It is not needed for self-contained exam questions, which already carry their own context. Expect marginal gains; the independent 2026 results above.
- **Skip GraphRAG/LightRAG.** Jair OS's questions are mostly lookups and single-entity queries (a student, a lesson, a question). Graph methods cost 100–300× tokens per query. The entity-linking table from Section 1 gives most of the benefit.
- **Eval hygiene:**
  - MRR 0.956, Hit@5 0.970 and groundedness/faithfulness **1.00** strongly suggest a too-easy or in-distribution test set and/or a lenient judge.
  - Build a "hard" set: paraphrased colloquial PT queries, typos, formula-only queries, cross-namespace questions, knowledge-update questions (old vs new fact) and unanswerable questions (abstention).
  - Use a judge from a different model family than the generator, and calibrate it on 50–100 hand-labelled items.
  - Report retrieval and generation separately.

### Gaps
- Whether Supabase managed Postgres offers `pg_textsearch`, `vchord`/VectorChord or `pgvectorscale` as of Nov 2026 could not be confirmed. Supabase's extensions page does not list them by name.
- No MTEB-BR scores were found for BGE-M3 or Cohere Embed v4.
- No independent 2026 head-to-head of rerankers on Portuguese data was found.
- pgvector release notes after 0.8.x (2026) were not retrieved. A 2026 benchmark used pgvector 0.8.2.

---

## 4. Multimodal / visual document retrieval (page images, diagrams, exam questions)

### Takeaway
Visual retrieval has matured. ViDoRe V3 (Jan 2026, ACL 2026) is the reference benchmark, and late-interaction ColQwen3-class models lead it at about 60–62 nDCG@10, against ColQwen2.5 at about 52 and Jina v4 at about 57.6. For Jair OS the practical win is not replacing text RAG. It is a **second, visual index over question crops and figures**, so that "find questions with an inclined-plane diagram like this one" works. That is feasible with single-vector multimodal embeddings in pgvector. Multi-vector ColPali-style search in Postgres needs VectorChord.

### Cited Findings
- **ViDoRe V3** (arXiv 2601.08620, Jan 2026; ACL 2026 long paper) is a human-annotated multimodal RAG benchmark with about 26,000 pages, 8 public domains and 6 query languages. It tests cross-lingual retrieval, answer generation and visual grounding, and MTEB maintainers run the private tasks themselves.
  - Reported averages: ColQwen2.5 51.9, ColQwen2 44.7, Jina-v4 57.6.
  - Source: [ViDoRe V3 paper](https://arxiv.org/html/2601.08620v2); [ACL Anthology PDF](https://aclanthology.org/2026.acl-long.755.pdf)
- ViDoRe V3 leaderboard as of Feb 2026: tomoro-colqwen3-embed-8b 61.59, tomoro-colqwen3-embed-4b 60.20, jina-embeddings-v4 57.52 (7th). Nemotron ColEmbed V2 reports top-tier late-interaction results. — [Nemotron ColEmbed V2, arXiv 2602.03992](https://arxiv.org/pdf/2602.03992)
- Qwen3-VL-Embedding and Qwen3-VL-Reranker (Jan 2026) offer a unified multimodal retrieval and ranking framework. — [arXiv 2601.04720](https://arxiv.org/pdf/2601.04720)
- [BG, Jun 2025] Jina Embeddings v4 is a universal multimodal multilingual model with single- and multi-vector outputs. Its self-reported scores use the older ViDoRe v1 suite. — [Jina AI](https://jina.ai/news/jina-embeddings-v4-universal-embeddings-for-multimodal-multilingual-retrieval/)
- An Apr 2026 empirical study applies **visual late chunking** to visual document retrieval. — [arXiv 2604.10167](https://arxiv.org/pdf/2604.10167)
- **Postgres-side late interaction:**
  - [BG, Apr 2025] VectorChord 0.3 added a multivector **MaxSim** operator and index inspired by WARP.
  - Its docs recommend two stages: fast single-vector RaBitQ retrieval, then MaxSim rerank. They note that ColPali/ColQwen encode page images directly into multi-vectors and outperform OCR-to-text approaches, but token-level late interaction costs much more compute and storage.
  - Source: [VectorChord docs: ColBERT rerank](https://docs.vectorchord.ai/vectorchord/use-case/colbert-rerank.html); [VectorChord 0.3 post](https://hashnode.com/posts/vectorchord-03-bringing-efficient-multi-vector-contextual-late-interaction-in-postgresql/67fb5924b1379d872a651246)
- Another extension (pgturbohybrid) exposes negative MaxSim for ORDER BY and fuses MaxSim with BM25 via RRF. — [Mayflower blog](https://blog.mayflower.de/?p=29673)
- voyage-multimodal-3.5 costs $0.12/M text tokens + $0.60 per billion pixels, with 32k tokens per input and 150B free pixels (accessed Nov 2026). — [OpenRouter listing](https://openrouter.ai/voyageai/voyage-multimodal-3.5/api); [Voyage pricing](https://docs.voyageai.com/pricing)
- Korean adaptations (KoViDoRe, KoVRE, Aug 2026) show language-specific visual retrieval benchmarks are emerging. No Portuguese equivalent was found. — [KoViDoRe arXiv 2608.20840](https://arxiv.org/pdf/2608.20840)

### Inferences (for Jair OS)
- **Two-index design for the question bank:**
  1. A text index over the transcribed question (Markdown + LaTeX) with BM25 + embedding.
  2. A visual index over the **question crop image** (and separately each figure crop), using a single-vector multimodal embedding (voyage-multimodal-3.5, Jina v4 single-vector, or Cohere Embed v4) stored in pgvector.
  - Visual retrieval catches what OCR misses (diagram type, graph shape, circuit topology) and gives "similar questions" for exercise generation.
- **Cost check:** a 1654×2339 px A4 page at 200 dpi is about 3.9M pixels, so 10,000 pages ≈ 39B pixels ≈ $23 at $0.60/B. That is inside the 150B free pixels on Voyage. This is my arithmetic from the listed prices.
- Multi-vector ColQwen in Supabase is probably not worth it unless VectorChord is installable. Single-vector multimodal plus a text reranker is the pragmatic path.
- Store `page_image_path`, `bbox`, `dpi` and `source_pdf_sha256` for every crop, so retrieval results can always be shown as the original visual (faithfulness to the source) and re-cropped.

### Gaps
- No Cohere Embed v4 or Voyage multimodal score on ViDoRe V3 was found in this session.
- No Portuguese visual-document retrieval benchmark was found.
- No evidence was found on visual retrieval specifically for physics diagrams.

---

## 5. Document parsing / OCR for STEM (Portuguese, LaTeX math, multi-column exams, figures, question boundaries)

### Takeaway
As of Nov 2026, small specialized open document VLMs (PaddleOCR-VL-1.6 at 0.9B, MinerU2.5-Pro, GLM-OCR, TeleOCR, OvisOCR2) lead OmniDocBench v1.6 at about 95–97, with formula CDM about 97.5. Large general VLMs trail: Qwen3-VL-235B scores about 89.8, and "wild" real-world variants top out near 87. On olmOCR-bench, Mistral OCR 4 (85.2) and Datalab Chandra 2 (about 85.8) lead.

For a Portuguese exam pipeline on a modest budget, the strongest options are:
- **Mistral OCR 4.1** via API ($4/1k pages, $2 batch), which returns per-element bounding boxes and block types including equations.
- **PaddleOCR-VL-1.6 / MinerU**, open-source and self-hostable, as the layout and bbox engine.
- **Chandra 2**, which reports 95.2% on Portuguese and is free for orgs under $2M revenue.

No tool does "question boundary detection" out of the box. That remains a layout + rules + LLM-verification layer you build, with crops cut from the original PDF at high DPI.

### Cited Findings
**Benchmarks**
- **OmniDocBench v1.6**: 1,651 pages, 10 document types, 5 layouts, 5 language types; the most-used page-parsing benchmark (2026). — [OvisOCR2 report, arXiv 2607.13639](https://arxiv.org/pdf/2607.13639)
- Leaders as of about Nov 2026 (sources conflict):
  - Roboflow's ranking: **PaddleOCR-VL-1.6 96.34**, MinerU2.5-Pro 95.75, GLM-OCR 95.22 (0.9–1.2B params). It says small dedicated document models beat large VLMs, e.g., Qwen3-VL-235B at 89.78.
  - Another table: TeleOCR 96.91, OvisOCR2 96.47.
  - The Xiaomi-OCR-0 report: TeleOCR 96.87, OvisOCR2 96.58.
  - Sources: [Roboflow, ~Nov 2026](https://roboflow.com/blog/best-open-source-ocr-models); [invoicedataextraction](https://invoicedataextraction.com/blog/ocr-benchmarks); [Xiaomi-OCR-0, arXiv 2609.36136](https://arxiv.org/pdf/2609.36136)
- Hard and wild variants score much lower. The top model on Wild-OmniDocBench is about 87, and one leaderboard of 34 models runs from Gemini-3-pro-preview at 86.4 down to MinerU-2.5-pipeline at 33.5. — [Xiaomi-OCR-0](https://arxiv.org/pdf/2609.36136); [invoicedataextraction](https://invoicedataextraction.com/blog/ocr-benchmarks)
- **Formula accuracy:** PaddleOCR-VL-1.6 reports Formula-CDM 97.49 (overall 96.33). MinerU2.5-Pro reports 97.45 in the same table, or 97.29/97.54 in its own paper; compare only within one table. — [PaddleOCR-VL-1.6, arXiv 2606.03264](https://arxiv.org/html/2606.03264v1); [MinerU2.5-Pro, arXiv 2604.04771 (Apr 2026)](https://arxiv.org/html/2604.04771v1)
- [BG, Oct 2025] PaddleOCR-VL (0.9B) supports **109 languages**. 1.6 builds on 1.5. No Portuguese-specific evaluation was found. — [PaddleOCR-VL, arXiv 2510.14528](https://arxiv.org/pdf/2510.14528); [HF PaddleOCR-VL-1.6](https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6)
- GLM-OCR scores 94.35 on OmniDocBench v1.5 (Mar 2026). — [GLM-OCR, arXiv 2603.10910](https://arxiv.org/html/2603.10910v1)
- **olmOCR-bench** (snapshots Apr–May 2026; run-to-run variance noted):
  - Chandra OCR 2: 85.8–85.9
  - Mistral OCR 4: 85.20, the top among models tested in Mistral's post
  - dots.mocr (Mar 2026): 83.9
  - olmOCR 2 (Ai2): 82.4
  - dots.ocr: 79.1
  - DeepSeek-OCR-2: 76.3
  - DeepSeek-OCR: about 75.4–75.7
  - One unexplained "dots-ocr-3b 88.3" entry should be treated with caution.
  - LightOnOCR reruns under its own protocol gave DeepSeek-OCR 73.1 and Chandra-9B 81.7.
  - Sources: [CodeSOTA olmOCR-bench](https://www.codesota.com/ocr/benchmark/olmocr-bench); [benchmarklist](https://benchmarklist.com/benchmarks/olmocr_bench/); [dots.ocr paper, arXiv 2512.02498](https://arxiv.org/pdf/2512.02498); [LightOnOCR, arXiv 2601.14251](https://arxiv.org/pdf/2601.14251)
- Mistral itself warns that both olmOCR-bench and OmniDocBench have scoring artifacts, such as ground-truth errors and **equivalent LaTeX marked as mismatches**. — [Mistral OCR 4 post](https://mistral.ai/news/ocr-4)

**Commercial APIs**
- **Mistral OCR 3** (released 2025-12-18):
  - Vendor-reported 74% win rate over OCR 2 on forms, scans, complex tables and handwriting.
  - $2/1k pages, $1 batch.
  - Now marked superseded.
  - Source: [Mistral OCR 3 news](https://mistral.ai/news/mistral-ocr-3); [Mistral docs ocr-3-25-12](https://docs.mistral.ai/models/ocr-3-25-12)
- **Mistral OCR 4** (Jun 23, 2026):
  - **Bounding boxes per text block**, block classification (titles, tables, **equations**, signatures), and per-page and per-word confidence scores.
  - Markdown output, 170 languages in 10 groups (Portuguese not specifically named), PDF/DOC/PPT/ODF input.
  - Document AI accepts a JSON schema plus an image-annotation schema.
  - Scores: OlmOCRBench 85.20, OmniDocBench 93.07, 72% average human-preference win rate across 600+ documents in 12+ languages.
  - **$4/1k pages, $2 batch, $5 Document AI.** Self-hosting is offered to enterprise only.
  - Source: [Mistral: OCR 4](https://mistral.ai/news/ocr-4)
- **Mistral OCR 4.1** (about Aug 13, 2026):
  - Model update aligning bounding boxes to each single element with "no drift, no nested images".
  - Mistral docs say to use OCR 4.1 for new integrations; OCR 4.0 deprecation was scheduled for 9/29/2026.
  - Same pricing ($4, or $5 annotated).
  - Sources disagree on what `mistral-ocr-latest` points to.
  - Source: [pasqualepillitteri.it (secondary)](https://pasqualepillitteri.it/en/news/11041/mistral-ocr-4-1-bounding-boxes-marked-up-pages); [Mistral docs OCR 4.0 card](https://docs.mistral.ai/models/model-cards/ocr-4-0)
- **Gemini 3** (Nov 2025 onward):
  - Google says Gemini 3 Pro detects text, tables, formulas and figures. — [Google blog: Gemini 3 Pro vision](https://blog.google/technology/developers/gemini-3-pro-vision/)
  - Google Document AI's Gemini layout parser v1.6-pro (preview, Dec 1, 2025, on Gemini 3 Pro) identifies figures, tables and headers. — [Google Cloud docs](https://docs.cloud.google.com/document-ai/docs/layout-parse-chunk)
  - Tensorlake (a competitor) says not to use Gemini 3 when you need bounding boxes for citation, because it does no layout object detection. — [Tensorlake on dev.to](https://dev.to/tensorlake/gemini-3-is-now-available-as-an-ocr-model-in-tensorlake-4kfh)
  - A May 2026 forum thread reports Gemini 3.x failing on some valid PDFs lacking a ToUnicode map. — [Google AI forum](https://discuss.ai.google.dev/t/consistent-pdf-upload-processing-failure-with-gemini-3-x-models-in-google-ai-studio-affects-python-sdk-too/146407.md)
- Artifex (the PyMuPDF vendor) argues that **PDF-native extraction** (reading PDF internals: text, coordinates, vector drawings) beats vision models for born-digital PDFs and citation boxes. — [Artifex blog](https://artifex.com/blog/pdf-native-vs-vision-models-gemini-3)

**Open-source toolkits**
- **Datalab Chandra 2** (Mar 2026):
  - 5B params per the HF card; one explainer says 4B, which conflicts.
  - olmOCR-bench 85.8: math 89.1, tables 92.1, multi-column 82.1, old scans 51.1.
  - **Portuguese 95.2%**, vs Chandra 1 84.3% and Gemini 2.5 Flash 89.4%, on Datalab's 43-language benchmark (vendor).
  - Outputs Markdown/HTML/JSON with layout, and extracts images and diagrams with captions.
  - Runs via vLLM, about 1.44 pages/s on one H100.
  - Weights use a modified OpenRAIL-M license: free for research, personal use and startups under $2M funding/revenue, with no use competitive with Datalab's API.
  - A Chandra 2.2 update in July 2026 is reported only by an aggregator.
  - Source: [HF chandra-ocr-2](https://huggingface.co/datalab-to/chandra-ocr-2); [GitHub datalab-to/chandra](https://github.com/datalab-to/chandra)
- **Marker 2** (Datalab's pipeline) reportedly scores 76.0% olmOCR-bench at 5.4× the MinerU pipeline's throughput and requires Python ≥3.10. The date (reported Oct 2, 2026) comes from an aggregator. — [edgex news (aggregator)](https://pro.edgex.exchange/en-US/news/article/marker-2-datalab-document-conversion); [marker releases](https://github.com/datalab-to/marker/releases)
- **Docling (IBM):**
  - Very active: 2.95.0 on May 21, 2026, with point releases January–May 2026. — [CERN PyPI mirror](https://simple-repository.app.cern.ch/project/docling)
  - **Granite-Docling** is about 258M params, Apache-2.0, preserves layout, tables, equations and lists, and is meant to complement the Docling library. — [IBM announcement](https://ibm.com/new/announcements/granite-docling-end-to-end-document-conversion)
  - [BG, Sep 2025] The **Heron** layout model reaches 78% mAP at 28 ms/image on an A100 and includes a Formula class. — [arXiv 2509.11720](https://arxiv.org/html/2509.11720v1)
- [BG, Oct 2025] DeepSeek-OCR introduced "optical context compression". It scores about 75–76 on olmOCR-bench, the lowest of the group above. — [CodeSOTA](https://www.codesota.com/ocr/benchmark/olmocr-bench)

**Exam/question extraction precedents**
- EuraGovExam (Mar 2026) **cropped questions manually** from exam PDFs with no OCR. Its two-stage QA checked answer-label consistency, **crop completeness**, and resolution/legibility, and items failing were re-segmented or excluded. — [arXiv 2603.27223](https://arxiv.org/pdf/2603.27223)
- [BG, Sep 2025] V-Math built about 500 exam sets from 220 official PDFs with an extraction agent outputting structured JSON (text, options, images, answers). — [arXiv 2509.12251](https://arxiv.org/pdf/2509.12251)
- [BG, 2023] The MIT curriculum dataset used Mathpix for transcription followed by manual correction. — [arXiv 2306.08997](https://arxiv.org/pdf/2306.08997)
- LlamaIndex announced **ParseBench**, a benchmark for document OCR for agents (webinar May 27, 2026). — [LlamaIndex blog](https://www.llamaindex.ai/blog/is-grep-all-you-need-lexical-vs-sematic-search-for-agents)

### Inferences (for Jair OS question-bank ingestion)
- **Recommended pipeline** (each step logged with provenance):
  1. **Triage per PDF.** Born-digital (has a text layer and ToUnicode) or scanned? Use PyMuPDF to extract words with coordinates and vector drawings first. It is free, deterministic and exact for digital Portuguese text.
  2. **Layout + bboxes.** Run a layout engine to get typed blocks with boxes. Options: Mistral OCR 4.1 API, PaddleOCR-VL-1.6 / MinerU2.5 self-hosted, or Docling + Heron.
  3. **Question boundary detection** as a dedicated step:
     - Rules on Portuguese enumerators ("Questão 12", "QUESTÃO 05", "12)", "01.") and alternatives "(A)…(E)" / "a)…e)".
     - Column order reconstruction for two-column exams.
     - Attach figures and "Texto para as questões 3 e 4" stems shared across several questions.
     - Have an LLM/VLM verify each proposed segment: is it complete, are all alternatives present, does it contain the figure it references? This mirrors EuraGovExam's crop-completeness check.
  4. **Faithful crop** = union of bboxes, cut from the *original* PDF with PyMuPDF `clip` at ≥200–300 dpi, or as vector PDF to keep line art sharp. Never crop from re-rendered OCR output. Handle questions spanning pages or columns as multi-part crops.
  5. **Transcription to Markdown + LaTeX** using a math-strong VLM OCR (Mistral OCR 4.1, Chandra 2 or PaddleOCR-VL-1.6), keeping the crop as ground truth.
  6. **Round-trip verification.** Render the LaTeX (KaTeX/Typst), then have a VLM compare render vs crop. Also run a symbolic sanity check on formulas with SymPy where they parse. Flag mismatches for human review instead of auto-accepting.
  7. **Store** the question row with fields: `source_pdf_sha256`, `page`, `bbox[]`, `crop_path`, `latex_md`, `figures[]`, `alternatives[]`, `answer_key`, `exam/year/source`, `ocr_engine+version`, `verification_status`.
- **Cost for a solo developer:** at Mistral OCR 4.1 batch pricing ($2/1k pages), 5,000 exam/textbook pages ≈ **$10** (my arithmetic). Self-hosting PaddleOCR-VL-1.6 (0.9B) is feasible on a single consumer GPU or a short-lived cloud GPU. That is inferred from model size and not benchmarked here.
- **Licensing:** Chandra 2 weights are fine for a sole proprietor under $2M revenue, but they forbid use competitive with Datalab's API. Granite-Docling (Apache-2.0) and PaddleOCR are permissive. PaddleOCR-VL-1.6's exact license was not verified.
- **Do not trust OCR benchmark deltas of 1–2 points** for choosing an engine, given the LaTeX-equivalence artifacts and run variance. Build a 30–50 page in-house test set (Portuguese exams with formulas, two columns, diagrams) and score it on formula exact match after normalization, alternative completeness, and crop completeness.
- Gemini 3 and Claude native PDF reading are good for **verification and understanding** of crops, but not as the bbox source. Use a layout engine, Mistral 4.1 bboxes or PyMuPDF for coordinates.

### Gaps
- No benchmark or tool was found that specifically evaluates **exam-question boundary detection/segmentation**, in Portuguese or any language.
- Mathpix 2026 updates and pricing were not researched.
- LlamaParse, Reducto and Unstructured 2026 releases and scores were not collected in this session.
- Nougat (2023) is presumed superseded; no 2026 data was found.
- No Portuguese-specific results were found for PaddleOCR-VL, MinerU or Mistral OCR 4.
- No olmOCR-bench or OmniDocBench score was found for Claude's native PDF reading.

---

## 6. Generating print-ready STEM documents and verifying math correctness

### Takeaway
2026 practice for generated math and physics content is a **symbolic verifier first (SymPy/Sage), then an LLM judge for undecidable cases**. Papers stress that SymPy can wrongly reject equivalent expressions, and that generators can learn to game fixed verifiers. For typesetting, Typst (0.15.1, Jul 2026) is a fast, LLM-friendly alternative. LaTeX remains the gold standard, with the largest ecosystem for exams and diagrams.

### Cited Findings
- Typst's latest stable release is **0.15.1 (July 2026)**. It has fewer specialized community packages than LaTeX. — [Wikipedia: Typst](https://en.wikipedia.org/wiki/Typst)
- A 2026 IJIMAI paper describes LaTeX as command-based and verbose (e.g., for fractions), while Typst uses lighter markup with concise math mode. — [IJIMAI 2026 (Voynov)](https://repositorio.aemet.es/bitstream/20.500.11765/17953/1/ijimai_Voynov_2026.pdf)
- LaTeX math typesetting is still called the gold standard, and journals often require LaTeX. Some users find Typst shorthand (e.g., `oo` for ∞) error-prone. — [calmops](https://calmops.com/latex/typst-modern-alternative-latex/); [Julia discourse thread](https://discourse.julialang.org/t/typst-and-other-alternatives-to-latex/121652?page=10)
- **Verification patterns (2026):**
  - A Jan 2026 physics/QFT benchmark grades final answers with a **SymPy grader** and falls back to an LLM judge when symbolic checking is inconclusive. — [arXiv 2610.33134](https://arxiv.org/pdf/2610.33134)
  - A 2026 SageMath-agent evaluation treats an answer as correct if `simplify(pred − ref) == 0`. It warns simplification is not exhaustive and can **wrongly reject equivalent expressions**, so rejected cases go to three LLM judges. — [arXiv 2607.06820](https://arxiv.org/pdf/2607.06820)
  - A May 2026 verifier-backed problem-generation paper uses SymPy as a near-deterministic verifier where possible (e.g., differentiating a proposed antiderivative), with rule filters and an LLM judge otherwise. Commentary warns a generator could learn to pass a fixed verifier while producing degenerate problems. — [arXiv 2605.06660](https://arxiv.org/html/2605.06660v1); [captcha.la commentary](https://blog.captcha.la/research/2026-05-07-verifier-backed-hard-problem-generation-for-mathematical-reasoning)
  - [BG, 2025] SymCode works best on problems expressible directly in SymPy and struggles with proofs. — [arXiv 2510.25975](https://arxiv.org/pdf/2510.25975)
  - [BG, 2025] A NeurIPS ML4PS workshop verifier used SymPy scripts for 83% of derivation-step checks in theoretical physics. — [ML4PS 2025](https://ml4physicalsciences.github.io/2025/files/NeurIPS_ML4PS_2025_20.pdf)
  - Formal routes: MATH-VF (LLM + SymPy/Z3 step checking) [BG, 2025] — [arXiv 2505.20869](https://arxiv.org/pdf/2505.20869). A Feb 2026 Lean-4 pipeline for verifying LLM solutions — [arXiv 2602.20770](https://arxiv.org/html/2602.20770).

### Inferences (for Jair OS A4 materials)
- **Generation contract:** the LLM emits structured JSON for each question:
  - statement (PT), givens with units, solution steps, final answer as a SymPy-parsable expression or number with unit, and alternatives.
  - A **Python checker** recomputes the answer from the givens (SymPy plus a unit library such as `pint`). It checks that exactly one alternative matches within tolerance and that distractors differ, ideally encoding plausible misconceptions.
  - Failures go to an LLM judge from a different model family, and then to the teacher.
- **Deterministic figures:** generate physics diagrams from code (TikZ/pgfplots in LaTeX, or matplotlib/SVG), with parameters taken from the same JSON as the numbers. The figure then provably matches the statement. Avoid image-generation models for technical diagrams.
- **Typesetting:** Typst is attractive for fast, programmatic A4 output (single binary, quick compile, simpler escaping for LLM-written source). Keep LaTeX for heavy TikZ diagrams or existing templates. In either case, render the output to PDF and run a final visual check (VLM looks at the page and flags overflow, broken formulas or missing figures).
- Keep original crops (faithful) and generated items (original) in separate tables with an explicit `origin` flag. This avoids copyright confusion with textbook and exam content and keeps the question bank auditable.

### Gaps
- No 2026 source specifically compared Typst vs LaTeX **for LLM-generated** worksheets (error rates, compile failures).
- Typst's TikZ-like diagram package (CeTZ) maturity in 2026 was not researched.
- No 2026 Wolfram|Alpha API pricing or verification-accuracy data was collected.
- Pandoc 2026 changes were not researched.

---

## 7. Notable 2026 talks, videos and open-source repos (with dates)

### Takeaway
2026's notable talks cluster around the AI Engineer World's Fair (June 29–July 2, 2026, San Francisco), which had dedicated memory and context-engineering tracks. The most useful open-source repos for this stack are active and recent: Docling, PaddleOCR-VL-1.6, MinerU2.5-Pro, Chandra 2, Graphiti (with MCP server), Mem0, pg_textsearch and MTEB-BR. Video URLs and GitHub activity metrics were not verified.

### Cited Findings
- AI Engineer World's Fair 2026 ran June 29–July 2 in SF, with a "Context Engineering" track (context-window management, compression). — [ai.engineer/wf](https://www.ai.engineer/wf); [llms.md](https://ai.engineer/wf/llms.md)
  - "Lessons from Studying Every Memory System" reverse-engineered ChatGPT, Claude, Gemini and Poke memory; stale facts mislead. — [talk page](https://ai.engineer/talks/lessons-from-studying-every-memory-system)
  - "Memory Harnesses for Long-Running Research Agents" covers when durable memory helps and why retrieval ranking matters. — [talk page](https://www.ai.engineer/talks/R3-anFK1YM8-memory-harnesses-long-running-research-agents)
  - "Total Recall: Agent Memory and Harness Engineering" was a workshop. — [schedule PDF](https://ai.engineer/worldsfair/schedule.pdf)
- Anthropic Engineering, "The components of agent memory" (Nov 6, 2026), links dreaming and knowledge-wiki cookbooks for Claude Managed Agents. — [Anthropic](https://anthropic.com/research/components-of-agent-memory)
- Siemens open-source event 2026 slides: "Docling: The Open-Source Document AI Engine". — [slides PDF](https://opensource.siemens.com/events/2026/slides/Panos_Vagenas__Docling_The_Open-Source_Document_AI_Engine.pdf)
- Repos and models with 2026 activity:
  - [mem0ai/mem0](https://github.com/mem0ai/mem0): April 2026 algorithm.
  - [getzep/graphiti](https://github.com/getzep/graphiti): MCP server; README as of March 2026.
  - Letta: Letta Code flagship, Mar 16, 2026 ([Latent Space wiki](https://latent.space/wiki/letta-ai-558a42a5/)).
  - [datalab-to/chandra](https://github.com/datalab-to/chandra): Chandra 2, Mar 2026.
  - [datalab-to/marker releases](https://github.com/datalab-to/marker/releases): Marker 2.
  - Docling 2.95.0, May 21, 2026 ([mirror](https://simple-repository.app.cern.ch/project/docling)).
  - [PaddleOCR-VL-1.6 on HF](https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.6), 2026.
  - MinerU2.5-Pro paper, Apr 2026 ([arXiv](https://arxiv.org/html/2604.04771v1)).
  - [timescale/pg_textsearch](https://raw.githubusercontent.com/timescale/pg_textsearch/main/README.md): v1.0, PostgreSQL License.
  - [tardellirs/mteb-br](https://github.com/tardellirs/mteb-br/blob/main/README.md): Jul 2026, Brazilian-Portuguese embedding leaderboard.
  - [Tirthg995/rag-chunking-benchmark](https://github.com/Tirthg995/rag-chunking-benchmark/blob/main/README.md): Aug 2026.
- Also relevant: a Mar 2026 Anthropic cookbook on context-engineering tools. — [Claude cookbook](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools)

### Inferences
- For a solo developer, the three most transferable 2026 artifacts are:
  1. Anthropic's components-of-memory article plus its dreaming/wiki cookbooks, which map onto Brain + Obsidian.
  2. MTEB-BR, for choosing a Portuguese embedding with evidence.
  3. Mistral OCR 4.1's bbox output, or PaddleOCR-VL-1.6 self-hosted, as the coordinate source for faithful question crops.
- Graphiti's MCP server is a quick way to *prototype* temporal memory against Claude. Running Neo4j/FalkorDB alongside Supabase adds ops burden, so the Postgres bi-temporal columns in Section 1 are likely sufficient.

### Gaps
- YouTube URLs, view counts and upload dates for the 2026 talks were not verified; search results linked only ai.engineer pages.
- GitHub stars, commit frequency and release cadence for the listed repos were not collected.
- No notable Portuguese-language (Brazilian) 2026 talks on RAG or document AI for education were found.
