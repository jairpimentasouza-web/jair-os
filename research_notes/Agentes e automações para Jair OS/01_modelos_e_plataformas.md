# Frontier models and vendor agent platforms for personal/professional agentic automation (state as of 23 Nov 2026)

Conventions used in these notes:
- Every claim carries a date. **[BG]** marks background older than 2026. **[UNCONFIRMED]** marks secondary or rumor-level claims, or claims the sources disagree on.
- "Skill ref" means Anthropic's own `claude-api` reference that ships with Claude Code (cached 2026-11-03). It mirrors platform.claude.com docs. The doc URL given is the page it mirrors.
- Pricing is USD per 1M tokens (MTok), input/output, unless stated otherwise.
- Search budget: one batch of searches failed when a shared search limit was hit, and the work resumed afterwards. Gaps in the last section of each question reflect that.

---

## 1. Anthropic: model lineup, pricing, agent features, and recommended long-running-agent architecture

### Takeaway
By Nov 2026 Anthropic ships four live tiers: Fable 5.2 (top, $8/$40), Opus 5.5 ($4/$20), Sonnet 5.5 ($2/$10) and Haiku 5.5 ($0.10/$0.50). All have 1M context and 128K output. Agent features are now a full hosted runtime: Managed Agents (beta) with scheduled deployments, outcomes/graders, memory stores, vaults, self-hosted sandboxes, webhooks and multi-agent workflows. Computer use is GA as a 17-tool "toolset". Anthropic's engineering guidance is to split the agent into a durable session log, a stateless harness, and disposable sandboxes ("brain vs hands"). That split maps closely onto Jair OS's P0 needs: checkpoint recovery, confirming results before declaring success, and keeping credentials out of execution environments.

### Cited Findings

**Model lineup and dates (2026)**
- 28 May 2026: Claude Opus 4.8 released (1M context by default, 128K output). — [Claude release notes](https://platform.claude.com/docs/en/release-notes/overview.md)
- 9 Jun 2026: Claude Fable 5 released at $10/$50. Its thinking is always on, and its safety classifiers can return `stop_reason: "refusal"`. Claude Mythos 5, the same tier, went to Project Glasswing participants. — [Claude release notes](https://platform.claude.com/docs/en/release-notes/overview.md)
- 30 Jun 2026: Claude Sonnet 5 at $2/$10. This launched as introductory pricing; the planned rise to $3/$15 on 1 Sep was cancelled, so $2/$10 is now standard. — [release notes](https://platform.claude.com/docs/en/release-notes/overview.md); [Claude pricing page](https://platform.claude.com/docs/en/about-claude/pricing.md)
- 24 Jul 2026: Claude Opus 5 at $5/$25. — [release notes](https://platform.claude.com/docs/en/release-notes/overview.md)
- 1 Sep 2026: Claude Fable 5.1 / Mythos 5.1 at $10/$50, with cache reads at $0.25. — [release notes](https://platform.claude.com/docs/en/release-notes/overview.md)
- 22 Sep 2026: Claude Opus 5.5 at $4/$20, cache reads $0.20, cache writes $5. It is "the first model in our new Claude 5.5 family." Anthropic says it "performs at the level of Claude Fable 5.1 on most work" and costs 40% less to run than Opus 5. Thinking can no longer be switched off. ZDR is available. Most cybersecurity tasks are routed to Opus 4.8. — [Anthropic: Claude Opus 5.5](https://www.anthropic.com/news/claude-opus-5-5)
- 28 Sep 2026: Claude Sonnet 5.5 at $2/$10. Its cache reads were cut to $0.10 on 7 Oct. Forced tool use returns HTTP 400. — [release notes](https://platform.claude.com/docs/en/release-notes/overview.md); [pricing](https://platform.claude.com/docs/en/about-claude/pricing.md)
- 7 Oct 2026: Claude Haiku 5.5 at $0.10/$0.50 for prompts ≤100K tokens and $0.50/$2.50 above that (batch: $0.05/$0.25), with 1M context and 128K output. Its tokenizer "produces more tokens for the same text." — [pricing](https://platform.claude.com/docs/en/about-claude/pricing.md); [release notes](https://platform.claude.com/docs/en/release-notes/overview.md)
- 9 Nov 2026: Claude Fable 5.2 / Mythos 5.2 at $8/$40, the first Fable price cut. Fast mode costs $16/$80, cache reads $0.20, and batch $4/$20. Mythos is limited to verified organizations in the cyber and life-science programs. — [release notes](https://platform.claude.com/docs/en/release-notes/overview.md); [pricing](https://platform.claude.com/docs/en/about-claude/pricing.md); [SD Times](https://sdtimes.com/ai/anthropic-introduces-claude-fable-5-2-mythos-5-2/)
- Fable 5.2 outputs are reportedly "up to 30% faster" than Fable 5.1 **[UNCONFIRMED, secondary]**. — [9to5Mac, 9 Nov 2026](https://9to5mac.com/2026/11/09/anthropic-upgrades-claude-with-new-fable-5-2-model-details-here/)
- Tokenizer: Claude 4.7 and later models produce about 30% more tokens for the same text than Sonnet 4.6 and earlier. This matters when comparing per-token prices across generations. — [Claude pricing page](https://platform.claude.com/docs/en/about-claude/pricing.md)
- Retirements:
  - Claude Opus 4.1 was retired on 5 Aug 2026.
  - Retirement of Sonnet 4.5 is announced for 30 Nov 2026.
  - Fast mode for Opus 4.8 is removed on 30 Nov 2026.
  — [release notes](https://platform.claude.com/docs/en/release-notes/overview.md)

**API behavior changes that affect existing agent code (2026)**
- On Fable 5.1/5.2, Opus 5.5 and Sonnet 5.5, `tool_choice: any/tool` (forced tool use) returns a 400. The replacements are `auto` + `strict: true`, or structured outputs. — Skill ref, mirrors [migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide.md)
- From API version `2026-10-21` (released 21 Oct 2026 with new SDK majors), sending `temperature`, `top_p` or `top_k` returns a 400 on every model. — [release notes](https://platform.claude.com/docs/en/release-notes/overview.md); Skill ref
- Opus 5.5 and Haiku 5.5 default to effort `medium`; the other current models default to `high`. — Skill ref, mirrors [effort docs](https://platform.claude.com/docs/en/build-with-claude/effort.md)
- Server-side `fallbacks` (beta, with a `"default"` mode since 24 Jul 2026) reroute a request that hits a safety-classifier refusal to another model. — [release notes](https://platform.claude.com/docs/en/release-notes/overview.md)

**Benchmarks Anthropic reported for Opus 5.5 (22 Sep 2026)** (vendor-reported)

| Benchmark | Opus 5.5 | GPT-6 Astra | Fable 5.1 |
|---|---|---|---|
| Terminal-Bench 4.0 | 66.4% | 57.9% | 55.8% |
| GDPval-AA v2.1 (Elo) | 1846 | 1542 | n/a |
| AutomationBench | 40.0% | 41.4% | n/a |
| OSWorld 2.1 (partial) | 81.8% | n/a | 80.7% |
| HLE with tools | 67.7% | n/a | n/a |

— [Anthropic: Claude Opus 5.5](https://www.anthropic.com/news/claude-opus-5-5)

**Claude Managed Agents (hosted agent runtime, beta)**
- Launched early April 2026. The architecture post is dated 8 Apr 2026. — [Anthropic Engineering: Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents)
- Object model: you create a persisted, versioned **Agent** (model, system prompt, tools, MCP servers, skills), then start **Sessions** against it. Each session gets a container where bash, file and code tools run, while the agent loop runs on Anthropic's orchestration layer. Sessions stream events back to the client. — Skill ref, mirrors [Managed Agents overview](https://platform.claude.com/docs/en/managed-agents/overview.md)
- Feature timeline (all 2026):

  | Date | Feature |
  |---|---|
  | 6 May | Multi-agent orchestration and **Outcomes** (beta); webhooks; "Dreams" memory reorganization (research preview) |
  | 19 May | Self-hosted sandboxes; MCP tunnels (research preview); tool output over 100K characters spills to a file |
  | 9 Jun | **Scheduled deployments**; vault environment-variable credentials |
  | 30 Jun | Lifecycle webhooks for agents, deployments and runs; session-level agent overrides |
  | 7 Aug | **Session budgets** (`budget_reached`); `inference_geo`; skills loaded from GitHub repos |
  | 19 Aug | Computer use GA as `computer_toolset_20260801`; browser use toolset; Files API and Agent Skills GA; `allowed_domains`/`blocked_domains` for web tools |
  | 3 Sep | `ant apply` (resources as code) |
  | 10 Sep | `auto` permission policy (a classifier evaluates tool calls) |
  | 9 Oct | Dynamic multi-agent workflows (`multiagent_20261001`) |
  | 14 Oct | OpenTelemetry export (beta) |
  | 2 Nov | Message threads (beta) |
  | 12 Nov | Self-hosted Claude Managed Agents (by request) |

  — [Claude release notes](https://platform.claude.com/docs/en/release-notes/overview.md)
- Pricing: tokens at the normal model rates **plus $0.08 per session-hour**, metered only while the session is `running` (idle time is free). The batch discount does not apply. Anthropic's worked example: a 1-hour Opus 5.5 session with 50K input and 15K output tokens costs $0.58, or $0.428 when 40K of the input is cached. — [Claude pricing page](https://platform.claude.com/docs/en/about-claude/pricing.md)
- **Scheduled deployments:**
  - A deployment bundles agent, environment, files, GitHub, memory stores and vaults with a cron `schedule` plus an IANA `timezone`; minute-level granularity is the finest.
  - Each firing creates a session, and each run is recorded.
  - Deployments can be paused, unpaused and archived.
  — Skill ref, mirrors [Managed Agents docs](https://platform.claude.com/docs/en/managed-agents/overview.md)
- **Outcomes:**
  - The client sends `user.define_outcome` with a rubric.
  - A separate grader, with its own context window, scores each iteration and feeds per-criterion gaps back to the agent.
  - The loop repeats until the rubric passes or `max_iterations` is hit.
  — Skill ref, mirrors [Define Outcomes](https://platform.claude.com/docs/en/managed-agents/define-outcomes.md)
- **Memory stores** (beta header `agent-memory-2026-07-22`):
  - A store is workspace-scoped and mounted as a directory in the session.
  - Every mutation creates an immutable version (`memver_`), so changes can be audited and rolled back.
  - Each memory holds at most 100KB, and a session can attach at most 8 stores.
  - Anthropic's explicit warning: never store credentials in them.
  — Skill ref, mirrors [Memory](https://platform.claude.com/docs/en/managed-agents/memory.md)
- **Self-hosted sandboxes:**
  - With `config.type: "self_hosted"`, the agent loop stays on Anthropic's side, but bash, file and code tools run on your infrastructure.
  - Your worker polls for work using an environment key.
  - Exception: `web_search`/`web_fetch` still run on Anthropic's servers.
  — Skill ref, mirrors [Self-hosted sandboxes](https://platform.claude.com/docs/en/managed-agents/self-hosted-sandboxes.md)
- **Vaults:** credentials are substituted at egress, so the sandbox only ever holds a placeholder. — Skill ref, mirrors [Vaults](https://platform.claude.com/docs/en/managed-agents/vaults.md)
- **Availability limits:**
  - Managed Agents runs only on the first-party API and Claude Platform on AWS. It is not on Bedrock, Vertex or Foundry.
  - It is not currently eligible for ZDR or a HIPAA BAA.
  - Session history is kept until it is deleted.
  — Skill ref, mirrors [platform availability](https://platform.claude.com/docs/en/build-with-claude/overview.md)

**Computer use and browser use (GA 19 Aug 2026)**
- `computer_toolset_20260801` exposes 17 member tools: screenshot, zoom, the click variants, drag, scroll, type, key (repeat 1–100), hold_key and wait.
  - Zoom is on by default and returns full-resolution crops, so small text is readable.
  - Claude can return **batch actions**. The client must run them in order and **stop at the first failure**, answering the remaining blocks with "Not executed".
  — [Computer use tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool.md)
- The toolset is a client toolset: your application executes every call, and it "isn't available in Claude Managed Agents." Supported models include Fable 5.2, Opus 5.5, Sonnet 5.5 and Haiku 5.5. — [Computer use tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool.md)
- **Verification guidance:** Anthropic's docs say "Claude sometimes acts as if steps succeeded without checking." Recommended practice:
  - Screenshot after each step and state what the screenshot shows.
  - End each batch with a screenshot.
  - Run an end-to-end verification at the start of each session.
  — [Computer use tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool.md)
- **Cost and latency:**
  - Each screenshot costs about 1,000–1,800 input tokens.
  - Keep the last 3 screenshots and prune every 25 turns; prune in batches so the cached prefix stays stable.
  - Use 1280×720 as the baseline resolution when accuracy is poor, and avoid going above 1920×1080.
  - Declaring the toolset adds about 4,500 input tokens per request, and the browser toolset about 6,600.
  — [Computer use tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool.md); [pricing](https://platform.claude.com/docs/en/about-claude/pricing.md)
- **Security guidance:** use a dedicated VM or container, a domain allowlist, and human confirmation for consequential actions. Classifiers scan screenshots for prompt injection. — [Computer use tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool.md)

**Other Messages API agent primitives (current)**
- **Tool search**: the regex and BM25 variants load tools on demand when the other tools are marked `defer_loading: true`.
- **Programmatic tool calling**: Claude calls your tools from inside code execution via `code_execution_20260120` + `allowed_callers`.
- **Memory tool**: `memory_20250818`.
- **Context editing**: `clear_tool_uses_20250919` and `clear_thinking_20251015`.
- **Server-side compaction** (beta `compact-2026-01-12`, default trigger 150K tokens; on-demand compaction since 14 Sep 2026).
- **Task budgets** (beta): an advisory token ceiling for an agent loop.
- **Advisor tool**: a cheaper executor consults a stronger advisor model.
- **Mid-conversation system messages**: operator instructions added without breaking the cache.

— Skill ref; [release notes](https://platform.claude.com/docs/en/release-notes/overview.md)
- **Message threads** (beta, 2 Nov 2026): the server keeps the conversation, so each request sends only the new messages. They cannot be combined with compaction or batches, and are not ZDR-eligible. — [release notes](https://platform.claude.com/docs/en/release-notes/overview.md); Skill ref
- **Code execution**:
  - Free when used together with web search or web fetch.
  - Otherwise each organization gets 1,550 free container-hours per month, then $0.05 per container-hour, with a 5-minute minimum.
  - Web search costs $10 per 1,000 searches; web fetch costs tokens only.
  — [Claude pricing page](https://platform.claude.com/docs/en/about-claude/pricing.md)
- **New hosting options**: Claude Platform on AWS (11 May 2026) and Claude Models on Google Cloud, Anthropic-managed (22 Oct 2026). — [release notes](https://platform.claude.com/docs/en/release-notes/overview.md)

**Claude Code: cloud scheduled tasks (formerly "routines")**
- Launched 14 Apr 2026 as a research preview. — [InfoQ, May 2026](https://infoq.com/news/2026/05/anthropic-routines-claude); [Claude Code docs](https://code.claude.com/docs/en/routines.md)
- A scheduled task is a saved prompt plus repositories plus connectors. It runs on Anthropic's cloud or on an organization's self-hosted environment.
  - Triggers: a schedule (including one-off runs), an HTTP API POST with a bearer token, or GitHub events.
  - Plans: Pro, Max, Ultra, Team and Enterprise.
  - Create one at claude.ai/code/routines or with `/schedule` in the CLI.
  — [Claude Code docs: scheduled tasks](https://code.claude.com/docs/en/routines.md)
- **Unattended runs:**
  - Runs start in auto mode, where a classifier allows or blocks actions.
  - A run waits for a human only on ask rules or after repeated blocks.
  - All of the user's connected connectors are included by default.
  - Runs draw on subscription usage, not API billing.
  — [Claude Code docs](https://code.claude.com/docs/en/routines.md)
- **Limits:**
  - 100 scheduled runs per hour per account.
  - 30 "Run now"/API fires per hour per task.
  - None of these hourly limits has overage.
  - If the GitHub connection is lost, runs are skipped for up to 72 hours, then the task turns off.
  - The Default cloud environment has "Limited" network access with package registries allowed.
  — [Claude Code docs](https://code.claude.com/docs/en/routines.md)

**Recommended architecture for long-running agents (Anthropic engineering, 2026)**
- "Scaling Managed Agents: Decoupling the brain from the hands" (8 Apr 2026) splits an agent into three parts:
  1. A **session**: an append-only event log stored outside both the harness and the sandbox.
  2. A **harness**: the stateless loop.
  3. **Sandboxes**: disposable "cattle, not pets."

  The harness calls every sandbox or tool through one interface, `execute(name, input) → string`. — [Anthropic Engineering](https://www.anthropic.com/engineering/managed-agents)
- **Recovery:**
  - A failed container is returned to Claude as a tool error, and a new container is provisioned.
  - A failed harness is replaced by `wake(sessionId)`, which reloads the log via `getSession(id)` and resumes from the last event.
  — [Anthropic Engineering](https://www.anthropic.com/engineering/managed-agents)
- **Credentials:**
  - Tokens never enter the sandbox where generated code runs.
  - Git tokens are used at clone time only.
  - MCP calls go through a proxy that fetches credentials from a vault.
  — [Anthropic Engineering](https://www.anthropic.com/engineering/managed-agents)
- **Context:** treat the session log as context that lives outside the model's window. Read it in positional slices, and avoid irreversible compaction or trimming. — [Anthropic Engineering](https://www.anthropic.com/engineering/managed-agents)
- **Measured effect:** decoupling cut p50 time-to-first-token by about 60% and p95 by more than 90%. Harness assumptions go stale as models improve; for example, the context resets needed for Sonnet 4.5 became unnecessary with Opus 4.5. — [Anthropic Engineering](https://www.anthropic.com/engineering/managed-agents)
- "Harness design for long-running application development" (covered Apr 2026) adds a **separate evaluator agent**, calibrated with few-shot examples and scoring criteria, to judge the generator's work. — [InfoQ, Apr 2026](https://www.infoq.com/news/2026/04/anthropic-three-agent-harness-ai)
- **[BG]** "Effective harnesses for long-running agents" (late 2025) covers agents that work across many context windows. — [Anthropic Engineering](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents)

**Education**
- **[BG]** Claude for Education and its Socratic "learning mode" launched in April 2025. — [Anthropic](https://www.anthropic.com/news/introducing-claude-for-education?)
- A Teach For All partnership in January 2026 is reported by a third-party blog **[UNCONFIRMED]**. — [Educators Technology, Feb 2026](https://www.educatorstechnology.com/2026/02/claude-for-education.html)

### Inferences
- **Closing "unverified, readback required" failures.** These closures match Anthropic's documented failure mode ("acts as if steps succeeded without checking"). The documented fixes can be encoded as hard contract rules in the desktop-agent harness:
  - Screenshot plus readback after each action.
  - End each batch with a screenshot.
  - Halt at the first failure inside a batch.
  - Zoom to read small grid cells.
  - Run an end-to-end check at session start.

  This applies whether or not Jair OS moves to Claude's toolset.
- **Desktop UI automation cannot move into Managed Agents.** The computer toolset "isn't available" there. The school-ERP agents on the Mac and Windows machines therefore stay a self-hosted loop (Messages API or Agent SDK) on the device. Managed Agents with **self-hosted sandboxes** could still orchestrate them: the worker polls outbound, which fits Tailscale-networked machines with no inbound ports.
- **Managed Agents can replace the flaky n8n path for cloud-side workflows.** Candidates: report generation, didactic material with quality gates, finance and legal research. The relevant pieces are scheduled deployments (cron + timezone), webhooks, outcomes (rubric grader, a natural fit for the "scientific/editorial quality gates") and session budgets (hard dollar caps).
  - At $0.08 per session-hour plus tokens, low-volume use stays cheap.
  - Caveat: no batch discount inside sessions.
- **Jair OS can adopt the brain/hands split directly:**
  - Supabase Postgres as the append-only session/event log.
  - Edge functions or a worker as stateless harnesses.
  - Devices as disposable "hands" behind one `execute()` interface.
  - A device that misses its heartbeat becomes a tool error, which triggers reroute or retry rather than leaving a stale execution.
  - `wake(executionId)` from the log becomes checkpoint recovery.
- **Credentials:** the vault plus egress-substitution pattern argues for moving Google OAuth tokens out of agents and into a broker. That broker also becomes the single place to detect and repair OAuth errors.
- **Claude Code scheduled tasks** are a low-cost option for nightly self-healing and audit jobs against the Jair OS repository and its MCP connectors, because they bill the subscription, not API dollars. Two risks to manage: unattended auto mode, and all connectors being included by default, so remove write-capable connectors that a task does not need.
- **Pinned models need checking.** Any agent contract pinned to Sonnet 4.5 (retiring 30 Nov 2026), or relying on forced `tool_choice` or on `temperature`, breaks on current models or API versions.
- **Cost:** Haiku 5.5 at $0.10/$0.50 (batch $0.05/$0.25) is the obvious router, classifier and readback-checker model. Sonnet 5.5 at $2/$10 with $0.10 cache reads covers most generation work.

### Gaps
- Not searched or verified for 2026: Claude in Chrome status, the connectors directory, Claude Code hooks/plugins/subagents changelog, the Claude Agent SDK version history, "Claude Tag" (only a 23 Oct 2026 "Claude Tag API beta" line in the [release notes](https://platform.claude.com/docs/en/release-notes/overview.md) was seen), and specifics of "Cowork".
- No primary 2026 source found on learning mode or Claude for Education updates.
- No verified Anthropic-published benchmarks for Fable 5.2. The "#1 on AA Intelligence Index v5 at 65" claim is from secondary press and is not reconciled with Artificial Analysis's own posts (see question 6).
- Pricing for self-hosted Claude Managed Agents is "contact sales."

---

## 2. OpenAI: models, Responses/Agents APIs, Agents SDK, AgentKit, Apps/plugins, Codex, DevDay 2026

### Takeaway
OpenAI's current API lineup is GPT-6.2 Astra ($8/$40) and GPT-6.2 Sol ($2/$10), both from 17 Nov 2026, plus GPT-6.1 Terra ($1/$5) and GPT-6 Luna ($0.10/$0.50). DevDay (29 Sep 2026) added an Agents API with computer use, multi-agent, tool search and compaction; cloud Codex environments; always-on "Dots" agents; a Decisions API for routing; and event-driven plugin automations via MCP Events. The visual AgentKit Agent Builder is being shut down on 30 Nov 2026 in favor of the code-first Agents SDK.

### Cited Findings
- **DevDay 2026 (29 Sep 2026)** — [OpenAI DevDay 2026 recap](https://openai.com/index/devday-2026-recap/):
  - **GPT-6.1 Sol**: stronger at agentic coding, computer use and professional work. Priced at "one-fifth of GPT-6 Sol's standard input and output token rates."
  - **Agents API with computer use**: Codex-style multi-agent, tool search, tool calling and context compaction.
  - **Dots**: always-on agents. Available on Pro and Business Premium; beta for Enterprise, Edu and Healthcare.
  - **Decisions API**: uses the Luna model to answer user-defined questions with fixed answer options, for classification, routing or choosing an agent's next step. Limited preview.
  - **Codex in the cloud**: reusable environments that share approved settings and permissions.
  - **Codex CLI refresh**: voice, an `/agents` view, session resume and worktrees.
  - **MCP Events for plugin automations**: plugins trigger automations "when something happens in a connected app," based on the proposed MCP Events spec.
  - **Teams/shared tasks**: delegated recurring work triggered by schedules or events.
  - **Bedrock Managed Agents powered by OpenAI**: OpenAI agents running inside AWS.
  - **Ultrafast tier**: up to 8× faster (about 300 tok/s) in Codex and up to 6× in the API. Bundled with the new Pro 500 plan.
- **GPT-6.2 Astra and Sol** — [OpenAI: Introducing GPT-6.2 Astra and Sol](https://openai.com/index/introducing-gpt-6-2-astra-sol); date from [Decrypt](https://decrypt.co/383488/openai-gpt-6-2-astra-challenges-anthropic-price-but-not-every-benchmark) and [TestingCatalog](https://www.testingcatalog.com/openai-launches-gpt-6-2-astra-and-sol-on-chatgpt-and-apis/):
  - Launched 17 Nov 2026 as API model IDs `gpt-6.2-astra` and `gpt-6.2-sol`.
  - Astra: $8 input, $0.40 cached, $40 output, 20% below GPT-6 Astra. Sol: $2 / $0.10 / $10.
  - OpenAI reports GDPval v2 +6.2 points for Astra over GPT-6 Astra, with 22% fewer output tokens.
  - On FrontierCode 2.0, Sol scores within 0.5 points of Astra at about one-fifth of the cost.
  - Computer use is more precise, and the models judge better when to use plugins versus computer use.
- Independent tests reportedly rank GPT-6.2 Astra second behind Claude Fable 5.2, "with no improvement in coding-agent performance" **[secondary]**. — [Decrypt](https://decrypt.co/383488/openai-gpt-6-2-astra-challenges-anthropic-price-but-not-every-benchmark)
- **OpenAI price list** (short context, ≤272K input tokens) — [OpenAI API pricing](https://developers.openai.com/api/docs/pricing):

  | Model | Input | Cached input | Output |
  |---|---|---|---|
  | gpt-6.2-astra | $8 | $0.40 | $40 |
  | gpt-6.2-sol | $2 | $0.10 | $10 |
  | gpt-6.1-sol | $2 | $0.10 | $10 |
  | gpt-6-sol | $2 | $0.20 | $10 |
  | gpt-6.1-terra | $1 | $0.05 | $5 |
  | gpt-6-luna | $0.10 | $0.01 | $0.50 |
  | gpt-6-astra | $10 | $1 | $50 |
  | gpt-5.6-sol | $4 | n/a | $20 |

  - **Batch** and **Flex** are 50% of standard.
  - **"Priority" was renamed "Fast mode" on 30 Jul 2026** and costs 2× standard.
  - **Ultrafast** for GPT-6.2 costs 3× standard through 28 Feb 2027, then 6× from 1 Mar 2027.
- **Conflict:** the DevDay recap says GPT-6.1 Sol costs one-fifth of GPT-6 Sol, but the current price page lists both at $2/$10. Third-party reports describe a later cut to GPT-6 Sol and Luna prices after Astra launched **[UNCONFIRMED]**. — [DevDay recap](https://openai.com/index/devday-2026-recap/) vs [pricing](https://developers.openai.com/api/docs/pricing); [StartupHub](https://www.startuphub.ai/ai-news/artificial-intelligence/2026/openai-halves-sol-and-luna-pricing-after-astra)
- **Tool and runtime prices** — [OpenAI API pricing](https://developers.openai.com/api/docs/pricing):
  - Web search: $10 per 1,000 calls.
  - Hosted shell and code-interpreter containers: $0.03 per 20-minute session for 1 GB, up to $1.92 for 64 GB.
  - File search: $0.10/GB per day (1 GB free) plus $2.50 per 1,000 calls.
  - Realtime: `gpt-realtime-2.1` costs $32/$64 per 1M audio tokens; `gpt-realtime-2.1-mini` costs $10/$20.
  - GPT-Live: $0.05/min active, $0.02/min standby.
  - The page does not list computer-use or Agents API pricing.
- **Agents SDK (15 Apr 2026)** added native sandbox execution, **snapshotting and rehydration** to recover state in a fresh container, and a "Manifest" workspace abstraction. It is GA at standard API pricing. — [OpenAI: The next evolution of the Agents SDK](https://openai.com/index/the-next-evolution-of-the-agents-sdk/)
- **AgentKit Agent Builder and Evals**: winding down since 3 Jun 2026, and no longer available from 30 Nov 2026. OpenAI recommends the Agents SDK instead. — [OpenAI: Introducing AgentKit (updated notice)](https://openai.com/index/introducing-agentkit/)
- **SWE-bench Verified**: OpenAI stopped reporting it in Feb 2026, citing contamination **[secondary]**. — [decodethefuture](https://decodethefuture.org/en/ai-agent-benchmarks-2026/?noamp=mobile)

### Inferences
- Snapshot/rehydration in the Agents SDK and brain/hands at Anthropic are the same convergent pattern: durable state outside a disposable sandbox. Implementing it inside Jair OS itself (Supabase log plus idempotent steps) keeps the system vendor-portable.
- **The Agent Builder shutdown is a direct lock-in lesson for Jair OS.** Visual, vendor-hosted workflow builders can be retired within about 14 months. Code-first contracts plus MCP lower that risk, and the same logic weighs against deep investment in any single hosted builder (including n8n cloud features).
- **Cheap routing options:** OpenAI's Decisions API and GPT-6 Luna ($0.10/$0.50, $0.01 cached) are low-cost classifier and router options, comparable to Haiku 5.5. Google released a similarly named Decisions API (see question 3).
- **MCP Events**, if it becomes a standard, is the event-trigger mechanism Jair OS lacks, for example "a new Classroom submission triggers a workflow." It is worth tracking as a replacement for polling-based n8n triggers.

### Gaps
- Not verified: Responses API changes in 2026, ChatKit, Apps SDK (DevDay now speaks of "plugins"), ChatGPT Atlas or agent-mode status in 2026, Agents API docs and pricing for computer use, and context windows for GPT-6.x. None of these appeared in the pages fetched.
- The "Evals dashboard read-only 31 Oct 2026" date comes from a third-party post only.

---

## 3. Google: Gemini models, Managed Agents, ADK/Agent Engine, computer use, Antigravity, Workspace/Classroom (I/O 2026 and after)

### Takeaway
Google moved fast after I/O (19 May 2026):
- Monthly Flash releases (3.5 → 3.6 → 3.7 → 3.8).
- A new Gemini 4 family named after elements (Argon, Carbon, Hydrogen, Neon; Oct–Nov 2026), all with about 1M context.
- Computer Use GA on 30 Oct 2026.
- Managed Agents in the Gemini API.
- Antigravity 2.0 and its CLI replacing Gemini CLI.
- A Decisions API.

For an educator, the most concrete item is that Gemini in Classroom is free for all Workspace for Education teachers (Apr 2026), with a Classroom MCP server announced. Two price increases are scheduled for Dec 2026 and Jan 2027.

### Cited Findings
- **I/O 2026 (19 May 2026)** — [Google: 100 things we announced at I/O 2026](https://blog.google/innovation-and-ai/technology/ai/google-io-2026-all-our-announcements/); [Google Developers Blog: I/O 2026 developer keynote](https://developers.googleblog.com/all-the-news-from-the-google-io-2026-developer-keynote/):
  - **Gemini 3.5 Flash** GA.
  - **Gemini Spark**: a 24/7 personal agent on dedicated cloud VMs, for trusted testers, then a beta for US AI Ultra.
  - **Search "information agents"**: background agents that monitor the web.
  - **Antigravity 2.0** (desktop, parallel agents, scheduled background tasks), **Antigravity CLI** (Google asks Gemini CLI users to migrate to it), and **Antigravity SDK** (self-hostable harness).
  - **Managed Agents in the Gemini API**: "a single API call provisions a remote Linux sandbox" running a Gemini 3.5 Flash agent that runs code, manages files and browses. Customizable via AGENTS.md and SKILL.md, through the Interactions API.
  - **WebMCP** origin trial in Chrome 149.
  - **Daily Brief** agent over inbox, calendar and tasks; AI Inbox in Gmail; Docs Live.
  - A new $100 AI Ultra plan.
- **Gemini 3.5 Pro never shipped on schedule.** It was promised for June 2026; as of 23 Jul 2026 it had missed three deadlines **[secondary]**, and the API changelog has no 3.5 Pro entry. Google appears to have moved on to the Gemini 4 family. — [Tech Insider](https://tech-insider.org/ca/?p=433); [Gemini API changelog](https://aistudio.google.com/docs/changelog)
- **Gemini API changelog, 2026** — [Gemini API changelog](https://aistudio.google.com/docs/changelog):

  | Date | Change |
  |---|---|
  | 4 May | Webhooks for Batch and long-running operations (replaces polling) |
  | 5 May | Multimodal File Search |
  | 19 May | `gemini-3.5-flash` GA; Managed Agents public preview |
  | 24 Jun | Computer Use preview in 3.5 Flash |
  | 21 Jul | `gemini-3.6-flash` and `gemini-3.5-flash-lite` GA; `temperature`/`top_p`/`top_k` deprecated |
  | 13 Aug | `gemini-3.7-flash` |
  | 2 Sep | `gemini-3.8-flash` |
  | 15 Sep | `gemini-3.8-live` |
  | 13 Oct | `gemini-4-argon` GA |
  | 26 Oct | `store=true` on by default for new paid projects |
  | 27 Oct | `gemini-api` CLI beta with managed-agent support |
  | 30 Oct | **Computer Use GA** |
  | 2 Nov | `gemini-2.5-pro` and `gemini-2.5-flash` deprecated; auto-routed to newer models on 1 Dec |
  | 10 Nov | `gemini-4-carbon` |
  | 11 Nov | `gemini-decision-1` and **Decisions API** |
  | 12 Nov | `gemini-4-hydrogen` |
  | 18 Nov | `gemini-4-neon`; Office file support |
  | 19 Nov | Tool retrieval preview (`defer_loading`/`tool_search`) |

- **Gemini API pricing** (standard paid tier) — [Gemini API pricing](https://aistudio.google.com/docs/pricing):

  | Model | Input | Output | Notes |
  |---|---|---|---|
  | gemini-4-carbon | $2 → **$4** from 1 Dec 2026 | $10 → **$20** | no free tier |
  | gemini-4-argon | $2 → **$4** from 1 Dec 2026 | $10 → **$20** | no free tier |
  | gemini-4-neon | $3 | $15 | |
  | gemini-4-hydrogen | $1.50 | $7.50 | free tier, data used for training |
  | gemini-3.8-flash | $0.75 → **$1.50** from 1 Jan 2027 | $3.75 → **$7.50** | |
  | gemini-3.5-flash-lite | $0.30 | $2.50 | |
  | gemini-3.1-flash-lite | $0.25 | $1.50 | |

  - Batch and Flex are 50% of standard; Priority is 1.8×.
  - Search grounding: 5,000 free requests per month, then $14 per 1,000.
- At launch (19 May 2026), Gemini 3.5 Flash cost $1.50/$9.00, which Simon Willison called "more expensive." — [Simon Willison](https://simonwillison.net/2026/May/19/gemini-35-flash/)
- **Gemini 4 roles [secondary, partly UNCONFIRMED]:**
  - All four models have a context of 1,048,576 tokens.
  - Carbon is the top and most expensive model; Argon is "efficient frontier reasoning."
  - In the Gemini app, Hydrogen is for everyday help and Neon for deeper analysis.
  — [MindStudio](https://www.mindstudio.ai/blog/google-gemini-4-model-lineup); [9to5Google, 18 Nov 2026](https://9to5google.com/2026/11/18/gemini-4-neon/)
- **ADK and Agent Engine:**
  - ADK for Java 1.0 (30 Mar 2026) and Go 1.0 (31 Mar 2026); ADK for Kotlin/Android 0.1.0 (21 May 2026).
  - Agent Engine Sessions and Memory Bank moved to GA.
  — [Google Developers Blog](https://developers.googleblog.com/agents-adk-agent-engine-a2a-enhancements-google-io/); [ADK Java 1.0](https://developers.googleblog.com/announcing-adk-for-java-100-building-the-future-of-ai-agents-in-java/); [@IT, May 2026](https://atmarkit.itmedia.co.jp/ait/spv/2605/14/news064.html)
  - A "Gemini Enterprise Agent Platform" post exists on Google Cloud's blog but was not read. — [Google Cloud blog](https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise-agent-platform)
- **Education / Classroom:**
  - 14 Apr 2026: Gemini in Classroom became free for all Workspace for Education educators in all Classroom-supported languages. It is on by default; admins can restrict it. — [Workspace Updates, 14 Apr 2026](https://workspaceupdates.googleblog.com/2026/04/gemini-in-google-classroom-is-now-available-in-all-Classroom-supported-languages.html)
  - Jun 2026: the "Classroom app in Gemini" uses class context but is English-only and 18+. It **cannot enter grades**, give private feedback or create rubrics. — [Workspace Updates, Jun 2026](https://workspaceupdates.googleblog.com/2026/06/classroom-app-in-gemini.html?hl=en_GB)
  - ISTE (Jun 2026): Google announced a **Classroom MCP server** "in the coming months," plus Guided Learning class tools that require Education Plus and Chromebooks. — [Google: ISTE 2026 educator updates](https://blog.google/products-and-platforms/products/education/iste-2026-educator-updates/)
  - 10 Aug 2026: Gemini rolled out to students of all ages. — [Workspace Updates, Aug 2026](https://workspaceupdates.googleblog.com/2026/08/gemini-in-google-classroom-is-expanding-to-users-of-all-ages-with-contextualized-Gemini-starter-prompts-for-students.html)

### Inferences
- **Google is the natural second vendor for Jair OS's Google-heavy surface** (Classroom, Gmail, Drive, Calendar).
  - The announced Classroom MCP server could replace custom Classroom API code and some of the OAuth fragility. Status: "coming," not confirmed shipped as of these notes.
  - Gemini in Classroom (free) covers lesson outlines, quizzes and translation natively, which may make some of the 81 workflows redundant for simple cases.
  - Gemini itself cannot enter grades, so grade entry stays Jair OS's job.
- **Gemini Computer Use (GA 30 Oct 2026)** is an alternative engine for the browser-based school ERP flows. It is worth benchmarking against Claude's toolset on the actual grade-entry task. Price is not verified.
- **Watch the price schedule.** Gemini 4 Carbon and Argon double on 1 Dec 2026, and 3.8 Flash doubles on 1 Jan 2027. Budgets should use the post-increase prices.
- **Lock-in and churn risk is high.** Flash model IDs were auto-replaced within weeks (3.7 → 3.8, 3.5 → 3.6 on 8 Oct), and Gemini CLI is being superseded by Antigravity CLI. Pin versions, and keep model-agnostic contracts.

### Gaps
- Not verified: Project Mariner, Jules and NotebookLM 2026 status; "Workspace Flows" (no 2026 source found); Gemini Enterprise pricing; Computer Use and Managed Agents sandbox pricing (the price page was truncated before those sections).
- The official Gemini 4 model card and benchmarks were not read. The Gemini 4 role descriptions are secondary.

---

## 4. Other providers: Microsoft, open-weight frontier models (Kimi, DeepSeek, Qwen, GLM), xAI/Mistral, and model routers

### Takeaway
Open-weight models trail the closed frontier by a wide margin on Artificial Analysis v5:
- The best open-weight entry, Kimi K3.1 Pro, scores 46, and its weights are not yet released.
- Among models with released weights, the best (DeepSeek V4.1 Flash, GLM-5.3) score 32, against 58–59 at the top.

Kimi K3 (2.8T parameters, July 2026) has a custom license with revenue thresholds. Microsoft made computer-using agents GA in Copilot Studio (May 2026), running on managed Windows 365 Cloud PCs. OpenRouter remains the main multi-vendor router.

### Cited Findings
- **Microsoft Copilot Studio:**
  - Computer-using agents became GA in May 2026 (Tech Community post dated 13 May 2026).
  - They run on a Cloud PC pool powered by **Windows 365 for Agents**.
  - Makers can choose Anthropic models or OpenAI's CUA.
  - CUA can be enabled per environment, with audit logs sent to Purview.
  — [Microsoft Copilot blog](https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/new-and-improved-computer-using-agents-a-new-workflows-experience-and-real-time-voice-experiences/); [Tech Community](https://techcommunity.microsoft.com/blog/copilot-studio-blog/computer-using-agents-in-microsoft-copilot-studio-are-now-generally-available/4519427/replies/4520601); [M365 Community Conf. deck, Apr 2026](https://adoption.microsoft.com/files/microsoft-365-community-conference/2026/pdf/MS56%20-%20Supercharge%20Your%20Agents%20with%20Computer%20Use%20in%20Copilot%20Studio.pdf)
- **Kimi K3 (Moonshot):**
  - Debuted about 16 Jul 2026; full weights released 27 Jul 2026. 2.8T parameters, about 1.56 TB of weights.
  - The "Kimi K3 License" is custom and not OSI-approved. It reads like MIT for most of its length but adds revenue-based conditions (reportedly a commercial deal above $20M/yr **[secondary]**).
  — [Simon Willison, 27 Jul 2026](https://simonwillison.net/2026/Jul/27/kimi-k3/); [OpenRouter](https://openrouter.ai/blog/insights/kimi-k3-open-source/); [VentureBeat](https://venturebeat.com/technology/kimi-k3s-full-weights-are-here-but-theyre-open-with-a-caveat-what-enterprises-should-know)
- **Artificial Analysis v5 (27 Oct 2026), open-weight results:**
  - Kimi K3.1 Pro: 46 (weights not yet released).
  - Best with released weights: DeepSeek V4.1 Flash 1017 (max) and GLM-5.3 (max), both at 32.
  — [Artificial Analysis](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5)
- BenchLM (10 Nov 2026) ranks Kimi K3.1 Pro first among open models (74.6, labeled "estimated"). — [BenchLM](https://benchlm.ai/best/open-source-llm-comparison)
- OpenRouter's June 2026 overview of the open-weight models that matter is also available. — [OpenRouter, Jun 2026](https://openrouter.ai/blog/insights/the-open-weight-models-that-matter-june-2026/)
- **OpenRouter pricing [secondary]:**
  - `openrouter/auto` adds no routing fee; you pay the chosen model's price.
  - The credit purchase fee is reportedly 5.5% on Standard, and BYOK is reportedly free up to $25K per month.
  - The auto router respects privacy and ZDR settings.
  — [Dupple](https://dupple.com/learn/openrouter-pricing); [Activepieces](https://www.activepieces.com/blog/understanding-openrouter-pricing-2026-and-fees); [OpenRouter auto](https://openrouter.ai/models/openrouter/auto)

### Inferences
- **Open-weight models are not a good fit for Jair OS's hardest work.** At its current scale, the hardest agentic work is desktop UI and multi-step workflows, where a 26-point gap matters. Open-weight models are plausible for a local Mac worker doing bulk text tasks such as tagging question-bank items, if a smaller distilled model fits in memory; Kimi K3 at 1.5 TB clearly does not.
- **Windows UI automation option:** Microsoft's Windows 365 for Agents is the "managed desktop" alternative to self-maintained Windows machines. It is likely overkill and costly for a single teacher, but the pattern is relevant: managed, ephemeral desktops avoid the "device offline" failure class.
- **Routers:** OpenRouter can provide one API across vendors and serve as a fallback path when one vendor is down. The cost is a 5.5% credit fee and an added dependency, and vendor-specific features (Managed Agents, caching nuances, computer toolsets) are lost.

### Gaps
- Not researched (the shared search limit was hit, and later searches went to higher-priority gaps): Microsoft Agent Framework 2026 status, xAI Grok models and API, Mistral 2026 lineup, Qwen 3.x details, and DeepSeek V4 pricing and license. I found no reliable 2026 source on these within budget.

---

## 5. Cost levers in 2026, with concrete numbers

### Takeaway
The levers stack, and per-task cost varies about 10× by effort setting alone:
- Batch: 50% off at all three big vendors.
- Prompt-cache reads: 0.025×–0.1× of input price.
- Effort/reasoning level.
- Routing to small models: Haiku 5.5, GPT-6 Luna and Gemini Flash-Lite all cost about $0.10–$0.30 per 1M input tokens.
- Premium speed tiers (fast/ultrafast) cost 2–6× and should be avoided for background automation.

### Cited Findings
- **Anthropic** — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing.md):
  - **Batch API: 50% off** input and output. Batch and caching discounts stack.
  - **Cache writes**: 1.25× for a 5-minute TTL, 2× for a 1-hour TTL.
  - **Cache reads**: 0.1× on most models; **0.05× on Opus 5.5 and Sonnet 5.5** ($0.20 and $0.10 per 1M); **0.025× on Fable 5.1/5.2**.
  - US-only `inference_geo` adds a 1.1× multiplier.
  - 1M context is billed at standard rates; the exception is Haiku 5.5, whose price is about 5× higher for prompts over 100K tokens.
- For Fable-class models, a `max_tokens: 0` keep-alive request is usually cheaper than paying for the 1-hour TTL. — Skill ref, mirrors [prompt caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md)
- **OpenAI** — [OpenAI pricing](https://developers.openai.com/api/docs/pricing):
  - Batch and Flex: 50% off.
  - Cached input: GPT-6.2 Sol $0.10 vs $2 standard (0.05×); GPT-6 Luna $0.01.
  - Fast mode (formerly Priority) costs 2×; Ultrafast costs 3× through Feb 2027, then 6×.
- **Google** — [Gemini pricing](https://aistudio.google.com/docs/pricing):
  - Batch and Flex: 50%; Priority costs 1.8×.
  - Context caching: about 0.05× input plus storage of $0.50–$1.00 per 1M tokens per hour.
  - Free tiers exist on Hydrogen and the Flash/Flash-Lite models, but free-tier data is used to improve Google's products.
- **Effort matters:**
  - Opus 5.5 at low effort scores 35 for $0.98 per task; at max effort it scores 58 for $10.04 per task.
  - GPT-6.1 Terra (max) was the cheapest top-10 model at $0.96 per task; Fable 5.1 (max) was the most expensive at $13.04.
  — [Artificial Analysis v5](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5)
- Anthropic's own advice: measure the strongest model at lower effort before building a multi-model cascade. Caches are model-scoped, so a cascade loses cache reuse; judge cost per completed task, not per request. — Skill ref, mirrors [Cost optimization page](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence.md)
- **Agent runtime costs:**
  - Claude Managed Agents: $0.08 per session-hour.
  - OpenAI containers: $0.03 per 20 minutes for 1 GB.
  - Claude code execution: 1,550 free hours per month, then $0.05/hr.
  - Web search costs about $10 per 1,000 at Anthropic and OpenAI. Google's Search grounding gives 5,000 free requests per month, then $14 per 1,000.
  — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing.md); [OpenAI pricing](https://developers.openai.com/api/docs/pricing); [Gemini pricing](https://aistudio.google.com/docs/pricing)
- **Computer use overhead** is significant: about 4,500 tokens of toolset definition per request, plus about 1,000–1,800 tokens per screenshot. Caching the stable prefix and batch-pruning screenshots are the documented mitigations. — [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing.md); [computer use docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool.md)

### Inferences
- **Recommended cost stack for Jair OS** (which currently spends very little):
  1. Haiku 5.5 or Luna-class models for routing, classification and readback checks.
  2. Sonnet 5.5 for generation, with system prompts and editorial standards cached (cache reads at 0.05×).
  3. The Batch API (50%) for question-bank ingestion from PDFs and bulk material generation, which are not latency-sensitive.
  4. Opus 5.5 or Fable 5.2 only for quality-gate grading on high-stakes outputs.
- **Example:** a 2,000-question batch ingestion at about 3K input and 1K output tokens per item on Sonnet 5.5 batch costs about $0.006 + $0.005 per item, roughly $22 in total. This is computed from the listed prices, not measured.
- Run desktop UI agents at moderate effort and invest in deterministic readback (OCR or DOM checks) to reduce screenshot loops. Those loops are where token costs compound.

### Gaps
- Small-model distillation offerings for 2026 (vendor fine-tuning or distillation APIs and their prices) were not researched.

---

## 6. Benchmarks that matter for agents, and current leaders

### Takeaway
There is no single clean leader in Nov 2026:
- Anthropic (Opus 5.5 / Fable 5.2), OpenAI (GPT-6.x Astra/Sol) and Google (Gemini 4 Carbon) trade the top spot on composite indices within weeks.
- On agentic terminal coding (Terminal-Bench 4.0), Claude Opus 5.5 leads (about 64–66%).
- OSWorld-Verified is near saturation (about 90%), so harder successors (OSWorld 2.x) now matter. Metric definitions there (strict vs partial pass) change numbers by about 30 points.

Vendor-reported numbers and independent replications often diverge.

### Cited Findings
- **Artificial Analysis Intelligence Index v5** (27 Oct 2026):
  - Composition: knowledge work 25% (AA-Briefcase, AutomationBench-AA, GDP.pdf); coding 25% (FrontierCode 2.0, Terminal-Bench 4.0); science 25%; general 25%.
  - 60% of the index now uses private or held-out sets. GDPval-AA was removed.
  - Launch scores: Opus 5.5 (max) 58, GPT-6 Astra 57, GPT-6.1 Sol 55, Gemini 4 Argon 50, Kimi K3.1 Pro 46, Haiku 5.5 36.
  — [Artificial Analysis](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5)
- **Leader conflict:**
  - A 28 Oct 2026 Artificial Analysis post reportedly named Gemini 4 Carbon the new #1 (59) **[secondary]**. — [search summary of AA/livedoor](https://news.livedoor.com/article/detail/32684059/)
  - Press coverage of Fable 5.2 (9 Nov) claims #1 at 65 **[UNCONFIRMED, secondary]**. — [9to5Mac](https://9to5mac.com/2026/11/09/anthropic-upgrades-claude-with-new-fable-5-2-model-details-here/)
  - Decrypt reports Fable 5.2 ahead of GPT-6.2 Astra. — [Decrypt](https://decrypt.co/383488/openai-gpt-6-2-astra-challenges-anthropic-price-but-not-every-benchmark)
- **Terminal-Bench 4.0:**
  - Snorkel's leaderboard: Opus 5.5 (Claude Code) 64.8% ±3.1, Sonnet 5.5 61.8% — [Snorkel](https://snorkel.ai/leaderboard/terminal-bench/)
  - Anthropic reports 66.4% for Opus 5.5 vs 57.9% for GPT-6 Astra — [Anthropic](https://www.anthropic.com/news/claude-opus-5-5)
  - An older Snorkel snapshot had GPT-6 Astra first at 58.2% — [Snorkel](https://snorkel.ai/leaderboard/terminal-bench-4-0/)
- **OSWorld:**
  - OSWorld-Verified is reportedly about 90.19%, above the human baseline **[secondary]**.
  - On OSWorld 2.0 the best is about 20.6% binary / 54.8% partial (Opus 4.8) **[secondary]**.
  — [decodethefuture](https://decodethefuture.org/en/ai-agent-benchmarks-2026/?noamp=mobile)
  - Anthropic reports OSWorld 2.1 partial 81.8% for Opus 5.5; LLM Stats reports a strict pass of 48.7%. — [Anthropic](https://www.anthropic.com/news/claude-opus-5-5); [LLM Stats](https://llm-stats.com/blog/research/claude-opus-5-5-launch)
- **SWE-bench:** OpenAI stopped reporting Verified in Feb 2026. The best SWE-bench Pro score was about 61.5% (Muse Spark 1.1) as of 13 Oct 2026 **[secondary]**. — [decodethefuture](https://decodethefuture.org/en/ai-agent-benchmarks-2026/?noamp=mobile)
- **GDPval:**
  - Anthropic reports a GDPval-AA v2.1 Elo of 1846 for Opus 5.5 vs 1542 for GPT-6 Astra. — [Anthropic](https://www.anthropic.com/news/claude-opus-5-5)
  - OpenAI reports a GDPval v2 gain of +6.2 for GPT-6.2 Astra (internal eval). — [OpenAI](https://openai.com/index/introducing-gpt-6-2-astra-sol)
  - These are different variants and not comparable.
- **AutomationBench** (closest to workflow automation): Opus 5.5 40.0% vs GPT-6 Astra 41.4%. — [Anthropic](https://www.anthropic.com/news/claude-opus-5-5)
- **Independent check:** Zapier's own Opus 5.5 run, without fallback models, reportedly gave different Terminal-Bench numbers. — [Zapier benchmarks](https://zapier.com/ja/benchmarks/claude-opus5_5-report)

### Inferences
- **For Jair OS's P1 "empirical agent certification":**
  - Public benchmarks are noisy (vendor vs independent results, partial vs strict metrics). They are a weak proxy for "enter 40 dictated grades into a specific school ERP correctly."
  - The defensible approach is a private eval suite built from Jair OS's own execution logs, scored with strict end-state readback. This mirrors AA's move to private and held-out sets.
  - AutomationBench and OSWorld 2.x strict-pass are the most relevant public signals for desktop and workflow agents.
  - Top composite scores are within about 1–8 points of each other, so cost per completed task and reliability should drive model choice more than leaderboard rank.

### Gaps
- tau-bench (tau²/tau³) 2026 results, BrowseComp and current GAIA leaders were not found in the sources read.
- No November 2026 snapshot of the official SWE-bench Pro or OSWorld leaderboards was verified.

---

## 7. What Jair OS could adopt from each platform, and risks/lock-in (synthesis anchored in the findings above)

### Takeaway
The highest-leverage, lowest-lock-in moves are architectural patterns that every vendor has converged on:
- A durable event log separate from the harness and sandbox, with resume-from-log ("wake") or snapshot/rehydrate.
- Credentials brokered outside agents (vaults).
- Mandatory screenshot or readback verification for computer use.
- Rubric graders kept separate from the agents they grade.
- Cheap small-model routing combined with batch and caching.

Vendor-hosted runtimes (Claude Managed Agents, OpenAI Agents API, Gemini Managed Agents) can replace the flaky n8n host for cloud-side workflows. Desktop ERP automation must remain self-hosted.

### Cited Findings
- **Durable state is the shared pattern:**
  - Anthropic: session log + `wake(sessionId)`. — [Anthropic Engineering](https://www.anthropic.com/engineering/managed-agents)
  - OpenAI: snapshot and rehydrate in a fresh container. — [OpenAI Agents SDK](https://openai.com/index/the-next-evolution-of-the-agents-sdk/)
  - Google: Agent Engine Sessions and Memory Bank GA. — [Google Developers Blog](https://developers.googleblog.com/agents-adk-agent-engine-a2a-enhancements-google-io/)
- **Hosted cron and event-driven agents now exist at all three vendors:**
  - Claude scheduled deployments and webhooks — [release notes](https://platform.claude.com/docs/en/release-notes/overview.md)
  - Claude Code scheduled tasks with API and GitHub triggers — [Claude Code docs](https://code.claude.com/docs/en/routines.md)
  - OpenAI Teams shared tasks and MCP Events — [DevDay recap](https://openai.com/index/devday-2026-recap/)
  - Antigravity 2.0 scheduled background tasks — [Google I/O](https://blog.google/innovation-and-ai/technology/ai/google-io-2026-all-our-announcements/)
  - Gemini webhooks for batch and long-running operations — [Gemini changelog](https://aistudio.google.com/docs/changelog)
- **Deprecation churn in 2026:**
  - OpenAI Agent Builder retired 30 Nov 2026. — [OpenAI](https://openai.com/index/introducing-agentkit/)
  - Claude Sonnet 4.5 retires 30 Nov 2026. — [Claude release notes](https://platform.claude.com/docs/en/release-notes/overview.md)
  - Gemini 2.5 Pro/Flash auto-rerouted on 1 Dec 2026, and Gemini CLI is superseded by Antigravity CLI. — [Gemini changelog](https://aistudio.google.com/docs/changelog); [Google I/O](https://blog.google/innovation-and-ai/technology/ai/google-io-2026-all-our-announcements/)
- **Data and compliance constraints:**
  - Claude Managed Agents and message threads are not ZDR-eligible, and session history is kept until deleted. — Skill ref
  - Gemini API sets `store=true` by default for new paid projects (26 Oct 2026). — [Gemini changelog](https://aistudio.google.com/docs/changelog)
  - Gemini free tiers use data to improve Google's products. — [Gemini pricing](https://aistudio.google.com/docs/pricing)

### Inferences

**Concrete adoption options, ordered by expected impact on P0:**

1. **Verification-first desktop harness (vendor-neutral).** Adopt Anthropic's documented rules: screenshot or readback after each action, halt on the first failure in a batch, zoom for small text, end-to-end check at session start. Store each readback artifact in Supabase as the "external result confirmation" before marking an execution complete. This targets "executions closed as unverified, readback required" and the bulk grade-entry failures directly.
2. **Brain/hands refactor of the executor layer:**
   - Supabase table as the append-only execution event log.
   - Stateless harness workers.
   - Devices as hands behind one `execute(name, input)` interface.
   - Heartbeat loss becomes a classified, retryable tool error with a circuit breaker per device.
   - Resume from the last logged event via a `wake()` equivalent, which delivers checkpoint recovery.
3. **Replace the offline n8n host for cloud-only workflows.** Use Claude Managed Agents scheduled deployments, plus outcomes for the editorial/scientific quality gates, plus session budgets for cost caps. Alternatively, use Claude Code scheduled tasks for repo-centric maintenance and self-healing jobs, which bill the subscription. Keep n8n, or retire it, only for simple glue.
4. **Credential broker.** Follow the vault pattern: agents never hold Google or WhatsApp tokens. The broker centralizes OAuth refresh and error classification, addressing the "Google OAuth connection errors" pain point.
5. **Cost routing:** Haiku 5.5 (or Luna or Flash-Lite) for routing and readback checks; Sonnet 5.5 with caching for generation; Batch API for PDF question-bank ingestion; top models only as graders.
6. **Google-native education features:** pilot free Gemini in Classroom for simple teacher-side generation, and track the Classroom MCP server as a possible replacement for custom Classroom integration code.
7. **Independent evaluation (P1):** use a separate grader agent, as Anthropic's evaluator-agent harness and Managed Agents outcomes both do. Run a private regression suite drawn from real execution logs rather than relying on public leaderboards.

**Lock-in and risk notes:**
- Managed Agents is in beta, available only on the first-party API and Claude Platform on AWS, and not ZDR-eligible. Student data (grades, parent contacts) passing through hosted sessions raises Brazilian LGPD questions. Prefer self-hosted sandboxes, or keep personal data in Jair OS and pass only IDs.
- Vendor-specific primitives (computer toolset versions, forced `tool_choice` removal, `temperature` removal, thinking-block binding) change several times a year. Keep a thin provider-adapter layer in the 72 agent contracts.
- Unattended auto-mode runs (Claude Code scheduled tasks) and "all connectors included by default" create write-risk to real systems (Classroom posts, WhatsApp). Keep Jair OS's risk-based human approval as the gate, and strip write-capable connectors from scheduled tasks.

### Gaps
- No hands-on measurement exists of Claude vs Gemini vs OpenAI computer use on Brazilian school-ERP UIs (Portuguese UI, dense grids). This should be one of Jair OS's own evals.
- n8n's 2026 state, and alternatives such as Temporal, Inngest or Trigger.dev, were outside this research scope.
- **YouTube:** no specific 2026 YouTube videos (vendor keynotes or the AI Explained, Matthew Berman, Sam Witteveen and IndyDevDan channels) were collected with verified dates, because of the search budget. Primary event pages used instead: [Google I/O 2026 keynote moments](https://blog.google/innovation-and-ai/technology/ai/io-2026-keynote-moment-videos/) and [OpenAI DevDay 2026 recap](https://openai.com/index/devday-2026-recap/).
