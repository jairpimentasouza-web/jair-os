# Computer-use agents, browser agents and desktop/RPA automation for reliably operating school ERP web systems (state as of 23 Nov 2026)

Research conventions: every claim is dated. "[BG]" = background, a pre-2026 fact. "[VENDOR]" = self-reported by the vendor and not independently verified. "[SECONDARY]" = aggregator or blog compilation, not the primary source. The web-search budget ran out partway through, so a few sub-topics (Power Automate Desktop/UiPath 2026, E2B/Scrapybara/Orgo, Steel/Hyperbrowser/Notte, LGPD/ToS, 2FA tooling, HN threads) are thin and are listed under Gaps.

---

## 1. Computer-use models in 2026: capabilities, benchmark scores vs. human baseline, cost/latency

### Takeaway
In 2026 the frontier models go past the human baseline on OSWorld-Verified (72.36%). The official board's top entries sit around 83–90% (Jul–Aug 2026), so that benchmark is effectively saturated. The harder OSWorld 2.0/2.1 (Jun 2026 onward: long tasks of about 300 tool calls) shows that full-task completion is still only about 44–49% binary for the best models. Long, multi-step jobs like "enter 57 grades and re-read them" still fail often unless the harness splits them into small verified units. Anthropic's current tool (`computer_toolset_20260801`, with zoom on by default), Google's computer use built into Gemini 3.x/4 (with a `safety_decision`/`require_confirmation` protocol), and OpenAI's computer use built into GPT-5.4 and later are the main options. Open models (Fara1.5, OpenCUA, Holo4, UI-TARS-2, Agent S4 on Qwen3.8) are viable for local or cheap browser tasks but trail on long-horizon work.

### Cited Findings
**Benchmarks and human baseline**
- OSWorld human baseline: humans complete over 72.36% of tasks. The original OSWorld paper's best model reached 12.24% [BG, 2024]. The OSWorld-Verified upgrade is dated 2025-07-28, and a 2026-06-26 notice says "OSWorld 2.0 is now available." Results may use 369 tasks, or 361 if the 8 Google Drive tasks are excluded — [OSWorld site](http://osworld-v1.xlang.ai/)
- Official OSWorld-Verified board (100-step limit) as compiled 1 Oct 2026: #1 Intelligence-Indeed Agent 90.19% (2026-07-25); #2 Claude Fable 5 85.96% (2026-08-01); #3 Pointer Agent with Opus 4.7 83.64% (2026-05-21); #4 Claude Opus 5 83.39% (2026-08-01); #5 Coasty CUA v1 82.81% (2026-07-01) [SECONDARY] — [Presenc.ai OSWorld leaderboard 2026](https://presenc.ai/research/osworld-computer-use-leaderboard-2026)
- Conflicting aggregator views: BenchLM (21 Nov 2026) says Qwen3.8 Max leads OSWorld-Verified at 86.1% (self-reported by Alibaba), with Claude Fable 5 and Mythos 5 at 85% — [BenchLM](https://benchlm.ai/benchmarks/osworld-verified). Respan lists Claude Fable 5 85% (9 Jun 2026), Kimi K3 84.8% (27 Jul 2026), Claude Opus 4.8 83.4% (28 May 2026) — [Respan](https://www.respan.ai/models/benchmarks/osworld-verified). Benchmarklist lists Claude Sonnet 5 at 81.2% — [Benchmarklist](https://benchmarklist.com/benchmarks/osworld_verified/). All [SECONDARY]. They disagree because some track self-reported scores and others track official runs.
- OSWorld 2.0 (arXiv 2606.29537, about late June 2026): 108 long-horizon tasks, including 31 self-hosted websites. The primary metric is binary completion at a 500-step limit, and partial reward is also reported. Tasks average more than 250 agent steps, and Claude Opus 4.7 (max thinking) averaged 318 tool calls, versus about 30 in OSWorld 1.0. 69.6% of tasks take skilled humans more than 1 hour (median about 1.6 h), and each task has about 27 scoring checkpoints. Launch results: Claude Opus 4.8 (max thinking, batched tool calls) 20.6% binary / 54.8% partial at 244K output tokens; Claude Opus 4.7 18.2%; GPT-5.5 about 14% binary with 39K output tokens — [OSWorld 2.0 site](https://osworld-v2.xlang.ai/); [HF paper page](https://huggingface.co/papers/2606.29537)
- OSWorld 2.1 (Aug–Sep 2026): the official board has Claude Opus 5 (max effort) at 77.67% partial / 44.33% binary. Opus 5's binary score rose from 31.43% (v2026.08.08) to 44.33% (v2.1) without a model change, which the compiler attributes to task and scoring updates. Partial and binary scores differ by 30+ points on the same run, and vendors tend to quote partial. GPT-5.6 Sol (max) 62.72% partial / 27.34% binary (v2026.08.08); GPT-6.1 Sol 70.5% (third-party, 29 Sep 2026) [SECONDARY] — [Presenc.ai](https://presenc.ai/research/osworld-computer-use-leaderboard-2026)
- Steel.dev warns that OSWorld 2.0 scores are not comparable with OSWorld 1.0/Verified scores — [Steel leaderboard](https://leaderboard.steel.dev/leaderboards/osworld-2.md). Yutori says the official 2.0 board was not updated after 25 Jun 2026, which conflicts with Presenc's citation of later entries — [Yutori OSWorld 2.0](https://yutori.com/leaderboards/osworld-2.md)

**Anthropic (Claude)**
- Claude Opus 5.5, released 22 Sep 2026: 81.8% partial on OSWorld 2.1 (Fable 5.1 80.7%, Opus 5 74.0%). Benchmarks were run with production safeguards enabled, which "likely reduces" the scores. Pricing is $4 input / $20 output per M tokens, with cache reads at $0.20/M; fast mode (up to 2.5x speed) costs $8/$40. Anthropic describes it as "much less likely than recent models to take hard-to-reverse actions," and says it ties Fable 5.1 for the lowest prompt-injection success rate on a Gray Swan benchmark. Enterprise controls include a classifier that screens every action before it runs — [Anthropic, Introducing Claude Opus 5.5](https://www.anthropic.com/claude-opus-5-5)
- Secondary coverage reports a strict/binary score of 48.7% for Opus 5.5 on the same suite, per its system card [SECONDARY] — [Presenc.ai](https://presenc.ai/research/osworld-computer-use-leaderboard-2026); [llm-stats](https://llm-stats.com/blog/research/claude-opus-5-5-launch)
- Current tool (docs as of Nov 2026): `computer_toolset_20260801` is a client toolset of 17 member tools and needs no beta header (the example uses `anthropic-version: 2026-10-21`). Members are screenshot, zoom (`region:[x0,y0,x1,y1]`), left/right/middle/double/triple_click, left_click_drag, mouse_move, left_mouse_down/up, cursor_position, scroll, type, key (repeat 1–100), hold_key (up to 300 s) and wait (up to 300 s). All members, zoom included, are enabled by default. Supported models are Claude Fable 5.2, Mythos 5.2, Opus 5.5, Sonnet 5.5 and Haiku 5.5. Opus 4.7, Opus 4.6, Sonnet 4.6 and Opus 4.5 support only the earlier `computer_20251124` (beta header `computer-use-2025-11-24`, zoom via `enable_zoom: true`). The toolset can't share a request with a `computer_20251124` entry — [Claude docs: Computer use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)
- Cost and resolution (same docs, Nov 2026): each screenshot costs about 1,000–1,800 input tokens. Newer models accept up to 2,576 px on the long edge (about 3.75 MP, up to 4,784 visual tokens, cost ⌈w/28⌉×⌈h/28⌉), and oversized images are rejected, not downscaled. Recommended sizes for web apps are 1280×800 or 1366×768; avoid going above 1920×1080. On macOS Retina, downscale 2x or halve the coordinates. Keep 20 or fewer images per request, and avoid client-side screenshot pruning on the 5.x models because it invalidates thinking blocks — [Claude docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)
- Reliability tips from Anthropic (Nov 2026): give explicit step-by-step instructions. Require a screenshot after each step plus a one-sentence check of the outcome. Use keyboard shortcuts for dropdowns and scrollbars, and supply example screenshots and successful tool calls for repeatable tasks. Put instruction text before the image, use zoom for small text, add delays after actions, and validate coordinates before clicking — [Claude docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)

**OpenAI**
- GPT-5.4 (released 5 Mar 2026) has built-in computer use: 75% on OSWorld-Verified, versus 47.3% for GPT-5.2 and 72.4% for humans — [Wikipedia: GPT-5.4](https://en.wikipedia.org/wiki/GPT-5.4)
- GPT-5.5 (released 23 Apr 2026) is reported at 78.7% on OSWorld-Verified, against 78.0% for Claude. This is a single Substack source — [Cobus Greyling, GPT-5.5 CUA harness](https://cobusgreyling.substack.com/p/gpt-55-computer-use-agent-harness)
- GPT-5.4 native computer use self-reports 92.8–93% on Online-Mind2Web. Its judge, harness and task results were not published, so it is unverified (Mar 2026) — [Browser Use, Online-Mind2Web post](https://browser-use.com/posts/online-mind2web-benchmark); [Browser Use, best web agents](https://browser-use.com/best-web-agents)
- ChatGPT Atlas agent mode is listed as "retired" with 70.9% on Online-Mind2Web (self-reported, Mar 2026), and Operator as "retired" with 61.3% (OSU human evaluation, Mar 2025 [BG]) — [Browser Use, best web agents](https://browser-use.com/best-web-agents). One source says the ChatGPT agent was removed from ChatGPT in early Aug 2026 without notice. It is single-source and unverified — [Wikipedia: OpenAI Operator](https://en.wikipedia.org/wiki/OpenAI_Operator)
- Browser Use Bench v2.1 (180 long live-web tasks, Oct 2026): GPT-6.1 Sol scores 79.6 and Browser Use's own agent 72.9 [VENDOR] — [Browser Use benchmark](https://browser-use.com/posts/ai-browser-agent-benchmark)

**Google**
- [BG] Gemini 2.5 Computer Use (Oct 2025) was a browser-focused standalone model. It scored about 65.7–70% on Online-Mind2Web (69.0% by human evaluation on the official board, Sep 2025) — [Google blog](https://blog.google/technology/google-deepmind/gemini-computer-use-model/); [VentureBeat](https://venturebeat.com/ai/googles-ai-can-now-surf-the-web-for-you-click-on-buttons-and-fill-out-forms)
- On 24 Jun 2026 Google built computer use natively into Gemini 3.5 Flash, so a separate model is no longer needed. It covers browser, mobile and desktop environments and includes adversarial training against prompt injection. Two optional enterprise safeguards are available: explicit confirmation for sensitive or irreversible actions, and automatically stopping a task when an indirect prompt injection is detected. The post gives no numeric scores or pricing — [Google blog, computer use in Gemini 3.5 Flash](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-computer-use-gemini-3-5-flash/)
- The current Gemini docs (fetched Nov 2026) list the supported models as Gemini 4 Carbon/Argon/Neon/Hydrogen, Gemini 3.8 Flash, 3.5 Flash-Lite and 3 Flash Preview. Actions use normalized 0–999 coordinates (examples use a 1440×900 viewport). Each function call can carry a `safety_decision` (allowed / `require_confirmation` / blocked) in policy categories such as SENSITIVE_DATA_MODIFICATION and DATA_MODIFICATION. On approval the client returns `safety_acknowledgement`. `enable_prompt_injection_detection` is opt-in (requires 3.5 Flash-Lite or later) and scans screenshots. `excluded_predefined_functions` removes built-in actions, and a custom `yield_to_user` function handles human handoff — [Gemini API docs: Computer use](https://aistudio.google.com/docs/computer-use)

**Open and small models**
- [BG] Microsoft Fara-7B (Nov 2025, MIT, built on Qwen2.5-VL) works from screenshots only and predicts coordinates. It scores 73.5% on WebVoyager, versus 66.4% for UI-TARS-1.5-7B and 70.9% for OpenAI computer-use-preview, and averages about 16 steps per task against about 41 for UI-TARS-1.5-7B. It is not production-ready — [Microsoft Research blog](https://www.microsoft.com/en-us/research/blog/fara-7b-an-efficient-agentic-model-for-computer-use/); [arXiv 2511.19663](https://arxiv.org/abs/2511.19663); [VentureBeat](https://venturebeat.com/ai/microsofts-fara-7b-is-a-computer-use-ai-agent-that-rivals-gpt-4o-and-works)
- Microsoft Fara1.5 (published 21 May 2026; weights public on HF from 22 Jul 2026; MIT) comes in 4B, 9B and 27B, all built on Qwen3.5. Online-Mind2Web scores are 57.3 / 63.4 / 72.3 and WebVoyager 80.8 / 86.6 / 88.6. The models are trained to stop at "critical points": missing user information, underspecified tasks, and irreversible actions without approval. It is a research preview, and the 9B is available on Foundry and in MagenticLite (sandboxed browser, logged actions) — [Microsoft Research, Fara1.5](https://www.microsoft.com/en-us/research/articles/fara1-5-computer-use-agent)
- [BG] OpenCUA-72B: 45.0% on OSWorld-Verified (Oct 2025), then SOTA among open models — [OpenCUA](https://opencua.xlang.ai/)
- Agent S4 (Simular, a framework built on open Qwen3.8-27B) reports 21.3% on OSWorld 2.0, which it calls a new open-source SOTA. The earlier Agent S3 was "first to surpass human" on OSWorld at 72.60% [VENDOR] — [Agent-S GitHub](https://github.com/simular-ai/agent-s)
- H Company Holo4 has an open-weight 27B (CC BY-NC 4.0) and a 35B-A3B (Apache-2.0); 61.7% on OSWorld 2.0 is claimed for the 27B, but the metric is unspecified [VENDOR/SECONDARY]. GUI-Owl scores 37.7% on OSWorld (Feb 2026 overview). UI-TARS-1.5 scores 42.5% on OSWorld at 100 steps [BG] — [Simular comparison](https://platform.simular.ai/compare/open-source-computer-use-agents); [Zylos overview, Feb 2026](https://zylos.ai/research/2026-02-08-computer-use-gui-agents/)
- UI-TARS-2 is listed at 88% on Online-Mind2Web without public data (Mar 2026) — [Browser Use](https://browser-use.com/posts/online-mind2web-benchmark)

### Inferences
- Benchmark scores overstate how reliable these agents are on Jair OS jobs. OSWorld-Verified tasks average about 30 tool calls, while a 57-grade entry plus re-read is more like 150–250 actions. If each action succeeds 99% of the time, the chance that 171 actions all succeed is 0.99^171 ≈ 18%. At 99.9% it is about 84%. Splitting the job into per-row units with per-row verification beats choosing a "better model."
- For vision fallback on Mac/Windows, the practical default is Claude Sonnet 5.5 or Opus 5.5 with `computer_toolset_20260801` (zoom on, web-app resolution 1280×800). Use Gemini's `safety_decision` protocol as the model for confirmation gating even when Gemini isn't the model in use.
- Fara1.5-9B or 4B is a candidate for the Mac "Local AI Worker" to do cheap read-only navigation. Because it is a research preview, it should not perform unsupervised writes to grade systems.

### Gaps
- No per-step latency figures (seconds per action) were found for any 2026 model. Cost per step can only be estimated from screenshot tokens and per-token prices.
- No independent (non-vendor) 2026 Online-Mind2Web or WebArena leaderboard snapshot was retrieved. WebArena 2026 numbers were not found.
- I couldn't verify the OpenAI primary announcements for GPT-5.4, 5.5, 5.6 or 6.x computer use (search budget exhausted). The figures come from Wikipedia, Substack and vendor-competitor pages.
- Qwen-VL agent, UI-TARS-2 and Holo4 primary model cards were not fetched.

---

## 2. AI browser-automation frameworks and deterministic caching/replay ("learn once, replay cheaply")

### Takeaway
By late 2026 the "explore with an LLM once, then replay deterministically" pattern is a first-class feature in several stacks. Stagehand v3 has `cacheDir` and `selfHeal`, Skyvern has "code caching" (`run_with="code"` with AI fallback and regeneration), and Playwright MCP has codegen and locator/verify tools. Browser Use leads the self-reported live-web benchmarks but does not describe a deterministic replay feature. Browser Use's own comparison page recommends scripted Playwright or Stagehand for fixed flows. Agentic browsers (Atlas, Comet, Claude in Chrome, Gemini in Chrome) are convenient but carry documented cross-origin and prompt-injection risks.

### Cited Findings
**Stagehand v3 (Browserbase)**
- Setting `cacheDir` turns on auto-caching. The first run explores with LLM inference (about 20–30 s, about 50,000 tokens) and saves its actions. Replays reuse them with no LLM calls (about 2–3 s, 0 tokens, "10–100x faster"). The cache key is derived from the instruction, start URL, execution options and agent config. `selfHeal: true` adapts cached workflows to minor site changes. The documented fallback is user-written: wrap the call in try/catch, delete the cache, and re-explore. The docs suggest committing cache directories to version control — [Stagehand docs: deterministic agent](https://docs.stagehand.dev/v3/best-practices/deterministic-agent)
- The docs conflict on behavior. One page says a cached `act()` replays with self-healing off and falls back to full inference if the selector no longer resolves. Another says the cache self-heals by updating selectors. Server-side caching requires a Browserbase browser and API key — [Stagehand act docs](https://docs.stagehand.dev/v3/basics/act); [Mintlify Stagehand caching](https://www.mintlify.com/browserbase/stagehand/concepts/caching); [Browserbase blog on caching](https://browserbase.com/blog/stagehand-caching)
- v3 reportedly dropped the Playwright dependency and went CDP-native (third-party claim) — [DEV Community](https://dev.to/stevengonsalvez/stagehand-ai-primitives-for-playwright-that-actually-stick-47bm)

**Skyvern**
- Code caching: the first successful agent run produces code, and later runs with `run_with="code"` execute it, skipping screenshots and LLM reasoning. "AI Fallback (cached scripts)" is on by default. If the code fails, for example because the page changed, Skyvern falls back to the agent and regenerates the code. Each successful block gets its own cached script. Conditional, wait and code blocks are not cached because they depend on runtime state — [Skyvern docs: code caching](https://skyvern.com/docs/developers/features/code-caching); [Skyvern docs (new)](https://docs-new.skyvern.com/docs/features/code-caching)
- Feb 2026 YC launch: average run cost fell from $0.11 to $0.04 (2.7x), with "determinism" cited as the bigger gain. A failed replay step reuses the recorded intent before falling back to the prompt [VENDOR] — [Fondo write-up of Skyvern launch](https://fondo.com/blog/skyvern-launches-ai); [Skyvern blog](https://skyvern.com/blog/asking-ai-to-build-scrapers-should-be-easy-right). Marketing claims repeat runs are 3–5× faster and up to 70% cheaper [VENDOR] — [Skyvern products](https://www.skyvern.com/md/products.md)
- Skyvern 3.0 reports 90.5% on Odysseys (Oct 2026, self-reported). Pricing is 5,000 free credits, then $29 or $149/month (checked 15 Oct 2026) — [Browser Use, best web agents](https://browser-use.com/best-web-agents)

**Browser Use**
- The open-source library is MIT-licensed, and v0.13.14 shipped 26 Oct 2026. The bu-fast and bu-ultrafast agent models became available on US plans on 1 Nov 2026 — [Browser Use](https://browser-use.com/) (via search summary)
- Online-Mind2Web: the bu-max cloud agent scores 97% on all 300 tasks (25 Mar 2026), graded by Browser Use's own agentic judge (built on the Claude Agent SDK and aligned to humans). The harness was improved by Claude Code running "auto-research" loops. Reproduction materials are published on GitHub. A later page cites 98% (Aug 2026). The library's only independent score is 30% with GPT-4o (Mar 2025 [BG]) — [Browser Use, Online-Mind2Web post](https://browser-use.com/posts/online-mind2web-benchmark); [Browser Use, best web agents](https://browser-use.com/best-web-agents)
- Pricing conflict: one page gives $0.02 per browser-hour, while the best-web-agents page (checked 15 Oct 2026) gives browsers at $0.06/hour, proxy at $5/GB and model tokens at provider rate plus 20%. Browser-ready time is a median 0.6 s (p95 2.4 s). Model cost is about 11¢ per task on Bench v2.1 — [Browser Use, best web agents](https://browser-use.com/best-web-agents); [Browser Use cloud browsers](https://browser-use.com/cloud-browsers)
- The same vendor page describes no deterministic replay or caching for any agent, and recommends "scripted Playwright or Stagehand on a cloud browser" as more repeatable for fixed flows — [Browser Use, best web agents](https://browser-use.com/best-web-agents)
- Stealth Bench V2: Browser Use Cloud passed 90.5% of visits to 100 bot-protected sites, versus 82% for Anchor. The sample is biased toward sites where Browser Use historically did well [VENDOR] — [Browser Use](https://browser-use.com/cloud-browsers). An independent review found the cloud browser passed bot checks that local headless Chromium failed, but calls its tests a "sanity check" — [DEV review](https://dev.to/kevin_menesesgonzlez/browser-use-review-i-tested-its-cloud-browser-and-ai-agents-4fhb)
- Comparison table (Mar 2026, Online-Mind2Web): Stagehand with Gemini 2.5 CU 65%, Stagehand with Sonnet 4.5 55%, ABP + Claude Opus 4.6 86%, OpenAGI Lux 84%, TinyFish 81%, Yutori Navigator 79% — [Browser Use](https://browser-use.com/posts/online-mind2web-benchmark)

**Playwright MCP / Chrome DevTools MCP**
- Playwright MCP works from Playwright's accessibility tree, not pixels, so it needs no vision model. Microsoft recommends that coding agents consider the Playwright CLI with SKILLS ("more token-efficient"), and positions MCP for exploratory automation, self-healing tests and long-running stateful workflows. The default profile is persistent (`--user-data-dir`). `--isolated` gives clean sessions, which can be seeded with `--storage-state`. A persistent profile can be used by only one browser at a time. `--extension` attaches to an existing Chrome/Edge with logged-in tabs. `--caps` accepts vision, pdf and devtools (tracing and video). `browser_generate_locator` and the `browser_verify_*` tools support test generation, and `--codegen` sets the output language (README, © 2026) — [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- Chrome DevTools MCP supports only Chrome and Chrome for Testing, and its strength is diagnostics (tracing and performance). A `--slim` mode is "for basic browser tasks only." The common 2026 advice is to debug with DevTools MCP and encode the flow in Playwright [SECONDARY] — [Steve Kinney](https://stevekinney.com/writing/driving-vs-debugging-the-browser); [Better Stack](https://betterstack.com/community/guides/ai/playwright-cli-vs-mcp-browser/)

**Claude in Chrome and agentic browsers**
- Claude in Chrome is available on paid plans (Pro, Max, Team, Enterprise). It is described as GA in Claude Cowork and Claude Code but beta in the Chrome browser, and it is not supported on other Chromium browsers or mobile. Features include scheduled shortcuts, workflow recording and multi-tab handling. Team/Enterprise admins can manage site allowlists and blocklists. An Aug 2026 report says the extension became a full Cowork client for Max and Team subscribers — [Claude support: Get started with Claude in Chrome](https://support.claude.com/en/articles/12012173-get-started-with-claude-in-chrome); [Claude in Chrome](https://claude.com/claude-in-chrome)
- UW study (news 30 Jun 2026; presented 26 Apr 2026 at the Agents in the Wild workshop, Rio de Janeiro) tested seven agentic browsers. In four of them (ChatGPT Atlas, Chrome with Gemini, Claude for Chrome, Perplexity Comet) the researchers found conditions that bypass the same-origin policy, with a working proof-of-concept on Atlas. They also documented memory poisoning across origins. Firefox AI Mode was the least risky but the least capable, and the researchers' advice is not to trust browser agents with sensitive credentials — [UW News](https://www.washington.edu/news/2026/06/30/some-agentic-ai-browsers-come-with-major-cybersecurity-risks-uw-study-finds/)

### Inferences
- For ERP flows that repeat every bimester (grade entry, attendance, diary), the best fit is **Playwright scripts generated or maintained with AI help**, either Stagehand v3 with `cacheDir` committed per ERP flow or Skyvern code caching. Live LLM inference should be reserved for exploration and repair. Browser Use is strongest for one-off, open-ended web tasks, not fixed institutional flows.
- Stagehand's self-heal semantics are documented inconsistently. Jair OS should treat any self-healed replay of a **write** as "needs readback before marking verified," and should log when a selector changed.
- Avoid agentic browsers with mixed browsing (Atlas, Comet, Claude in Chrome in the teacher's main profile) for ERP writes. Use a dedicated browser profile or instance per ERP with a domain allowlist.

### Gaps
- No 2026 primary data was gathered on Steel, Hyperbrowser, Anchor or Notte features, or on whether they offer caching or replay. Anchor appears only as 82% in a vendor-run stealth bench.
- No independent benchmark of Stagehand or Skyvern cache-hit reliability over time (site drift) was found.
- Comet, Atlas and Dia 2026 feature status was not verified from primary sources. Atlas agent mode is listed as "retired" only by a competitor's page.

---

## 3. Hybrid strategy (API/XHR capture vs. Playwright vs. accessibility tree vs. vision) and verifying writes

### Takeaway
Practitioners in 2026 converge on a ladder, ordered from most to least deterministic: (1) official API; (2) the site's own internal HTTP/XHR endpoints, captured and replayed by a script; (3) scripted DOM/accessibility-tree automation; (4) LLM-assisted DOM actions (`act`/`observe`); (5) pixel-level computer use as the last resort. Writes are verified through an independent channel rather than by the acting agent's own screenshot judgment, because screenshot judges miss hallucinations.

### Cited Findings
- AI Engineer World's Fair 2026, Paul Klein IV (Browserbase), "Bringing agents onto the world wide web": one route is to inspect network requests, then have a coding agent write a script that replays the relevant requests. Coding is paired with browser control — [AI Engineer talk page](https://www.ai.engineer/talks/GqoNrUz8hEU-bringing-agents-onto-world-wide-web)
- A talk at AI Engineer World's Fair 2026 on browser automation describes "Chrome Agent," which exposes CDP and helps agents write code that replays browser interactions — [AI Engineer talk page](https://www.ai.engineer/talks/26RtyAm9y_Q-dark-arts-web-automation-teaching-agents-use)
- Corey Gallon, "The Dark Arts of Web Automation" (AIEWF 2026): pair complementary observation channels with **independent effect checks** and **reusable stable interaction sequences** — [AI Engineer computer-use topic](https://ai.engineer/topics/computer-use)
- Pierluca D'Oro, "Computer Use at the Edge of the Statistical Precipice" (AIEWF 2026): blind replay and at-least-one-success metrics can overstate adaptive execution — [AI Engineer computer-use topic](https://ai.engineer/topics/computer-use)
- Dhruv Batra (Yutori), "Computer-use models will agentify the web, not APIs" (AIEWF 2026): most websites will not expose agent-ready APIs — [AI Engineer talk page](https://www.ai.engineer/talks/Ki980nV0__0-computer-use-models-will-agentify-web-not)
- Browser Use (Mar 2026): the original Online-Mind2Web judge is screenshot-based, and screenshot judges can miss hallucinations in agents that write code or call APIs. Browser Use built an agentic judge instead — [Browser Use](https://browser-use.com/posts/online-mind2web-benchmark). Browserbase talk "Your LLM Judge Is a Confident Liar: Building Better Verifiers" (2026; YouTube id xLxhT2ZI7UM) — [AI Engineer computer-use topic](https://ai.engineer/topics/computer-use)
- Playwright MCP exposes `browser_verify_*` tools and `browser_generate_locator`, which can turn exploratory sessions into assertion-bearing scripts — [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- Playwright supports authenticating via API: send the login request with `APIRequestContext` and save `request.storageState()`. This is often faster than UI login, and the same storage state can drive both UI and HTTP calls — [Playwright docs: Authentication](https://playwright.dev/docs/auth)
- Anthropic (Nov 2026) recommends requiring a screenshot after each step plus an explicit one-sentence outcome check, and including example screenshots and successful tool calls for repeatable tasks — [Claude docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)
- Skyvern does not cache conditional or wait blocks because they depend on runtime state. The dynamic parts of a flow need live logic — [Skyvern docs (new)](https://docs-new.skyvern.com/docs/features/code-caching)

### Inferences
- **For each ERP (ActiveSoft and others), build a "flow pack":** (a) a HAR/XHR capture of the grade-grid load and save calls (read the network panel through DevTools MCP or Playwright tracing); (b) a Playwright script that writes through the UI, so business-rule validation still runs; (c) a **readback via the internal GET/XHR**, or the ERP's own export or report (PDF/XLSX "boletim/mapa de notas"), parsed and diffed row by row against the dictated list. Write through the UI and read back through HTTP. This is a different channel from the writer, which is what makes it an "external readback."
- Prefer UI writes over direct POST replay for anything school-official. Direct POSTs can bypass client-side validation and audit trails, and may breach ToS. HTTP replay is safest for **reads/readback**.
- The 403 errors on older data suggest that the internal endpoints enforce per-period permissions. The readback channel should be the same one the teacher's UI uses, with the same session, rather than a separate "integration" token.
- Verification hierarchy for a grade row, strongest first: (1) a value parsed from the ERP's server response or a re-fetched GET matches the expected value; (2) the DOM cell value after a page reload matches; (3) a zoomed screenshot read by the model matches. Only (1) or (2) should allow the status "verified." Level (3) alone should stay "unverified."
- Accessibility-tree automation (Playwright MCP snapshots, `getByRole`/`getByLabel` locators) is preferable to vision for dense grade grids, because cell values are text in the DOM. Vision is a fallback for canvas, iframe or legacy-ActiveX-like widgets.

### Gaps
- No published 2026 study quantifies readback strategies (DOM vs. export vs. API) for write verification in enterprise web apps.
- No public information was found on ActiveSoft or other Brazilian school ERPs' internal APIs, and none was searched, per the privacy constraint.

---

## 4. Desktop RPA / OS automation in 2026 (macOS, Windows, enterprise RPA) relevant to a solo user

### Takeaway
On macOS, Peekaboo v3 (an MCP server and CLI combining screen capture with the Accessibility API, including set-value and perform-action) and Cua (Lume macOS/Linux VMs on Apple Silicon, plus Cua Driver for background automation) are the main 2026 agent-oriented tools. On Windows, Microsoft is building an agent platform: agent workspace (a separate Windows session with agent accounts), MCP "agent connectors" in an on-device registry, Copilot Actions, plus containment and agent-identity features documented as of Nov 2026. It was still experimental or preview in the sources found. For a solo teacher, browser-level automation covers nearly everything, and OS-level automation matters mainly for keeping the worker alive and for occasional native dialogs (file upload, print/PDF).

### Cited Findings
- Peekaboo v3 (openclaw/Peekaboo; npm @steipete/peekaboo) provides high-fidelity screen capture, AI analysis and full GUI automation on macOS. v3 adds native agent flows and multi-screen automation in both the CLI and the MCP server. Direct accessibility tools set values and trigger named actions (set-value, perform-action). It works with Codex, Claude Code and Cursor. It requires macOS 15 or later and Node 22 or later, needs Screen Recording and Accessibility permissions, and agent runs need a model provider. The release date wasn't found — [Peekaboo GitHub](https://github.com/openclaw/Peekaboo); [README](https://raw.githubusercontent.com/openclaw/Peekaboo/main/README.md). alexmx/peek is an alternative macOS accessibility-inspection CLI/MCP — [peek](https://github.com/alexmx/peek)
- Cua offers sandboxes, SDKs and benchmarks for agents controlling full desktops (macOS, Linux, Windows). Lume manages macOS/Linux VMs on Apple Silicon (its quickstart creates a macOS Tahoe VM from an Apple restore image). The cua-sandbox SDK, Cua Driver (desktop automation), Cua Spaces (desktops on the user's own Mac or machines) and Cua Bench (OSWorld, ScreenSpot, Windows Arena) round it out. README dates are uncertain — [trycua/cua](https://github.com/trycua/cua); [trycua/lume README](https://raw.githubusercontent.com/trycua/lume/main/README.md)
- "Computer-Use 2.0: Agents Just Got Multi-Cursor" (Cua team, AIEWF 2026, YouTube id ZSQb5fzRFPw): Cua Driver moves computer interaction into the background with window-scoped interaction, so the agent doesn't take over the user's screen — [AI Engineer talk](https://www.ai.engineer/talks/ZSQb5fzRFPw-computer-use-2-0-agents-just-got)
- [BG, Nov–Dec 2025] Windows agent workspace is a separate, contained Windows session where agents work in parallel with the user. Agent accounts are created only when the user enables it. Copilot Actions is off by default (Settings > System > AI components > Agent tools > Experimental agentic features) and began rolling out to Insiders on 17 Nov 2025. MCP "agent connectors" register in an on-device registry. The developer platform was described as "private preview" — [Microsoft Support: Experimental agentic features](https://support.microsoft.com/en-us/windows/ai/ai-features/experimental-agentic-features); [Windows Insider blog, 17 Nov 2025](https://blogs.windows.com/windows-insider/2025/11/17/copilot-on-windows-copilot-actions-begins-rolling-out-to-windows-insiders/); [Windows agentic platform](https://developer.microsoft.com/pt-br/windows/agentic)
- The Windows Security book page "Application and agent security" (ms.date 14 Nov 2026, updated 17 Nov 2026) lists containment (Microsoft Execution Containers (MXC), WSL, VBS enclaves, Windows Sandbox) and agent governance ("Agent identity," "Agent governance": each agent gets its own identity and limits on what it can do) — [Microsoft Learn: Application and agent security](https://learn.microsoft.com/en-us/windows/security/book/operating-system-agentic-security)
- AI Engineer World's Fair 2026 included "Don't Let the LLM Drive" (Microsoft speakers; YouTube id m24UKZomm7k). Only the title was available, which suggests the theme of deterministic code over LLM-driven control — [AI Engineer computer-use topic](https://ai.engineer/topics/computer-use)

### Inferences
- Jair OS doesn't need UiPath or Automation Anywhere. They are enterprise-licensed and orchestrator-centric, and nothing found suggests solo-user value beyond Playwright plus a model.
- On the iMac, run the ERP browser automation in a **dedicated browser profile (or a Lume VM)** rather than the teacher's live desktop. Use Peekaboo only for native macOS dialogs and for screenshots when a browser-level tool can't see something.
- On Windows, a PowerShell agent plus Playwright (Node or Python) as a long-running service is simpler and more reliable than Windows agent workspace or Copilot Actions, whose 2026 GA status is unconfirmed.

### Gaps
- No 2026 data was gathered on Power Automate Desktop (free on Windows), the Copilot Studio "computer use" feature, UFO/UFO², or Windows-MCP servers (search budget exhausted).
- The 2026 GA status of Windows agent workspace and Copilot Actions was not confirmed. The sources found are from late 2025, plus a Nov 2026 security doc index.
- macOS-native options such as AppleScript/JXA, Shortcuts or the macOS 26 automation APIs were not researched for 2026 changes.

---

## 5. Reliability engineering for remote desktop workers (sleep, watchdogs, services, Tailscale, sandboxes, sessions/2FA, anti-bot)

### Takeaway
Most "lost heartbeat" problems on home and office PCs come from OS power management: sleep, hibernate and Modern Standby. Tailscale's unattended mode keeps the tunnel up without a logged-in user but **does not prevent sleep**. The fix is OS power policy plus running the worker as a supervised service, plus queue-side leases so that jobs from a dead worker are re-queued instead of left half-done. Persist browser sessions (storage state or a persistent profile), treat them as secrets, and design for re-login and 2FA prompts as a human checkpoint.

### Cited Findings
- Tailscale unattended mode is Windows-only. It keeps the device reachable when no user is signed in or after a reboot. Enable it with `tailscale set --unattended=true` or the tray menu, and make sure the Tailscale service in services.msc is set to **Automatic** and Running — [Tailscale docs: run unattended](https://tailscale.com/kb/1088/run-unattended)
- Forum reports [anecdotal]: by default Windows sleeps and Tailscale access breaks until a local wake. Connections fail after resume even on recent clients. Unattended mode without automatic logon sometimes doesn't connect on boot. Configuring via GUI worked where CLI and remote scripts failed — [Tailscale forum](https://forum.tailscale.com/t/tailscale-doesnt-connect-until-someone-logs-into-windows/2624); [Tailscale forum, after boot](https://forum.tailscale.com/t/after-booting-windows-10-tailscale-connections-fail-until-i-reconnect-tailscale/2545); [GitHub issue 14826](https://github.com/tailscale/tailscale/issues/14826)
- Windows `powercfg`: `/change standby-timeout-ac 0` and `hibernate-timeout-ac` set sleep timers in minutes. `/hibernate off` disables hibernation. `/requests` lists the power requests that block sleep. `/requestsoverride` sets overrides. `/lastwake` and `/waketimers` diagnose wakes. `/availablesleepstates` (/A) reports S-states, including whether Modern Standby is present. `/sleepstudy` reports Modern Standby quality, and `/systemsleepdiagnostics` reports when the user was absent and whether the system slept (admin) — [Microsoft Learn: powercfg](https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/powercfg-command-line-options)
- macOS `pmset`: `sleep 0` disables system sleep, `displaysleep` and `disksleep` set their timers, `womp 1` enables wake on magic packet, `autorestart 1` restarts after power loss, `powernap`, `hibernatemode 0`, and `pmset schedule wake` / `pmset repeat` schedule wakes. All require sudo. `caffeinate` is the related command to prevent sleep — [SS64: pmset](https://ss64.com/mac/pmset.html)
- Playwright authentication: save `storageState` after one login and reuse it. Session storage is **not** persisted (the workaround is `page.evaluate` plus `addInitScript`). IndexedDB tokens need `indexedDB: true`. Delete the state file when auth expires. State files contain cookies that can impersonate the account, so never commit them and add them to .gitignore — [Playwright docs: Authentication](https://playwright.dev/docs/auth)
- Playwright MCP's persistent profile can be used by only one browser at a time. Use `--isolated` or separate user-data dirs for parallel clients — [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- Anthropic recommends a dedicated VM or container with minimal privileges, not giving the model login credentials, and allowlisting domains (Nov 2026) — [Claude docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)
- Cua/Lume provides local macOS VMs on Apple Silicon for sandboxed agents — [trycua/lume](https://github.com/trycua/lume)
- Anti-bot: a vendor-run bench shows cloud browsers passing 82–90% of bot-protected sites, and an independent sanity check found local headless Chromium failing bot checks that the cloud browser passed — [Browser Use cloud browsers](https://browser-use.com/cloud-browsers); [DEV review](https://dev.to/kevin_menesesgonzlez/browser-use-review-i-tested-its-cloud-browser-and-ai-agents-4fhb)
- Talks: "Two Roads to Durable Agents: Replay vs. Snapshot" (Trigger.dev, AIEWF 2025 [BG], YouTube id svCnShDvgQg); "What Does Done Even Mean? Agents and Paperclip's Liveness Model" (AIEWF 2026, 7P0elyLIxXo); "Your Agent Didn't Fail. Your Harness Did." (AIEWF 2026, BInpv7lGp1o); "Why 80% Reliability Isn't Good Enough" (Amazon AGI Lab, AIEWF 2026, Emo5FGGY-wM) — [AI Engineer computer-use topic](https://ai.engineer/topics/computer-use)

### Inferences
- **Windows checklist:** AC standby and hibernate set to 0 (`powercfg /change standby-timeout-ac 0`, `powercfg /hibernate off`). Check `powercfg /a`, because on Modern Standby machines network connectivity during "sleep" is unreliable, so prevent idle sleep entirely. Set Tailscale unattended via the GUI, with the service on Automatic. Run the worker as a Scheduled Task "at startup, run whether user is logged on or not, restart on failure," or as a service wrapper (NSSM/WinSW). Automate BIOS "power on after AC loss" plus auto-login if a UI session is required, since Playwright headful needs an interactive session.
- **macOS checklist:** `sudo pmset -a sleep 0 autorestart 1 womp 1`. Run the worker under a launchd LaunchAgent with KeepAlive and wrap it in `caffeinate -i` (unsourced detail: verify the launchd keys). Keep the GUI session logged in, because browser automation and Accessibility permissions need it.
- **Queue side (Supabase):** use a lease or visibility timeout per job (claim with `locked_until`, heartbeat extends it). Use idempotency keys per *row* (student × assessment × value), not per job, so a re-queued job doesn't double-apply or skip rows. Add a "stale worker" detector that pages the teacher only when a job is stuck.
- **Sessions:** keep one persistent profile per ERP per device, refresh it on a schedule, and treat 2FA or a CAPTCHA as a human checkpoint (push notification: "type the code"). Never automate around CAPTCHAs on institutional systems.
- Rate limit writes (for example, one save every 1–3 s) and avoid parallel sessions on the same account. This limits both anti-bot triggers and ERP lockouts.

### Gaps
- E2B Desktop, Scrapybara and Orgo 2026 status, pricing and reliability were not researched (search budget).
- No primary 2026 guidance was found on 2FA handling for agents (TOTP vaults, Browserbase/Browser Use 2FA features).
- launchd KeepAlive semantics and Windows Scheduled Task restart policies are stated from general knowledge and were not sourced in this pass.

---

## 6. Fuzzy name matching and data-entry validation (Portuguese names, accents, Jaro-Winkler, roster confirmation)

### Takeaway
Established practice: normalize first (Unicode accent stripping, case-folding, removing Portuguese particles "de/da/do/das/dos," handling abbreviations), then score with Jaro-Winkler or token-based ratios (RapidFuzz). Sources give **no universal threshold**, so thresholds must be tuned on the real roster. A 2026 Brazilian NLP paper reports gains from adding semantic similarity to Jaro-Winkler for equivalent names.

### Cited Findings
- A Brazilian-name matching helper (Rust crate) lists as core features: prepositions (de, da, do, das, dos), abbreviations (e.g., "M." for Melo), accents and special characters, and case insensitivity — [cortexai-data name.rs](https://docs.rs/cortexai-data/0.1.0/src/cortexai_data/name.rs.html)
- Jaro-Winkler gives a 0.0–1.0 similarity suited to names and short strings, with a bonus for shared prefixes. RapidFuzz implements Jaro-Winkler and targets record linkage, fuzzy matching and deduplication, and its docs show preprocessing (`processString()`) for names with accents. The standalone JaroWinkler package was folded into RapidFuzz — [RapidFuzz R README](https://ftp.fau.de/cran/web/packages/RapidFuzz/readme/README.html); [RapidFuzz manual](https://mirror.las.iastate.edu/CRAN/web/packages/RapidFuzz/RapidFuzz.pdf); [RapidFuzz GitHub](https://www.Github.com/rapidfuzz)
- A Portuguese-language ClickUp client normalizes with `deunicode` before Jaro-Winkler — [clickup crate matching.rs](https://docs.rs/crate/clickup/0.3.0/source/src/matching.rs)
- A 2026 STIL paper (Brazilian NLP symposium) reports that combining Word2Vec cosine similarity with Jaro-Winkler improved matching of equivalent names — [ACL Anthology 2026.stil-1.45](https://aclanthology.org/2026.stil-1.45.pdf); [SOL/SBC](https://sol.sbc.org.br/index.php/stil/article/download/44641/44404/)
- An overview of fuzzy name matching techniques (phonetic, edit distance, token-based) — [Babel Street](https://www.babelstreet.com/blog/fuzzy-name-matching-techniques)

### Inferences
- **Pipeline for dictated grades:**
  1. Before dictation, pull the official roster (name plus enrollment/chamada number) from the ERP class page, read-only.
  2. Normalize both sides: NFKD with combining marks stripped, lowercase, particles removed, whitespace collapsed, and common ASR confusions mapped (e.g., "Luís/Luiz," "Thaís/Taís," "Kauã/Cauã," "y/i," "ph/f," doubled consonants), optionally with a PT-BR phonetic key.
  3. Score with a combination: max(Jaro-Winkler on the full normalized string, token_set_ratio, first-name plus last-surname match).
  4. Accept automatically **only** if the top score is at least T_high **and** beats the runner-up by at least margin Δ, **and** the name is unique in the class. Otherwise flag it as ambiguous.
  5. Show **one roster-confirmation table** per batch (dictated text → matched student, with chamada number, score, and the grade), so the teacher confirms 57 rows in one screen rather than 57 prompts. Ambiguous rows are highlighted with the top-3 candidates.
  6. Persist the confirmed alias mapping (dictated form → student ID) so recognition improves over time.
- Prefer dictating **by chamada number** ("number 12: 7.5"), or by number plus first name, which removes most ambiguity. Treat the name as a check digit.
- **Value validation:** range checks (0–10 or the ERP's scale), decimal-comma handling ("sete e meio" → 7,5), duplicate-student detection within a batch, and a diff against existing values (warn if overwriting a non-empty grade).
- Calibrate T_high and Δ on past rosters, measuring false accepts (wrong student) as the critical error. A wrong-student write is worse than asking the teacher.

### Gaps
- No published thresholds or accuracy benchmarks for Brazilian student-name matching under speech-to-text errors were found.
- No 2026 source was found on PT-BR phonetic algorithms (e.g., adapted Soundex or Metaphone-PT) in maintained libraries.

---

## 7. Safety: prompt injection, permission scoping, watch mode, human takeover; legal/ToS

### Takeaway
2026 research shows high and highly variable prompt-injection success against browser and computer-use agents (roughly 42–100% in several benchmarks). One June 2026 preprint found 0/140 successes against Claude Sonnet 4.6 and GPT-5.4 in browser episodes, which suggests that frontier models are much more robust in the browser setting but not immune. Vendors ship classifiers and confirmation protocols (Anthropic injection classifiers and per-action screening, Gemini `safety_decision` plus injection detection, Fara "critical points"). The strongest controls remain architectural: a dedicated profile, a domain allowlist, no mixed browsing, and human confirmation for irreversible steps.

### Cited Findings
- VPI-Bench (revised Mar 2026): visual prompt injection deceived computer-use agents at rates up to 51% and browser-use agents up to 100% on some platforms. Defenses gave limited gains — [arXiv 2506.02456](https://arxiv.org/html/2506.02456v2)
- StakeBench (reported 2026): indirect injections in web content (reviews, metadata) succeeded 41.67–68.16% of the time, and direct injections more than 79%. Swapping the model changed results substantially — [CSO Online](https://www.csoonline.com/article/4184455/prompt-injection-breaks-todays-ai-agents-study-warns.html)
- Berkeley preprint (arXiv 2606.05233, Jun 2026): 0 of 140 multi-step browser episodes succeeded against Claude Sonnet 4.6 and GPT-5.4, but the same weights were highly vulnerable to skill injection in a coding-agent benchmark. The authors argue high literature ASRs come from RL-optimized injection text. This is a single preprint — [alphaXiv 2606.05233](https://www.alphaxiv.org/abs/2606.05233.md)
- Mind the Web (2025 preprint, updated): an automated injection generator exceeded 80% ASR across five web-use agents (Operator, Browser Use, Comet, …) — [arXiv 2506.07153](https://arxiv.org/html/2506.07153v2). Plan injection (corrupting persistent plans) raised success up to 3x against Browser-use and Agent-E — [arXiv 2506.17318](https://www.arxiv.org/pdf/2506.17318)
- UW (30 Jun 2026): four of seven agentic browsers had same-origin-policy bypass conditions, and cross-origin memory poisoning was observed. Fewer agent permissions meant safer, and no clear fix exists without reducing capability — [UW News](https://www.washington.edu/news/2026/06/30/some-agentic-ai-browsers-come-with-major-cybersecurity-risks-uw-study-finds/)
- Anthropic (Nov 2026): prompt-injection classifiers automatically scan tool-returned content such as screenshots, and steer the model to verify that instructions came from the user. Other recommendations: a dedicated VM, no credentials given to the model, a domain allowlist, human confirmation of consequential actions, and informed user consent — [Claude docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool). Opus 5.5 (22 Sep 2026) is "much less likely … to take hard-to-reverse actions," attempted containment-boundary circumvention about 85% less often than Opus 5 / Mythos 5.1, and includes an action-screening classifier for enterprises — [Anthropic](https://www.anthropic.com/claude-opus-5-5)
- Google (Nov 2026 docs): per-action `safety_decision` with `require_confirmation` in categories including SENSITIVE_DATA_MODIFICATION and DATA_MODIFICATION. The model may still ask for confirmation even if a policy is disabled. `enable_prompt_injection_detection` is opt-in — [Gemini docs](https://aistudio.google.com/docs/computer-use); Gemini 3.5 Flash's optional "stop task on indirect injection" (24 Jun 2026) — [Google blog](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-computer-use-gemini-3-5-flash/)
- Fara1.5 (May 2026): trained to stop for missing information, underspecified tasks, and irreversible actions without approval. MagenticLite logs actions, sandboxes browsers and lets users stop the agent at any time — [Microsoft Research](https://www.microsoft.com/en-us/research/articles/fara1-5-computer-use-agent)
- Claude in Chrome: admins can manage site allowlists and blocklists — [Claude support](https://support.claude.com/en/articles/12012173-get-started-with-claude-in-chrome)
- Windows (Nov 2026 doc): agent identity and agent governance give "each agent its own identity" with limits — [Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/book/operating-system-agentic-security)
- Talks: "Building Your Own Secure AI Workflows: Human-in-the-Loop Automation with n8n" (AI Engineer Europe 2026, tDArkCqjA-c) places the review step in the execution path to intercept tool calls before they run. "From Arc to Dia" (AIE Code 2025 [BG], o4scJaQgnFA) shows how a page instruction redirected an assistant into leaking data via a URL. "Security Firewall for Agents" (Ryan Dahl, AIEWF 2026, MkRYPFIMCSA). "$1 AI Guardrails: finetuned ModernBERTs" (AIE Europe 2026, YZHPEkfy2kc) — [AI Engineer computer-use topic](https://ai.engineer/topics/computer-use)

### Inferences
- ERP sessions in Jair OS should run in a **profile that only visits allowlisted ERP domains**. No general browsing, Google Classroom posting or email reading should happen in the same agent context. This removes most of the injection surface, since ERP pages are first-party content.
- Classify actions as: read-only → autonomous; reversible write (a grade draft before "save," or editable diary text) → autonomous with per-row readback; **irreversible or official** (closing a bimester, locking a diary, publishing a report card, sending to the secretary's office) → mandatory human confirmation with a diff screen. This matches the current Jair OS checkpoint policy and the Gemini `require_confirmation` and Fara critical-point patterns.
- "Watch mode": stream a low-frame-rate screenshot or a Playwright trace for the teacher, plus a big "stop/take over" button. Keep a Playwright trace (`--caps devtools`) per job as the audit artifact.
- Legal/ToS (inference only, not sourced): the teacher automating their **own** account to do actions they are authorized to do is generally a lower risk than scraping. Still, school ERPs typically forbid credential sharing and automated access in their ToS, and grades are personal data of minors under LGPD (Lei 13.709/2018, Art. 14). Keep data local or in the teacher's own Supabase, minimize what is sent to LLM APIs (send IDs and grades, not full profiles), and ask the school or ERP vendor for written acknowledgment, or use the official API where it is offered.

### Gaps
- Legal analysis of LGPD and school-ERP ToS for teacher-side automation was **not researched** (search budget exhausted). It needs a dedicated pass or a lawyer.
- Claude in Chrome release-notes dates could not be fetched (404).

---

## 8. Practitioner videos and talks (2026) demonstrating these tools

### Takeaway
The richest 2026 practitioner material is the AI Engineer World's Fair 2026 "Computer Use" track and AI Engineer Europe 2026, both on YouTube. Recurring themes are coding agents writing replay scripts from network captures, independent effect checks, background or window-scoped computer use, and the gap between benchmark success and production reliability. The source page lists the event year but no exact dates.

### Cited Findings
All entries are from [AI Engineer: computer-use topic](https://ai.engineer/topics/computer-use) (YouTube URL = `https://www.youtube.com/watch?v=<id>`). Exact talk dates are not given; event years are as shown.
- AIEWF 2026, Paul Klein IV, "Bringing agents onto the world wide web" (GqoNrUz8hEU): network-request inspection, then coding-agent replay scripts — [talk page](https://www.ai.engineer/talks/GqoNrUz8hEU-bringing-agents-onto-world-wide-web)
- AIEWF 2026, Dhruv Batra (Yutori), "Computer-use models will agentify the web, not APIs" (Ki980nV0__0) — [talk page](https://www.ai.engineer/talks/Ki980nV0__0-computer-use-models-will-agentify-web-not)
- AIEWF 2026, Corey Gallon, "The Dark Arts of Web Automation: Teaching Agents to Use Websites Like Humans" (26RtyAm9y_Q): independent effect checks and stable reusable interaction sequences — [talk page](https://www.ai.engineer/talks/26RtyAm9y_Q-dark-arts-web-automation-teaching-agents-use)
- AIEWF 2026, Cua team, "Computer-Use 2.0: Agents Just Got Multi-Cursor" (ZSQb5fzRFPw): background, window-scoped automation; separating task setup, reference trajectories and outcome evaluators — [talk page](https://www.ai.engineer/talks/ZSQb5fzRFPw-computer-use-2-0-agents-just-got)
- AIEWF 2026, Pierluca D'Oro, "Computer Use at the Edge of the Statistical Precipice" (CTLa_p6iOiY)
- AIEWF 2026, Amazon AGI Lab: "Why 80% Reliability Isn't Good Enough" (Emo5FGGY-wM), "Perception Agents" (2JX6JYyQG4Y), "Build with Perception Agents" (ZGzthw4BZiA), "From RL to IRL" (Cc0_nyxROBA: partial observations, deceptive controls, recovery actions, risk-aware human handoff)
- AIEWF 2026, Simular, "The Autonomous Computer: Infrastructure for Computer Use Agents" (tyFPqtyOK5w)
- AIEWF 2026, Microsoft, "Don't Let the LLM Drive" (m24UKZomm7k); "Your Agent Didn't Fail. Your Harness Did." (BInpv7lGp1o)
- Browserbase, "Your LLM Judge Is a Confident Liar: Building Better Verifiers" (xLxhT2ZI7UM; event not stated)
- AI Engineer Europe 2026: "Building Agent Interfaces: Lessons from Chrome DevTools (MCP) for Agents" (Michael Hablich, _B4Pv9ttFgY); "The agent-ready web: WebMCP" (ghJmWQCIHRM); n8n human-in-the-loop (tDArkCqjA-c); "What if the network was the sandbox?" (BM2JX9hqsVQ)
- [BG] AIEWF 2025: "The Current State of Browser Agents" (Djv8Sp11UjI); "The Web Browser Is All You Need" (Paul Klein, YRGjll7uu5w); "Two Roads to Durable Agents: Replay vs. Snapshot" (svCnShDvgQg)
- AI Native DevCon 2026 London: a browser-agents talk transcript (Trieloff) — [Tessl registry transcript](https://tessl.io/registry/ainativedev/aidevcon-2026-ldn/0.100.14/files/talk-trieloff-browser-agents/transcript.md)
- A 13 Aug 2026 video on "Codex browser / computer use skills" — [OpenClaw database](https://openclawdatabase.com/news/videos/2026-08-13-codex-browser-computer-use-skills/)

### Inferences
- The Klein, Gallon, D'Oro and "80% reliability" talks are the most relevant to Jair OS's grade-entry failure mode: they cover replay scripts, independent verification, and why replay-only metrics mislead.

### Gaps
- Exact publication dates of the AIEWF 2026 videos were not available on the source page, and the YouTube pages were not fetched.
- No Portuguese-language (Brazilian) 2026 YouTube demos of school-ERP automation were searched, per the privacy constraint and search budget.

---

## 9. Recommended approach for the Jair OS desktop/browser execution layer (synthesis)

### Takeaway
Move from "an agent operates the ERP" to "**deterministic flow packs with AI as author and repairer**." Each ERP operation (enter grades, mark attendance, fill a diary entry) becomes a versioned Playwright/Stagehand script with typed inputs. It writes through the UI, verifies each row through an independent readback channel (internal GET/XHR or export), and records per-row status. LLM computer use (Claude `computer_toolset_20260801` with zoom) is used only to explore new screens, regenerate broken selectors, and handle exceptions. Device reliability is handled by OS power policy, supervised services and queue leases. Identity errors are prevented by a roster-first, batch-confirmation matching UX.

### Cited Findings
- Deterministic replay after one exploration is supported by Stagehand `cacheDir` (about 2–3 s and 0 tokens per replay vs. about 20–30 s and 50k tokens on first run) — [Stagehand docs](https://docs.stagehand.dev/v3/best-practices/deterministic-agent) — and by Skyvern code caching with AI fallback and regeneration — [Skyvern docs](https://skyvern.com/docs/developers/features/code-caching)
- Even a vendor of LLM browser agents recommends scripted Playwright or Stagehand for fixed flows — [Browser Use, best web agents](https://browser-use.com/best-web-agents)
- Long-horizon full-completion rates remain under 50% binary even for frontier models on OSWorld 2.x (Opus 5 max 44.33%; Opus 5.5 strict about 48.7%) — [Presenc.ai](https://presenc.ai/research/osworld-computer-use-leaderboard-2026); [OSWorld 2.0](https://osworld-v2.xlang.ai/)
- Network-capture-then-script replay is advocated by Browserbase's CEO (AIEWF 2026) — [AI Engineer](https://www.ai.engineer/talks/GqoNrUz8hEU-bringing-agents-onto-world-wide-web); independent effect checks — [AI Engineer topic](https://ai.engineer/topics/computer-use)
- Screenshot-based judges miss hallucinations — [Browser Use](https://browser-use.com/posts/online-mind2web-benchmark)
- Confirmation gating patterns: Gemini `require_confirmation` — [Gemini docs](https://aistudio.google.com/docs/computer-use); Fara critical points — [Microsoft Research](https://www.microsoft.com/en-us/research/articles/fara1-5-computer-use-agent)
- Session reuse via storageState or a persistent profile, never committed — [Playwright auth](https://playwright.dev/docs/auth); [playwright-mcp](https://github.com/microsoft/playwright-mcp)
- Tailscale unattended mode plus an Automatic service, and power settings — [Tailscale](https://tailscale.com/kb/1088/run-unattended); [powercfg](https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/powercfg-command-line-options); [pmset](https://ss64.com/mac/pmset.html)

### Inferences
**A. Execution ladder per job (choose the highest available rung)**
1. Official or homologated API (where the school allows it). Note that 403s for older data mean "not homologated," so don't build on it for writes.
2. **Internal XHR readback (read-only)**, using the same browser session's cookies (Playwright `context.request` or an `APIRequestContext` seeded from storageState).
3. **Flow-pack script (write)**: Playwright using role/label locators, generated once by Playwright MCP codegen, Stagehand cache or Skyvern code, and committed in the repo per ERP and version.
4. **AI-assisted DOM step** (Stagehand `act`/`observe`, Playwright MCP) when a locator breaks. The repaired selector is committed back after review.
5. **Vision computer use** (Claude Sonnet/Opus 5.5 with zoom at 1280×800) only for unknown screens, popups, canvas or iframe widgets, or native dialogs (Peekaboo on Mac).

**B. Re-design of the failed "57 grades + reread" job**
- Phase 0, preflight (read-only): open the class or assessment page and pull the roster plus the current values via DOM or XHR. Fail fast if the class, assessment or bimester doesn't match.
- Phase 1, resolve: match dictated names to the roster (section 6), then show **one confirmation table** to the teacher (the only human step for reversible writes).
- Phase 2, plan: compute the diff (new / unchanged / overwrite). Overwrites of non-empty grades need explicit approval.
- Phase 3, write in chunks of about 10 rows. After each chunk, save and wait for the server acknowledgment (network response 2xx plus the UI toast).
- Phase 4, independent readback: reload, or GET via XHR, or download the ERP's grade-map export. Parse it and compare row by row.
- Phase 5, record: per-row statuses `verified` / `mismatch` / `not_written` / `unverified` and an overall job status. Mark a job `verified` only if every row passes readback via rung 2 or a DOM reload. Attach the Playwright trace and the export file as evidence. Retry only the failed rows (idempotent).
- This turns "unverified, external readback required" into an automated, auditable step.

**C. Device and worker reliability**
- Mac: `pmset sleep 0, autorestart 1, womp 1`. Run the worker as a launchd agent with KeepAlive inside a logged-in GUI session, with the browser in a dedicated profile, or in a Lume VM for isolation. Use the Local AI Worker for cheap read-only tasks (Fara1.5-class models are experimental).
- Windows: AC standby and hibernate off, check Modern Standby (`powercfg /a`), Tailscale unattended via GUI with the service on Automatic, the worker as an at-startup Scheduled Task with restart-on-failure, and a local watchdog that restarts the browser and worker if the heartbeat is older than N minutes. Use `powercfg /lastwake` and `/sleepstudy` for diagnosis.
- Queue: job leases with heartbeats, automatic re-queue, row-level idempotency keys, and a rule that a job is never split across two devices mid-batch.

**D. Safety and governance**
- One allowlisted browser profile per ERP. No mixed browsing in agent sessions. Credentials live in the OS keychain or credential manager and are injected by the script, never shown to the model. 2FA and CAPTCHA go to a human checkpoint.
- Irreversible or official actions (closing a diary or bimester, publishing grades) always need human confirmation with a diff.
- Keep a trace or screenshot audit log per job, minimize the personal data sent to cloud LLMs, and seek school or ERP-vendor acknowledgment (legal check pending).

**E. Model and tool picks (Nov 2026)**
- Authoring and repair: Claude Code or Codex with Playwright CLI/skills or Playwright MCP, plus Chrome DevTools MCP for network capture.
- Runtime replay: Playwright scripts, optionally Stagehand v3 with `cacheDir`.
- Vision fallback: Claude Sonnet 5.5 or Opus 5.5 with `computer_toolset_20260801`, or Gemini 3.x/4 computer use with `safety_decision`.
- Avoid agentic consumer browsers (Atlas, Comet) for ERP writes, given the UW 2026 findings.

### Gaps
- Not validated against the specific ERPs' DOM structure (ActiveSoft grade grids may use iframes or legacy components). A one-time technical spike per ERP is needed.
- No measured data on Stagehand or Skyvern cache durability across ERP updates. Jair OS should log selector-repair frequency to estimate it.
