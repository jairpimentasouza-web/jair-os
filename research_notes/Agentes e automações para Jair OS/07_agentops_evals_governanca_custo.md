# AgentOps for Jair OS: observability, evals, empirical certification, guardrails, governance/regulation (Brazil focus), cost and self-healing, as of 2026-11-23

Research date: 2026-11-23. Labels used below:
- **[BG]**: background fact from before 2026.
- **[ENACTED]**: law or regulation in force.
- **[BILL]**: not law.
- **[2nd]**: secondary source (blog, law-firm note or aggregator) not checked against the primary.
- **[unverified]**: background knowledge I did not re-fetch in this session. These items are also listed under Gaps.

Search budget note: the shared web-search budget ran out once mid-task and was then reset. A few topics got less coverage as a result (DeepEval/RAGAS, Lakera, Weave/Logfire/Laminar/OpenLIT details, ISO 42001/NIST 2026 updates). They are listed under Gaps.

---

## 1. Observability and tracing in 2026: which tool fits a solo developer on Supabase with a low budget?

### Takeaway
The OpenTelemetry GenAI conventions (including agent and MCP spans) are the de-facto schema. As of mid/late 2026 they are still "Development" (not Stable) and now live in their own repository.

- **Langfuse** remains the default open-source choice. It was acquired by ClickHouse in January 2026 and its core is still MIT. Self-hosting it needs ClickHouse + Redis + S3 alongside Postgres, so it cannot run on Supabase Postgres alone.
- **Arize Phoenix** (ELv2) is the lighter self-host option.
- **Hosted free tiers** (Langfuse Hobby 50k units/month, LangSmith 5k traces/month, Braintrust Starter 1 GB) are fine for experimentation. They mean sending minors' data to US/EU/Japan regions.
- **Recommendation for Jair OS:** keep the system of record in Supabase as OTel-GenAI-shaped span tables, with redaction applied first. Add an external UI only for annotation and evals, and only on pseudonymized traces.

### Cited Findings
**OpenTelemetry GenAI conventions**
- (checked 2026-11-23) opentelemetry.io now says "GenAI semantic conventions have moved to the OpenTelemetry GenAI semantic conventions repository" (github.com/open-telemetry/semantic-conventions-genai). The sub-pages listed as moved are agent spans, spans, events, metrics, MCP, plus provider pages for Anthropic, AWS Bedrock, Azure AI Inference and OpenAI. — [OpenTelemetry docs](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- The new repo is Apache-2.0, with about 739 commits and about 160 open issues. As of 2026-11-23 its Releases section is empty and its schema URL is "TODO", so it has no tagged stable release yet. — [GitHub semantic-conventions-genai](https://github.com/open-telemetry/semantic-conventions-genai)
- [2nd] Status as of 2026-07-17: no GenAI-specific span, event, metric or attribute in the dedicated repository is marked Stable. The split from the main semconv repo happened around June 2026 (tied to v1.42.0). — [John Hodge, July 2026](https://john-hodge.com/blog/opentelemetry-genai-semantic-conventions/); [DEV: "not stable yet"](https://dev.to/azena-ai/opentelemetrys-genai-semantic-conventions-are-not-stable-yet-heres-what-actually-shipped-in-2026-3mke)
- [2nd] Agent conventions define operations such as `create_agent`, `invoke_agent` and `execute_tool`, kept separate from model-call spans (`chat`, `embeddings`). The MCP conventions:
  - define client and server spans, four MCP metrics, and attributes such as `mcp.method.name` and `mcp.session.id`;
  - bridge an MCP tool call onto the GenAI `execute_tool` span instead of creating a duplicate span.
  - — [Greptime, 2026-05-09](https://greptime.com/blogs/2026-05-09-opentelemetry-genai-semantic-conventions)
- [2nd] Coding agents such as VS Code Copilot and OpenAI Codex reportedly already emit GenAI traces, with Claude Code doing so in beta. — [Greptime, 2026-05-09](https://greptime.com/blogs/2026-05-09-opentelemetry-genai-semantic-conventions)

**Langfuse**
- ClickHouse acquired Langfuse; Langfuse's announcement is dated 2026-01-16. Core features stay "100% open-source under MIT" and Langfuse Cloud keeps running standalone. — [Langfuse blog](https://langfuse.com/blog/joining-clickhouse); [ClickHouse blog](https://clickhouse.com/blog/clickhouse-acquires-langfuse-open-source-llm-observability)
- Self-hosting Langfuse (docs labelled "v4") needs Web and Worker containers plus PostgreSQL (transactional data), ClickHouse (traces, observations, scores), Redis/Valkey (cache and queue) and S3/blob storage. Docker Compose is described as suited to "local use and testing" with no HA or backups. — [Langfuse self-hosting docs](https://langfuse.com/docs/self-hosting)
- ClickHouse version and sizing for Langfuse:
  - Langfuse v3 needs ClickHouse ≥24.3; v4 needs ≥25.12 (26.4 recommended).
  - The guide suggests starting at 2 CPU / 8 GiB for ClickHouse.
  - ClickHouse and Postgres must run in UTC.
  - — [Langfuse ClickHouse guide](https://langfuse.com/self-hosting/deployment/infrastructure/clickhouse)
- [2nd] A 2026 guide gives 4+ cores / 16 GiB RAM / 100 GiB disk as a practical whole-stack minimum (e.g. AWS t3.xlarge). — [DEV 2026 self-host guide](https://dev.to/jangwook_kim_e31e7291ad98/langfuse-self-host-llm-observability-for-free-2026-guide-3blp)
- Langfuse Cloud pricing (page undated, fetched 2026-11-23):

  | Plan | Price | Included units/month | Data access | Users |
  |---|---|---|---|---|
  | Hobby | free | 50k | 30 days | 2 |
  | Core | $29/mo | 100k | 90 days | unlimited |
  | Pro | $199/mo | 100k | 3 years | unlimited |
  | Enterprise | $2,499/mo | 100k | 3 years | unlimited |

  Overage is $8 per 100k units. A unit is any trace, observation or score. Regions are US, EU or Japan, hosted on AWS; there is no Brazil region. — [Langfuse pricing](https://langfuse.com/pricing)

**LangSmith and Braintrust**
- LangSmith (page fetched 2026-11-23):
  - Developer plan: free, 1 seat, up to 5k base traces/month.
  - Plus: $39/seat/month, 10k base traces, unlimited seats.
  - Retention: base traces 14 days, extended 180 days.
  - Self-hosting is Enterprise only.
  - — [LangChain pricing](https://www.langchain.com/pricing)
- Braintrust (page fetched 2026-11-23):
  - Starter: $0, 1 GB processed data (+$4/GB), 10k scores, 14-day retention.
  - Pro: $249/mo, 5 GB, 50k scores, 30-day retention (extendable to 180 days).
  - On-prem or hosted deployment only on Enterprise.
  - — [Braintrust pricing](https://www.braintrust.dev/pricing)

**Arize Phoenix**
- Phoenix is licensed under Elastic License 2.0 and is "built on top of OpenTelemetry" (OpenInference instrumentation). Features: tracing, evals, datasets, experiments and prompt management. — [Phoenix GitHub](https://github.com/Arize-ai/phoenix)
- The self-host docs say Phoenix is "free to self-host with no feature limitations". They list OAuth2, LDAP and local-account auth, RBAC and trace retention policies, and recommend pinning a version tag. — [Phoenix self-hosting docs](https://arize.com/docs/phoenix/self-hosting)

**Helicone and Promptfoo**
- [2nd, single source] Helicone went to Mintlify on 2026-03-03 and is in "maintenance mode" (security updates, new models, bug fixes). — [HackerNoon analysis](https://hackernoon.com/two-acquisitions-deep-two-still-standing-whats-really-happening-to-open-source-llm-observability)
- [2nd] Several 2026 comparisons agree Helicone's long-term viability is uncertain. — [DevToolLab 2026 comparison](https://devtoollab.com/blog/best-llm-observability-tools)
- OpenAI announced its acquisition of Promptfoo (the OSS eval and red-team CLI) on 2026-03-09. Promptfoo says it will remain open source. — [OpenAI](https://openai.com/index/openai-to-acquire-promptfoo/); [Promptfoo blog](https://promptfoo.dev/blog/promptfoo-joining-openai)

**2026 comparison articles**
- [2nd] 2026 comparison blogs mostly rank Langfuse as the default OSS pick, LangSmith for LangChain/LangGraph stacks, Braintrust as "eval-first/premium", and Phoenix as free self-host. Figures are inconsistent across these blogs. — [ajayk.sh 2026](https://www.ajayk.sh/blog/llm-observability-tools-compared-2026/); [DevToolLab](https://devtoollab.com/blog/best-llm-observability-tools); [Laminar (vendor) "Langfuse alternatives 2026"](https://laminar.sh/article/langfuse-alternatives-2026)

**Anthropic SDK tracing**
- Anthropic's API documentation (as bundled in Anthropic's claude-api reference, cached 2026-11-03) describes:
  - OpenTelemetry tracing of Claude API calls and Managed Agents sessions (SDK spans, `traceparent`, token counts from spans);
  - a Usage and Cost Analytics API that groups token usage by model, API key and workspace.
  - — [Anthropic docs: pricing/usage pages listed in the claude-api reference](https://platform.claude.com/docs/en/about-claude/pricing)

### Inferences
- **Langfuse cannot use Supabase as its only database.** Traces must go to ClickHouse, and Redis + S3 are also required. A fully self-hosted Langfuse for Jair OS therefore means another VM of roughly 4 vCPU / 16 GB, an ongoing ops burden and a real monthly bill. That conflicts with near-zero spend and a solo operator.
- **Recommended architecture for Jair OS (low budget, minors' data):**
  1. **System of record in Supabase.** Extend the existing executions tables into an OTel-shaped `spans` table: `trace_id`, `span_id`, `parent_span_id`, `gen_ai.operation.name` (`invoke_agent`/`execute_tool`/`chat`), `gen_ai.request.model`, input/output/cached tokens, `cost_usd`, `mcp.method.name`, tool name, status, workflow_id, agent_contract_id, contract_version and `pii_redacted` (bool). Have n8n, edge functions and the MCP server write to it. This keeps the data in Brazil-controlled infrastructure, under RLS, and queryable by the existing watchdog.
  2. **Use OTel attribute names now**, even without a collector. Migrating later to any backend (Langfuse, Phoenix, Grafana) then becomes an export job, not a rewrite. The conventions are still "Development", so pin to a dated snapshot of the attribute names and record that version in the table.
  3. **Annotation and eval UI.** Either Langfuse Cloud Hobby (free, 50k units/month) or a self-hosted Phoenix container, fed only with pseudonymized traces (student names, CPF and grades replaced by stable pseudonyms). Hobby's 30-day data access and 2 users fit a solo operator. Its EU region is preferable to US for transfer-risk reasons, but it is still an international transfer.
  4. **Avoid Helicone** as a new dependency (maintenance mode). Treat LangSmith as relevant only if Jair OS adopts LangGraph.
- **Alert sources.** The ~20 open alerts ("unverified executions needing readback", "stale executions", "integrity drift") map naturally onto span status plus a `verified_at` readback timestamp. A trace-level "verified" flag on `invoke_agent` spans is the observable needed for the certification program in section 3.

### Gaps
- Not researched in depth (2026 pricing/hosting for each): W&B Weave, Pydantic Logfire, Laminar, AgentOps.ai, OpenLIT.
- Whether Phoenix's 2026 release supports PostgreSQL as its backing store, i.e. whether it could point at a Supabase Postgres schema. I believe Phoenix supports SQLite or PostgreSQL via `PHOENIX_SQL_DATABASE_URL` [unverified]; the pages fetched did not confirm it.
- The exact current list of GenAI agent/MCP attribute names in the new repo (`docs/` and `model/` were not fetched). The status claims rest on secondary sources.
- No official Helicone or Mintlify announcement was found; the acquisition date comes from one secondary source.

---

## 2. Evals: offline vs online, LLM-as-judge practice and biases, agent/trajectory/tool-call evals, tools and benchmarks

### Takeaway
The 2026 practitioner consensus (Anthropic Jan 2026; Hamel Husain & Shreya Shankar; Eugene Yan):
- Start from error analysis on real transcripts.
- Build 20–50 tasks from real failures.
- Prefer deterministic code graders; use LLM judges only for nuance, one judge per failure mode, validated against human labels (TPR/TNR, not accuracy).
- Grade outcomes rather than exact paths.
- Run multiple isolated trials per task.
- Split capability evals (low pass rate, hill-climb) from regression evals (~100%, block deploys).

LLM judges have documented position and verbosity biases. 2026 work shows judge verbosity ratings track raw length far more than human ratings do.

### Cited Findings
**Anthropic, "Demystifying evals for AI agents" (2026-01-09)**
- Use three grader types:
  - code-based: fast, cheap, reproducible, brittle;
  - model-based: flexible, but non-deterministic and needs calibration against humans;
  - human: the gold standard, slow and expensive.
- Scoring can be weighted, binary (all graders must pass) or hybrid.
- Grade each dimension separately, give LLM judges an "Unknown" option, and allow partial credit.
- "20-50 simple tasks drawn from real failures is a great start." A good task is one where two domain experts reach the same verdict. Provide a reference solution, and test both where a behaviour should and should not happen.
- Capability evals should start at a low pass rate; regression evals should stay near 100%. Saturated capability evals "graduate" into regression suites.
- "Grade what the agent produced, not the path it took"; transcript/tool-use rubrics can supplement outcome checks.
- Run multiple trials, each isolated from a clean environment. A 0% pass rate across many trials usually means a broken task or grader. Read transcripts to check that "failures seem fair".
- — [Anthropic Engineering](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

**Hamel Husain (hamel.dev)**
- 2026 eval-related posts:
  - "Evals Skills for Coding Agents" (2026-03-02)
  - "'It's Hard to Eval' Is a Product Smell" (2026-06-29)
  - "Do Automated Evals Work?" (2026-07-11)
  - "AI Evals: Everything You Need to Know" (FAQ, 2026-09-18)
  - "Claude's new auto eval tool" (2026-09-30)
  - "How To Use Decision Models for Evals" (2026-10-20)
  - Earlier [BG]: "Selecting the Right AI Evals Tool" (2025-10-01) and "Inspect AI, an OSS Python library for LLM evals" (2025-06-23).
  - — [hamel.dev index](https://hamel.dev/)
- His 2026-09-30 review of Anthropic's eval tooling for Claude Code (`build_eval` / `hill-climb` in the claude-api plugin):
  - **Liked:** it found real issues (handoff, formatting, voice-agent problems).
  - **Criticized:** it pushes users to create an eval before reviewing data; labeling in Markdown files inside chat is cumbersome; it bundled four checks into one pass/fail metric.
  - **His recommendations:** do error analysis first; scope each evaluator to one error type; separate code checks from LLM judges; read the judge prompt; label in a purpose-built web UI. "If an eval tool doesn't put looking at data at the center of your workflow, it's not worth using."
  - — [Hamel, 2026-09-30](https://hamel.dev/blog/posts/claude-auto-evals/)
- [2nd] Hamel & Shreya's method, as summarized by others:
  - Error analysis must be done manually; LLMs may help cluster failures, but humans refine.
  - Judges should be measured by true-positive and true-negative rates against human labels, because with a 10% failure rate an always-"pass" judge scores 90% accuracy.
  - Their Maven course covers error analysis, LLM-as-judge, code evaluators, CI/CD suites, production monitoring and red-teaming.
  - — [Aakash Gupta podcast write-up](https://www.news.aakashg.com/p/hamel-shreya-podcast); [Human Learning substack](https://humanlearning.substack.com/p/trusting-your-ai-product-and-common); [Maven course page](https://maven.com/parlance-labs/evals)

**Eugene Yan (eugeneyan.com)**
- "Product Evals in Three Simple Steps" (2025-11-23 [BG]): label some data, align LLM evaluators, run the eval harness on every change.
- "How Public Evals Work and Fail, and What Should Change" (2026-11-19): a teardown of 12 benchmarks.
- "Patterns for Building Cybersecurity Evals" (2026-06-21).
- [BG] "An LLM-as-Judge Won't Save The Product—Fixing Your Process Will" (2025-04-20).
- — [eugeneyan.com/writing](https://eugeneyan.com/writing/)

**LLM-as-judge biases**
- [BG] MT-Bench/Chatbot Arena (2023) documented strong position bias and verbosity bias in LLM judges; self-enhancement was inconclusive. — [arXiv 2306.05685](https://arxiv.org/pdf/2306.05685)
- [BG] Self-preference bias was studied specifically. — [arXiv 2410.21819](https://arxiv.org/pdf/2410.21819)
- [BG] LLM judges are poorly calibrated and overconfident relative to humans. — [arXiv 2402.06782](https://arxiv.org/pdf/2402.06782)
- 2026 (Apr): a factorial study across judge models, debiasing strategies and bias types. It finds judges lean toward concise answers on expansion pairs, but truncation controls suggest they still track quality (0.92–1.00 accuracy). — [arXiv 2604.23178](https://arxiv.org/html/2604.23178)
- 2026 (Jun): judge verbosity ratings tracked raw response length at r = .87, against .44 for human raters. Judge-vs-self-report agreement can masquerade as validation when judge-vs-human agreement is absent. — [arXiv 2606.09843](https://arxiv.org/pdf/2606.09843)
- 2026 (Jan) practitioner paper: gives rough bias ranges (position 5–15%, verbosity 10–20%) but explicitly says these are heuristics from the literature, not measurements. — [arXiv 2601.22025](https://arxiv.org/pdf/2601.22025)

**Agent reliability benchmarks**
- τ²-bench (Sierra) release notes: pass^k values are now recomputed with infrastructure-error simulations counted as failures, so older numbers may not be comparable. — [tau2-bench RELEASE_NOTES](https://raw.githubusercontent.com/sierra-research/tau2-bench/main/RELEASE_NOTES.md)
- [2nd] Third-party leaderboards mix self-reported model-card numbers, e.g. pass^1 around 63% for top entries, and warn against cross-org comparison. Version naming (τ²/τ³) is inconsistent across sources. — [Steel leaderboard page](https://leaderboard.steel.dev/leaderboards/tau-bench)
- Princeton HAL "AI Agent Reliability Tracker" (Rabanser, Kapoor, Kirgis, Liu, Utpala, Narayanan; covers models released after Jan 2026, e.g. Claude Opus 4.7, GPT-5.5, Gemini 3.1 Pro):
  - **Scope:** 15 agents on GAIA and τ-bench airline, 12 metrics in 4 dimensions (consistency, robustness, predictability, safety).
  - **Findings:**
    - Reliability improves much more slowly than accuracy.
    - There is a "substantial" pass@k vs pass^k gap across all models.
    - Outcome and resource consistency are low, with a "what but not when" pattern: agents pick similar actions but in a different order.
    - Prompt sensitivity separates models.
    - Bigger models are not reliably more consistent.
    - High-severity financial violations persist.
  - **Recommended practice:** multi-run protocols, input perturbation (paraphrase), re-evaluation over time to catch silent degradation, and minimum consistency and safety thresholds before deployment, matched to augmentation vs automation.
  - — [HAL Reliability Tracker](https://hal.cs.princeton.edu/reliability)

**Tools**
- Promptfoo (OSS CLI for evals and red-teaming) is now owned by OpenAI (2026-03-09) and remains OSS. — [Promptfoo blog](https://promptfoo.dev/blog/promptfoo-joining-openai)
- Inspect AI (UK AISI) was reviewed favourably by Hamel in 2025 [BG]. — [hamel.dev notes](https://hamel.dev/)
- Anthropic ships `build-eval` and `hillclimb` workflows in its claude-api skill/plugin. The bundled guidance (cached 2026-11-03) says:
  - get sign-off on inputs, grading method and measured cost before running;
  - use a train/validation/test split when hill-climbing;
  - "never keep or revert on a one-case swing"; the published bar for a production cutover is about 50 cases with at least 5 trials per configuration.
  - — [Anthropic docs (pricing/cost-optimization pages referenced by the claude-api reference)](https://platform.claude.com/docs/en/about-claude/pricing)

### Inferences
- **What this means for Jair OS:**
  - "72/72 contracts approved" and "groundedness 1.0" are very likely saturated metrics. Per Anthropic's framing they belong in regression suites (block on drop), not as evidence of capability.
  - Groundedness 1.0 on a small set should be re-checked for judge bias: a judge scored by the same model family, or a judge rewarding length.
  - Validate each judge against about 50–100 hand labels using TPR/TNR.
- **Suggested eval stack** (all OSS or near-free, runnable from n8n or CI):
  1. Code graders first:
     - JSON-schema validity of agent outputs;
     - tool-call correctness (right tool, args valid against strict schema, no forbidden tool in the risk tier);
     - deterministic checks on physics/maths answers (numeric tolerance, units, significant figures);
     - RAG retrieval metrics (MRR, Hit@k).
  2. One LLM judge per failure mode for editorial and scientific quality, each with an "Unknown" option, run at low cost (see section 6).
  3. A periodic human-label sample: the teacher labels about 20 items/week in a simple Supabase-backed annotation page, which keeps "looking at data" central.
  4. Promptfoo or Inspect AI as the runner for regression suites (RAG, security/prompt-injection, contract conformance) in CI.
- **Trajectory evals.** Score the outcome (final DB state, delivered artifact passes quality gates) as primary. Use transcript rubrics only for safety-relevant path properties, e.g. "did not call an external-effect tool without human approval" or "did not read student data outside scope". Do not require exact step order: HAL's "what but not when" finding says order varies naturally.
- **User simulation.** For the parent/student portal and tutoring Q&A agents, a τ-bench-style simulated user (an LLM playing parent/student personas with scripted goals), combined with paraphrase perturbations, is the cheapest way to get repeated trials. HAL found prompt sensitivity is where models differ.

### Gaps
- DeepEval and RAGAS 2026 versions/features and OpenAI Evals/graders 2026 status were not researched in this session.
- Current official τ²/τ³-bench leaderboard numbers (taubench.com not fetched).
- The content of Hamel's 2026-09-18 FAQ and 2026-10-20 "decision models" posts beyond their titles.

---

## 3. Agent reliability metrics and designing the "empirical agent certification" program

### Takeaway
Certify each agent contract version on pass^k (consistency) with a confidence interval, not on single-run success.

- Use an unbiased estimator over n ≥ k trials per task.
- Report Wilson (or Clopper-Pearson) intervals on success rate.
- Gate promotion on the **lower** confidence bound, plus zero critical-safety violations, plus audit/readback verification.

With realistic sample sizes a solo operator can certify about 90% reliability fairly quickly. Certifying 95% or more with 95% confidence needs about 59–73 consecutive clean runs per agent version. That argues for tiering by risk.

### Cited Findings
- pass@k is the chance of at least one success in k attempts and rises with k. pass^k is the chance that all k trials succeed and falls with k. Use "pass@k for tools where one success matters, pass^k for agents where consistency is essential." — [Anthropic, 2026-01-09](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [2nd] With per-trial success p: pass@k = 1 − (1 − p)^k and pass^k = p^k. Example: p = 0.75 gives about 42% for three consecutive successes. — [Khaled substack](https://khaledea.substack.com/p/evals-for-agents-the-missing-bridge); [Idlir Shkurti notes](https://idlirshkurti.github.io/tutorials/agent_evals.html)
- HAL uses multi-run outcome consistency with a corrected formula (2p̂ − 1)², where p̂ is the observed per-task success rate. It recommends minimum consistency and safety thresholds before deployment and re-evaluation over time. — [HAL Reliability Tracker](https://hal.cs.princeton.edu/reliability)
- τ²-bench counts infrastructure errors as failures in pass^k, rather than excluding them. — [tau2-bench release notes](https://raw.githubusercontent.com/sierra-research/tau2-bench/main/RELEASE_NOTES.md)
- Anthropic: isolate each trial from a clean environment to avoid correlated failures. — [Anthropic, 2026-01-09](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Anthropic's bundled cost guidance cites a published bar of about 50 cases × 5 or more trials per configuration for a production cutover decision. — [Anthropic docs](https://platform.claude.com/docs/en/about-claude/pricing)
- [BG, unverified] Background references for the estimators. I did not re-fetch these:
  - τ-bench (Yao et al., 2024, arXiv 2406.12045) introduced pass^k with the unbiased per-task estimator C(c,k)/C(n,k) for c successes in n trials.
  - The Codex paper (Chen et al., 2021, arXiv 2107.03374) gives the unbiased pass@k estimator 1 − C(n−c,k)/C(n,k).
  - Anthropic's "Adding Error Bars to Evals" (Miller, 2024, arXiv 2411.00640) argues for reporting standard errors and clustered SEs when questions are grouped.

### Inferences
**Worked numbers (computed in this session with the formulas above)**

pass^k by per-trial success rate p:

| p | pass^1 | pass^3 | pass^5 | pass^8 |
|---|---|---|---|---|
| 0.80 | 0.80 | 0.51 | 0.33 | 0.17 |
| 0.90 | 0.90 | 0.73 | 0.59 | 0.43 |
| 0.95 | 0.95 | 0.86 | 0.77 | 0.66 |
| 0.99 | 0.99 | 0.97 | 0.95 | 0.92 |

Wilson 95% intervals on observed success:

| Successes / trials | Wilson 95% CI |
|---|---|
| 48/50 | [0.865, 0.989] |
| 50/50 | [0.929, 1.000] |
| 95/100 | [0.888, 0.978] |
| 20/20 | [0.839, 1.000] |

Consecutive clean runs (zero failures) needed before the lower 95% bound clears a target:

| Target | Clopper-Pearson (exact) | Wilson |
|---|---|---|
| ≥ 0.90 | 29 | 35 |
| ≥ 0.95 | 59 | 73 |

Rule of three: zero failures in n runs gives a ≈ 3/n upper bound on the failure rate.

**Suggested certification design for Jair OS**

1. **Unit of certification.** (agent contract id, contract version, model id, prompt hash, tool-set hash). Any change resets the evidence. This matches practitioner advice to reset error budgets after component changes (section 7).
2. **Evidence sources, kept separate:**
   - **Offline suite:** 20–50 tasks per agent from real failures, each run k = 5 times in isolated environments → pass^5 per task plus mean.
   - **Shadow/online:** real executions with outcome verification (the existing "readback" check) → success rate with Wilson CI.
   - **Audit sample:** human-reviewed percentage of executions → audit-approval rate with CI.
3. **Promotion levels.** Thresholds use the lower CI bound, not the point estimate:

   | Level | Name | Requirement |
   |---|---|---|
   | L0 | Draft | Contract approved |
   | L1 | Supervised | ≥ 30 verified executions, lower-bound success ≥ 0.80, 0 critical violations; all outputs human-reviewed |
   | L2 | Spot-checked | ≥ 60 executions, lower bound ≥ 0.90, offline pass^5 ≥ 0.8 on the regression suite, audit approval lower bound ≥ 0.9; human review of a random 10–20% plus all high-risk actions |
   | L3 | Autonomous within tier | ≥ 100 executions, lower bound ≥ 0.95, pass^5 ≥ 0.9, 0 safety violations in the window. Only for low-risk agents (content drafts, internal ops). Never for legal/financial/medical/external-effect actions, or for anything producing evaluative judgments about students (CNE Res. 1/2026 bans fully automated decisions with relevant effects; see section 5). |

4. **Count infrastructure errors as failures**, as τ²-bench does, but tag them so the reliability engineering work (retries, timeouts) and the model/prompt quality work can be separated.
5. **Demotion.** Rolling window. Demote automatically when the lower bound drops below the level threshold or a critical violation occurs, and re-run the offline suite on every model or prompt change. This is HAL's "re-evaluate over time to catch silent degradation".
6. **Use pass@k only for agents where retries are cheap and invisible**, e.g. draft generation with a quality gate after it. Use pass^k for anything user-facing (portal answers, messages to parents).

**Sample-size reality for one person.** Most of the 72 contracts will run rarely. Pool evidence via the offline suite with repeated trials (cheap on small models; see section 6) and reserve online evidence for the top ~10 agents by volume. Report "insufficient evidence" as a distinct state rather than "approved".

### Gaps
- I did not re-fetch the τ-bench paper or Miller (2024), so the estimator formulas are cited as background.
- No published standard (ISO/NIST) prescribes numeric reliability thresholds for agent certification. The thresholds above are design proposals.

---

## 4. Guardrails: input/output validation, prompt-injection defence, schema validation, PII redaction for student data

### Takeaway
The 2026 "layered" pattern:
- PII redaction at ingress (Presidio);
- prompt-injection classifier (Prompt Guard 2);
- dialogue/tool policy (NeMo Guardrails, Colang);
- output safety classifier (Llama Guard 4, 12B, gated licence);
- strict schema validation on every tool call.

Presidio does not ship a confirmed Brazilian CPF recognizer. PT-BR needs custom recognizers with checksum validation plus Portuguese spaCy models. For Jair OS, the highest-value guardrails are deterministic: schema/strict tools, an allowlist of tools per risk tier, PII pseudonymization before any model or observability call, and the existing human-review gate.

### Cited Findings
- [2nd] Common 2026 stack: Presidio strips PII at ingress, Prompt Guard 2 detects injection inline, NeMo Guardrails orchestrates dialogue policy, and Llama Guard 4 classifies output safety. — [MorphLLM guardrails 2026](https://www.morphllm.com/llm-guardrails); [Infrabase comparison 2026](https://infrabase.ai/blog/llm-guardrails-compared)
- [2nd] Llama Guard 4 is a 12B model that labels prompts and responses (including multi-image) as safe or unsafe against the MLCommons hazard taxonomy. Its licence is gated and "not OSI-pure". — [MorphLLM](https://www.morphllm.com/llm-guardrails)
- [2nd] NeMo Guardrails is Apache-2.0, uses Colang, and is best suited to dialogue-flow and tool-use policy rather than content classification. — [MorphLLM](https://www.morphllm.com/llm-guardrails); [Mindgard 2026](https://mindgard.ai/blog/how-to-safeguard-llms-with-guardrails)
- PT-BR PII:
  - A Brazilian SBC paper says PT-BR deployments need extra recognizers and checksum validation for CPF/CNPJ, and describes a Presidio pipeline with custom recognizers that improved PT-BR detection. — [SBC SBSeg paper](https://sol.sbc.org.br/index.php/sbseg_estendido/article/download/44537/44300/)
  - The `tarja` library offers CPF/CNPJ masking with a Presidio plugin and stable salted pseudonyms (e.g. `<BR_CPF>`). — [PyPI tarja](https://pypi.org/project/tarja/)
  - Running Presidio with a Portuguese spaCy model (`pt_core_news_sm`) alongside English catches CPF patterns even inside English text. — [InterSystems community](https://community.intersystems.com/node/588345)
  - LangChain's Presidio multi-language guide is a template for per-language NLP engines. — [LangChain docs](https://python.langchain.com/docs/guides/privacy/presidio_data_anonymization/multi_language)
- Anthropic API features (bundled reference, cached 2026-11-03):
  - `strict: true` on tool definitions guarantees tool inputs validate against the JSON schema.
  - Structured outputs (`output_config.format`) constrain response format.
  - Under eager input streaming, clients must validate each parsed tool input against its schema before running it.
  - — [Anthropic docs](https://platform.claude.com/docs/en/about-claude/pricing)

### Inferences
**Recommendations for Jair OS, in priority order:**
1. **Pseudonymize students before any LLM or observability call.**
   - Replace names, CPF, phone, email and school/class identifiers with stable salted pseudonyms (`aluno_7f3a`).
   - Keep the mapping only in Supabase under RLS.
   - Re-identify only in the final rendering step for the teacher or parent.
   - Use Presidio with a custom CPF checksum recognizer and `pt_core_news` models, or `tarja`.
   - Apply the same redaction to span payloads before they leave Supabase (section 1).
2. **Deterministic guardrails over model guardrails:**
   - strict tool schemas;
   - per-risk-tier tool allowlists in each agent contract (an agent at L1/L2 cannot call external-effect tools without the approval token);
   - output schema checks;
   - the existing scientific/editorial quality gates.
   These are free, testable and certifiable, and they become code graders in the regression suite.
3. **Prompt-injection defence for ingested content** (student-submitted work, emails, web pages): run a small injection classifier (Prompt Guard 2 class) on untrusted inputs. Treat tool results and retrieved documents as data, never instructions. Add red-team cases to the Promptfoo suite.
4. **Output classifiers** (Llama Guard 4) matter most for the parent/student portal, where outputs reach minors. Running a 12B model locally may exceed the budget, so as an alternative restrict the portal to templated or grounded answers with a refusal path.
5. **Add NeMo Guardrails only if** the portal becomes a free-form chat. For workflow-style agents, contract-level policies plus n8n gating are simpler.

### Gaps
- Not researched in this session: Lakera (2026 status/pricing), OpenAI's guardrails library details, Guardrails AI 2026 status.
- One 2026 roundup claimed the LLM Guard repo was archived in July 2026. The specific source was not pinned, so treat this as unverified.
- Whether Presidio added an official BR CPF recognizer in 2026 (not confirmed).

---

## 5. Governance and regulation: Brazil (PL 2338, ANPD/LGPD, ECA Digital, CNE/MEC), EU AI Act as reference, ISO 42001/NIST; what a teacher using AI on students' data must do in practice

### Takeaway
- **[BILL] PL 2338/2023 is not law.** As of the Câmara record fetched 2026-11-23 it is "Aguardando Parecer do Relator na Comissão Especial", with zero pareceres; recent activity is only apensações (latest 13/11/2026).
- **What binds now [ENACTED]:**
  - LGPD Art. 14 (best interest; specific parental consent for children's data).
  - The ECA Digital (Lei 15.211/2025), in force since 2026-03-17. It covers IT products or services "directed to or likely accessed by" minors: privacy by default, a ban on profiling for ads, and an impact report when data is processed beyond strict need. ANPD's compliance-verification phase starts January 2027.
  - The new **Resolução CNE/CP nº 1/2026** (11 Nov 2026) on AI in education. Its prohibitions apply immediately and institutions get 12 months to adapt. It bans fully automated decisions about students and essay grading solely by AI, and classifies performance/dropout prediction and academic profiling as high-risk, requiring RIPD, human oversight, traceability and appeal.
- **ANPD priorities for 2026–2027:** children/adolescents and AI.
- **EU AI Act (reference only):** education high-risk obligations deferred to 2 Dec 2027.

### Cited Findings
**[BILL] PL 2338/2023 (AI framework bill)**
- Official Câmara record (fetched 2026-11-23):
  - Situação: "Aguardando Parecer do(a) Relator(a) na Comissão Especial sobre Inteligência Artificial".
  - Rapporteur: Dep. Aguinaldo Ribeiro (PP-PB), designated 20/05/2025.
  - Priority regime (Art. 151, II RICD), subject to Plenário.
  - "Histórico de Pareceres, Substitutivos e Votos" shows 0; no committee or plenary vote recorded.
  - Latest entries are apensações dated 11–13/11/2026, 26–27/10/2026, 01–02/09/2026 and 17/06/2026.
  - — [Câmara dos Deputados, ficha de tramitação](https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2487262)
- [2nd] Timeline:
  - Approved by the Senate on 2024-12-10 [BG]; returns to the Senate if the Câmara amends it.
  - Special committee installed 2025-05-20.
  - Repeated missed vote targets: December 2025 promise; March 2026 promise of an April vote; a May 2026 committee/plenary plan.
  - The rapporteur said on 2026-08-24 that the vote would wait until after the October elections.
  - A later report says the government wants a vote by December 2026, with no date set.
  - — [Grownt](https://grownt.tech/pl-da-ia-avanca-na-camara-mas-redata-e-impasse-com-o-senado-travam-o-calendario/); [Rádio Corredor](https://radiocorredor.com.br/posts/marco-legal-da-ia-pl-2338-camara); [IBGIA 2026](https://ibgia.org/en/blog/pl-2338-disputa-politica-camara-big-tech-lobby-2026); [Mobile Time, 2025-12-10](https://www.mobiletime.com.br/noticias/10/12/2025/pl-ia-votado-este-ano/); [CGLC, status checked 2026-10-25](https://cglc.com.br/marco-legal-da-ia/)
- [2nd] The rapporteur said he would attach the government's bill creating an AI governance council to form a substitute text. — [Convergência Digital](https://convergenciadigital.com.br/governo/inteligencia-artificial-projeto-do-governo-foi-articulado-com-relator-e-entra-no-pl-2338-23/)

**[ENACTED] LGPD (Lei 13.709/2018)**
- Art. 14 requires children's and adolescents' data to be processed in their "melhor interesse":
  - §1: specific, highlighted consent from at least one parent or guardian for children's data.
  - §2: public information on data types, uses and how to exercise rights.
  - §3: consent-free collection only to contact parents (once, not stored) or for protection; never passed to third parties without consent.
  - §4: no conditioning participation in games, apps or activities on more data than strictly necessary.
  - §5: reasonable efforts to verify consent.
  - §6: simple, accessible language.
  - No 2025–2026 amendments appear on Art. 14.
- Art. 16: delete data after processing ends, with listed exceptions.
- Art. 20: right to review decisions taken solely by automated processing.
- Art. 37: records of processing operations.
- Art. 38: the ANPD may require a RIPD; minimum content is data types, collection/security methodology and mitigation analysis.
- Art. 46: security measures from the design phase.
- — [Planalto, LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [2nd] Enunciado CD/ANPD nº 1/2023 [BG]: children's and adolescents' data may be processed under the legal bases of LGPD Arts. 7 and 11, not only consent, always prevailing the best interest. — [Fattori: IA na escola, LGPD e crianças](https://www.fattori.com.br/artigos/inteligencia-artificial-na-escola-protecao-de-dados-criancas-adolescentes)
- [2nd] Small processing agents and high risk:
  - Res. CD/ANPD nº 2/2022 [BG] (small processing agents) gives simplifications that do not apply to high-risk processing.
  - High risk is a combination of general and specific criteria; data of vulnerable groups such as children and adolescents is used as an example of a specific criterion.
  - The ANPD published a guide on high-risk combinations [BG, 2024].
  - — [Mayer Brown note on the regulation](https://www.mayerbrown.com/-/media/files/perspectives-events/publications/2021/09/legal-update--agentes-de-tratamento-de-pequeno-porte.pdf); [ANPD high-risk guide, post-consultation version (2024)](https://telesintese.com.br/wp-content/uploads/2024/04/20240403-versao-limpa-guia-alto-risco-apos-cp.pdf)

**ANPD agenda 2026–2027**
- ANPD "Mapa de Temas Prioritários 2026–2027" (released 2025-12-23/24; reported 2026-01-05). Six themes: children/adolescents in the digital environment, AI, sensitive/biometric data, minimum security standards, RIPD, data aggregators/legal bases.
  - Children: 15 enforcement actions targeted, focused on protective design and parental supervision; regulation on parental consent, age verification and design practices.
  - AI: 20 enforcement actions targeted; regulation prioritizing LGPD Art. 20 (automated decisions), rights, legal bases and governance.
  - RIPD regulation is also planned.
  - — [Mobile Time, 2026-01-05](https://www.mobiletime.com.br/noticias/05/01/2026/anpd-ia-protecao-crianca/)
- [2nd] One analysis says enforcement under the AI and children axes is concentrated in 2027. — [AI Hub Brasil](https://botaihub.com.br/juridico/anpd-mapa-fiscalizacao-2026-2027-inteligencia-artificial-dados-pessoais/)
- Draft only, not a final rule: an ANPD tomada de subsídios (TS 04/2026) says Art. 11 of Decreto 12.880/2026 sets specific obligations for products or services able to generate content and interact with children and adolescents, and proposes parameters for their protection. — [ANPD TS 04/2026 draft](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/ts-04-2026-minuta_agenda-regulatoria_tomada_de_subsidios.pdf/@@display-file/file)
- [2nd] The Ministry of Justice asked the ANPD to investigate 13 "AI companion" tools accessible to minors (2026). — [Fast Company Brasil](https://fastcompanybrasil.com/ia/governo-investigacao-companheiros-ia-criancas/)
- The CNPD (data protection council) proposed revising the cumulative high-risk criterion and improving the impact report provided for in the ECA Digital. — [CNPD contributions to the ANPD agenda](https://www.gov.br/anpd/pt-br/cnpd/documentos-e-publicacoes/coletanea-de-contribuicoes-do-cnpd-a-agenda-regulatoria-da-anpd.pdf/@@display-file/file)

**[ENACTED] ECA Digital (Lei 15.211/2025)**
- Art. 41-A: "Esta Lei entra em vigor em 17 de março de 2026."
- Art. 1: applies to every IT product or service directed to children or adolescents, or likely to be accessed by them, wherever it is located. "Likely access" means sufficient probability of use and appeal, considerable ease of access, and significant risk to privacy, safety or development.
- Art. 2, I: such products include internet applications and software offered remotely on individual request.
- Art. 7: most protective privacy configuration by default and by design.
- Art. 22 and Art. 26: ban on profiling for targeted commercial advertising and on building behavioural profiles of minors for advertising.
- Art. 16, sole paragraph, II: an impact/monitoring report when processing minors' data beyond what the service strictly needs.
- Arts. 17–18: parental supervision tools.
- Art. 39: obligations scale to product characteristics, control over content, number of users and provider size.
- There is no specific provision on schools or educational services.
- — [Planalto, Lei 15.211/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm)
- [2nd] Enforcement and sanctions (article dated 2026-10-09):
  - Lei 15.352/2026 turned the ANPD into a regulatory agency (Feb 2026) and added Art. 41-A. Decreto 12.880/2026 (March 2026) regulates the law.
  - ANPD phases:
    - Stage I (from March 2026): monitoring app stores and operating systems.
    - Stage II (Aug–Nov 2026): age-assessment guidance and adaptation.
    - Stage III (from January 2027): compliance verification focused on age assessment.
  - Sanctions (art. 35): fines up to 10% of Brazilian revenue, capped at R$50M per infraction, or R$10–1,000 per registered user where there is no revenue. No sanctions announced yet.
  - — [Correio Braziliense, 2026-10-09](https://www.correiobraziliense.com.br/cbradar/lei-15-211-o-eca-digital-preve-multa-de-ate-10-do-faturamento-no-brasil-limitada-a-r-50-milhoes-por-infracao-e-a-anpd-marca-janeiro-de-2027-para-comecar-as-acoes-de-fiscalizacao-com-foco-na-veri/); [Lefosse alert](https://lefosse.com/noticias/alerta/eca-digital-entra-em-vigor-em-17-de-marco-como-se-preparar/)

**[ENACTED] Resolução CNE/CP nº 1, de 11 de novembro de 2026 (AI in education)**
- Builds on Parecer CNE/CP nº 15/2026, approved 2026-09-01; its homologation despacho was published in the DOU on 2026-11-11.
- **Scope (Art. 1):** public and private education systems and institutions at all levels, stages and modalities. Private tutoring is not addressed. Art. 1 §4 distinguishes individual AI use by students and teachers from institution-promoted use.
- **Data protection:**
  - Art. 10 §2: protection of students' image, voice, data and identity.
  - Art. 13: communicate AI use clearly to students, teachers and, where applicable, families.
  - Art. 14: no replacing teachers; human validation of assessment and of decisions affecting student trajectories.
  - Art. 15: no using teacher or student content to train third-party models without specific authorization. The authorization exception does not apply to content produced by children and adolescents.
  - Art. 16: no advertising, market profiling or commercial exploitation of educational data.
- **Art. 40 §1, high-risk uses:**
  - automated correction of objective tests (auxiliary only, with validation);
  - proctoring/monitoring;
  - individual academic profiling;
  - systems for selection, certification, progression or discipline;
  - sensitive data (disability, health, biometrics);
  - behavioural inference or dropout/performance prediction;
  - automated pre-correction of essays (only as preparation for teacher grading).
- **Art. 40 §2, required safeguards:** algorithmic impact assessment, human oversight, traceability, audits, appeal mechanisms, bias monitoring, and a RIPD "quando aplicável". Art. 40 §3 bars fully automated decisions with relevant effects.
- **Art. 41, prohibitions:** social scoring; emotion recognition; exploiting vulnerabilities; psychological, biometric or behavioural profiling for classification or discipline; fully automated decisions on promotion, retention or certification; continuous biometric surveillance; educational data for advertising; discriminatory segregation from automated inferences; grading essays solely by AI; sanctions based solely on AI-detection tools; training third-party models on children's and adolescents' educational data.
- **Age-stage rules:**
  - Early childhood: no AI use by children (Art. 21).
  - Early elementary: no direct access, and no generative/conversational AI even supervised (Art. 22).
  - Final elementary: no autonomous generative use (Art. 23).
- **Other provisions:**
  - Art. 5: AI contracts must ensure governance, audit and accountability of suppliers.
  - Glossary Annex II: if a supplier gives insufficient information to classify an application, it cannot be contracted.
  - Art. 11: permanent teacher training, including data protection and bias identification.
  - Art. 46: 12 months to adapt policies and contracts; Art. 41 prohibitions apply immediately.
  - Art. 47: in force on publication.
- — [CRUB, full text of Res. CNE/CP 1/2026](https://www.crub.org.br/resolucao-cnecp-001-11nov26/); [MEC Normas entry](https://mecnormas.mec.gov.br/pesquisa/detalhar/15979); [APUFSC](https://www.apufsc.org.br/2026/05/12/cne-aprova-diretrizes-para-ia-na-educacao/); [Migalhas](https://www.migalhas.com.br/depeso/466384/cne-aprova-diretrizes-para-utilizacao-da-ia-na-educacao-brasileira)

**EU AI Act (reference only)**
- [2nd] The Digital Omnibus on AI: political agreement on 2026-05-07; a July 2026 note reports final publication in the Official Journal.
  - Annex III stand-alone high-risk obligations (which include education) move from 2 Aug 2026 to **2 Dec 2027**.
  - Annex I embedded systems move to 2 Aug 2028.
  - Generative-AI content-marking duties move to December 2026.
  - — [Orrick, July 2026](https://www.orrick.com/ja-JP/Insights/2026/07/EU-AI-Act-Update-Digital-Omnibus-Finalizes-8-Compliance-Changes); [Pinsent Masons](https://www.pinsentmasons.com/out-law/news/rules-high-risk-ai-delayed-under-eu-omnibus-deal); [Euronews, 2025-11-19 (proposal)](https://www.euronews.com/2025/11/19/european-commission-delays-full-implementation-of-ai-act-to-2027)

**ISO/IEC 42001 and NIST AI RMF**
- [BG, unverified] ISO/IEC 42001:2023 is the certifiable AI management-system standard. — [ISO](https://www.iso.org/standard/81230.html)
- [BG, unverified] The NIST AI RMF 1.0 (Jan 2023) is organized into Govern/Map/Measure/Manage. NIST AI 600-1 (Jul 2024) is its Generative AI profile. — [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)

### Inferences
**Practical checklist for Jair OS (a teacher or tutor processing minors' grades, attendance and progress):**
1. **Role mapping.**
   - For private tutoring, Jair is the **controller**.
   - For work done for a school, the school is likely the controller and Jair/Jair OS acts as **operator**. Get a written data processing agreement or instruction from the school, aligned with the school's own CNE Res. 1/2026 obligations (Art. 5 supplier accountability; the Annex II rule that applications that cannot be classified may not be contracted).
   - Being able to describe each agent's risk class and data flows is now a sales and compliance asset with schools.
2. **Legal basis.**
   - Children under 12: specific parental consent (LGPD Art. 14 §1), or another Art. 7 basis under Enunciado 1/2023 (e.g. contract performance for tutoring), always documenting the best-interest test.
   - Adolescents: Art. 7 bases plus best interest.
   - Never condition the tutoring service on extra data (Art. 14 §4).
3. **Do a RIPD/DPIA now.** Processing children's data with emerging technology (LLMs), plus progress analytics, very likely meets the ANPD high-risk combination. That removes the small-agent simplifications, makes a RIPD prudent, and matches CNE Art. 40 §2 for performance-prediction and academic-profiling features and ECA Digital Art. 16 if processing goes beyond strict need. A 5–8 page RIPD per data flow is proportionate:
   - portal;
   - grading/feedback agents;
   - progress analytics;
   - LLM providers;
   - observability vendor.
4. **Minimization and pseudonymization.**
   - Send pseudonymized records to LLMs and observability tools (section 4).
   - Do not collect health or disability data unless needed; if needed, it becomes a high-risk use under CNE Art. 40 §1 V.
   - Use API settings that exclude training. CNE Art. 15 and Art. 41 XI forbid training third-party models on children's educational data.
5. **Human-in-the-loop on anything evaluative about a student.** Grades, progress judgments, retention/promotion advice and essay scores need teacher validation (CNE Art. 14 §1, Art. 40 §3, Art. 41 V and IX; LGPD Art. 20). Encode this as a contract-level rule ("evaluative_output → requires_human_approval") and as a never-L3 constraint in certification (section 3).
6. **Transparency.**
   - A plain-language notice to students and parents describing which AI tools are used, for what, which data, retention and rights (LGPD Art. 14 §2 and §6; CNE Art. 13).
   - For the portal: privacy-by-default settings and no behavioural profiling or ads (ECA Digital Arts. 7, 22, 26).
   - Supervision features proportionate to size (Art. 39).
7. **Retention (LGPD Art. 16).** Define TTLs per class. Suggested:
   - raw LLM prompts/responses with student data: 30–90 days;
   - pseudonymized traces: 12 months;
   - aggregated, de-identified eval metrics: indefinitely;
   - delete on end of the tutoring relationship.
   Automate this with a Supabase cron and log deletions as evidence.
8. **Records and security.** The execution/span tables can double as the LGPD Art. 37 record of processing, if they record purpose and legal basis per workflow. RLS and least-privilege service keys for the parent/student portal satisfy the Art. 46 "security by design" expectation.
9. **International transfer.** Using US/EU LLM APIs or observability SaaS with personal data is an international transfer. Rely on ANPD's transfer rules (standard contractual clauses) and document it in the RIPD. Pseudonymization reduces, but does not remove, the exposure.
10. **Frameworks.**
    - Do not pursue ISO 42001 certification as a solo operator.
    - Use NIST AI RMF's four functions to structure the existing "AgentOps audit 92/100": Govern = contracts/policies; Map = data flows and risk tiers; Measure = evals/certification; Manage = incidents/watchdog. Cite ISO 42001 Annex A controls only as a checklist.
    - Do not design against PL 2338 drafts until a substitute text is published. The binding instruments for Jair OS today are LGPD, ECA Digital and CNE Res. 1/2026.

### Gaps
- The DOU publication date of Res. CNE/CP 1/2026 itself: secondary sources say 2026-11-12; CRUB shows the homologation despacho dated 2026-11-11.
- Whether MEC issued separate 2026 guidance for teachers beyond the CNE resolution (not found).
- The final text of any ANPD 2026 regulation on AI/generative AI and children; only a draft (TS 04/2026) was found. The exact Art. 11 obligations in Decreto 12.880/2026 were not read.
- ANPD's current RIPD template/regulation status in 2026, and the current text of the international transfer rules, were not re-verified.
- How the PL 2338 Senate text would classify educational uses (not re-checked in this session).
- ISO/NIST items are background, not re-fetched. I did not check whether NIST published AI RMF revisions or agent-specific profiles in 2026.
- The ANPD's Discord "Go Live" suspension (Aug 2026) appeared in only one search result and was not verified.

---

## 6. Cost / FinOps for LLM agents: caching, batch, routing/cascades, semantic caching, budgets, attribution, typical run costs

### Takeaway
For a system with near-zero spend, the free levers dominate:
- prompt caching (reads at about 0.05–0.1× input price; break-even after 2 requests on the 5-minute TTL);
- Batch API at 50% off, stacking with caching, for evals and nightly jobs;
- per-workflow cost attribution from logged usage.

Anthropic's own guidance says to measure "most capable model at lower effort" before building multi-model cascades, because caches are model-scoped. Routing and semantic caching help mainly at volume, and semantic-cache false hits are a correctness risk.

### Cited Findings
- Anthropic first-party prices per million tokens (bundled reference table cached 2026-11-03):

  | Model | Input | Output | Cache reads |
  |---|---|---|---|
  | Claude Haiku 5.5 | $0.10 (≤100K-token prompts; $0.50 beyond) | $0.50 ($2.50 beyond) | n/a |
  | Claude Sonnet 5.5 | $2 | $10 | $0.10 |
  | Claude Opus 5.5 | $4 | $20 | $0.20 |
  | Claude Fable 5.2 | $8 | $40 | $0.20 |

  — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Caching economics:
  - Cache reads cost ~0.1× base input generally, 0.05× on Opus 5.5 and Sonnet 5.5.
  - Cache writes cost 1.25× (5-minute TTL) or 2× (1-hour TTL).
  - Break-even: two requests with the 5-minute TTL; three or more with the 1-hour TTL.
  - Any byte change in the prefix invalidates everything after it, so keep timestamps and IDs out of system prompts.
  - Verify with `usage.cache_read_input_tokens`.
  - — [Anthropic prompt caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- Batch processing:
  - 50% off every token in the request, including cache reads and writes (the discounts stack).
  - Recommended for evaluation runs, backfills and scheduled jobs.
  - Batches are single-shot, with no mid-batch tool loop.
  - — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Anthropic cost guidance (bundled):
  - Before a multi-model cascade, measure the most capable model at lower effort, since caches are model-scoped and a cascade forfeits cache reuse.
  - Judge cost per completed task, not per request.
  - "Re-run failures at higher effort": in Anthropic's coding runs this held the pass rate of all-high effort for a little over half the cost.
  - Per-key and per-workspace usage via the Usage and Cost Analytics API.
  - — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Routing:
  - [BG, 2024] RouteLLM (LMSYS/Berkeley) is an open-source router framework. — [LMSYS blog](https://www.lmsys.org/blog/2024-07-01-routellm); [Berkeley Sky](https://sky.cs.berkeley.edu/project/routellm/)
  - [2nd] Its matrix-factorization router reportedly kept about 95% of GPT-4's MT-Bench score while sending ~14% of queries to the strong model, with reported >85% cost reductions on MT-Bench. Quality dips near the difficulty boundary. — [Maxim article](https://www.getmaxim.ai/articles/model-routing-how-to-cut-llm-token-costs.md)
- Semantic caching:
  - 2026 preprint: blended cost with a semantic-cache hit rate h is (1 − h) × the routed cost, so a 20% hit rate gives a further 1.25× saving. False hits return wrong answers with no escalation, and naive multiplication underestimated residual cost by 34% in one constructed trace. — [arXiv 2611.15911](https://arxiv.org/pdf/2611.15911)
  - Redis recommends a semantic cache in front of the router. — [Redis 2026 router best practices](https://redis.io/blog/llm-router-architecture-best-practices/)

### Inferences
**Illustrative run costs** (computed in this session from the table above; one agent run of 30k input + 3k output tokens):

| Model | Cost per run |
|---|---|
| Haiku 5.5 | ≈ $0.0045 |
| Sonnet 5.5 | ≈ $0.09 (≈ $0.044 with 80% of input cache-read) |
| Opus 5.5 | ≈ $0.18 |

An eval suite of 50 tasks × 5 trials with a judge call of 5k input / 500 output costs about $0.19 on Haiku 5.5, or about $3.75 on Sonnet 5.5 (≈ $1.88 via Batch). Empirical certification is therefore affordable even at zero budget if judges run on the small model, are validated against human labels, and run in batch overnight.

**Recommendations for Jair OS:**
1. **Attribute cost per workflow and agent contract.** Store `usage` (uncached input, cache read, cache write, output tokens) on every span and compute `cost_usd` with a versioned price table in Supabase. Add a monthly per-workflow budget column, with the watchdog alerting on burn rate, not totals.
2. **Make prompts cache-friendly.**
   - Stable system prompt, then tool list, then the agent contract.
   - Volatile data (date, student pseudonyms, task) after the last breakpoint.
   - Check the cache-read ratio in the spans table.
3. **Route evals, backfills, nightly reports and RAG regression to the Batch API.**
4. **Choose models by route, measured with the eval suite.** Small model for classification, extraction and judges; larger model at low/medium effort for content generation; escalate on quality-gate failure (the "re-run failures at higher effort" pattern). This is a cascade driven by Jair OS's existing quality gates rather than a learned router, which is simpler and certifiable.
5. **Use semantic caching only for idempotent, non-personal lookups** (e.g. repeated conceptual physics explanations). Never use it for student-specific answers: a false hit could leak or misattribute student data.
6. **Token budgets.** Set per-run `max_tokens` and per-workflow daily caps, plus task budgets for long agent loops where the model supports them. A single runaway loop is the main cost risk at low volume.

### Gaps
- No 2026 primary source was found for "typical cost per agent run" across the industry. The figures above are computed examples.
- OpenAI/Google 2026 price sheets were not fetched; cross-provider comparisons are not covered.
- RouteLLM figures were not verified against the paper itself (cited via a secondary source).

---

## 7. Self-healing, incident management and SLOs for agent systems: alert-fatigue reduction, agent SLOs, runbooks executed by agents, guarded auto-remediation

### Takeaway
2026 practice is converging on layered SLOs:
- gateway/latency;
- model/tool dependency;
- task-level success, measured on verified outcomes;
- budgets for policy violations and cost.

Alerting is on error-budget **burn rate** rather than static thresholds, and budgets reset when components change. Sources are mostly vendor and practitioner posts (Grafana, Microsoft's open-source agent-governance toolkit, Gravitee); no standard exists. For Jair OS, the ~20 open alerts should be collapsed into a few SLO burn-rate alerts. Auto-remediation should be limited to an allowlisted, reversible runbook set, with human approval for anything external.

### Cited Findings
- [2nd] Grafana Labs published guidance on SLOs for agent behaviour ("What if your agent's hallucinations had a budget?"). InfoQ covered Grafana's agent-SLO work in October 2026. — [Grafana blog](https://grafana.com/blog/what-if-your-agent-s-hallucinations-had-a-budget-how-to-start-using-slos-for-agent-behavior); [InfoQ, 2026-10](https://infoq.com/news/2026/10/grafana-slo-ai-agent)
- [2nd] Microsoft's agent-governance-toolkit includes an "agent-sre" package with SLO and ErrorBudget objects, including examples such as task-success and tool-call-accuracy SLOs. — [Microsoft agent-governance-toolkit: agent-sre](https://microsoft.github.io/agent-governance-toolkit/packages/agent-sre/); [PyPI agent_sre](https://pypi.org/project/agent_sre/)
- [2nd] Practitioner guidance (2026):
  - A model regression can collapse task success while service-level reliability stays at 100%, so measure task outcomes separately from HTTP SLOs.
  - Prefer burn-rate alerting.
  - Use workflow-level budgets, because one failed multi-step task matters more than one failed prompt.
  - Reset task-success budgets and re-baseline after significant component changes.
  - — [Alex Cloudstar, "AI Agent Reliability Engineering in 2026"](https://dev.to/alexcloudstar/ai-agent-reliability-engineering-in-2026-slos-error-budgets-and-failure-modes-that-actually-527m); [DEV: Agent SRE with circuit breakers](https://dev.to/kanishtyagii/agent-sre-slos-error-budgets-and-circuit-breakers-for-ai-agents-1d1d)
- [2nd, vendor content] Layered SLOs (gateway, upstream dependency, task-level completion) and "behavioural/security budgets" limiting the number and severity of policy violations; high task completion does not satisfy governance if costs are uncontrolled. — [Gravitee: AI agent SLO management](https://gravitee.io/corpus/gen-2176/monitoring-and-evaluation/ai-agent-slo-management.html)
- HAL recommends re-evaluating over time to catch silent degradation. — [HAL Reliability Tracker](https://hal.cs.princeton.edu/reliability)

### Inferences
**Recommendations for Jair OS:**
1. **Define SLIs from the spans table.** Error budgets are over a 28-day window; numbers are starting proposals to tune.

   | SLI | Proposed target |
   |---|---|
   | Verified-success rate per workflow (verified = readback confirmed) | 95% (99% for portal reads) |
   | Executions verified within N minutes | 99% |
   | Freshness (no workflow stale beyond its schedule + grace) | 99% |
   | Integrity (no drift between contract hash and deployed version) | 100% |
   | Critical-policy violations | 0 |
   | Cost per workflow | under monthly budget |

2. **Reduce alert fatigue.**
   - Replace per-execution alerts with multi-window burn-rate alerts per SLO: fast burn pages, slow burn goes to a daily digest.
   - Auto-close alerts whose condition self-resolves.
   - Group by root cause (same workflow/model/tool).
   - Make "unverified executions needing readback" a backlog metric with an SLO, not ~20 individual alerts.
3. **Self-healing watchdog with guardrails.**
   - Runbooks are code: each has a precondition query, an idempotent action, a verification query and a rollback.
   - Allowlist of auto-actions: retry with backoff, re-run readback verification, restart a stuck n8n execution, clear a stuck lock, roll back to the last certified contract version, disable a workflow (circuit breaker).
   - Anything with external effect (messages to parents or schools, payments, publishing to Classroom) must never be auto-remediated beyond "pause and notify".
   - Every remediation is itself a traced span and counts against a remediation budget: more than N auto-fixes per day for one workflow escalates to human review and demotes the agent's certification level (section 3).
4. **Postmortems and evals.** Each incident becomes an eval task: the failure transcript goes into the regression suite, following Anthropic's "tasks from real failures".

### Gaps
- No standards-body or peer-reviewed source on agent SLO targets was found; sources are vendor and practitioner material.
- The Grafana and InfoQ articles were not fetched beyond search snippets.
- Specific "agent-executed runbook" products or patterns (e.g. AIOps auto-remediation with LLM agents) were not researched in this session.

---

## 8. Notable 2026 talks, videos and write-ups (with dates)

### Takeaway
The most useful 2026 primary material:
- Anthropic's "Demystifying evals for AI agents" (2026-01-09);
- Hamel Husain's 2026 series (evals FAQ 2026-09-18; critique of Claude's auto-eval tool 2026-09-30; decision models 2026-10-20);
- Eugene Yan's public-evals teardown (2026-11-19);
- the Princeton HAL Reliability Tracker;
- the AI Engineer World's Fair 2026 Evals track (SF, June 29–July 2, 2026), whose talks are being released on YouTube.

### Cited Findings
- Anthropic, "Demystifying evals for AI agents", published 2026-01-09. — [Anthropic Engineering](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Hamel Husain posts (2026):
  - "Evals Skills for Coding Agents" (03-02)
  - "The Revenge of the Data Scientist" (03-26)
  - "'It's Hard to Eval' Is a Product Smell" (06-29)
  - "Do Automated Evals Work?" (07-11, Parlance Labs)
  - "AI Product Engineering Notes" (08-12)
  - "AI Evals: Everything You Need to Know" (09-18)
  - "Claude's new auto eval tool" (09-30)
  - "How To Use Decision Models for Evals" (10-20)
  - — [hamel.dev](https://hamel.dev/); [Claude auto-eval review](https://hamel.dev/blog/posts/claude-auto-evals/); [Evals FAQ](https://hamel.dev/blog/posts/evals-faq/)
- Hamel Husain & Shreya Shankar run the "AI Evals For Engineers & PMs" course (Maven), described in a 2026-11-20 review as the best-known evals course. — [Maven](https://maven.com/parlance-labs/evals); [System Design Academy review](https://systemdesign.academy/ai-evals-course)
- Eugene Yan:
  - "How Public Evals Work and Fail, and What Should Change" (2026-11-19)
  - "Patterns for Building Cybersecurity Evals" (2026-06-21)
  - "How to Work and Compound with AI" (2026-05-03)
  - [BG] "Product Evals in Three Simple Steps" (2025-11-23)
  - — [eugeneyan.com/writing](https://eugeneyan.com/writing/)
- AI Engineer World's Fair 2026, San Francisco: workshops 2026-06-29, expo 06-30 to 07-02.
  - Evals track (rooms listing for 2026-07-01) covering evaluation frameworks, benchmarks and production observability.
  - Talks include Meta's keynote "Production Evals For Agentic AI Systems" (Nishant Gupta), Braintrust and OpenAI talks, an IBM "Evals in AI: A Deep Dive", and a W&B agent-evaluation pipeline walkthrough.
  - Talks are being published online.
  - — [ai.engineer/wf](https://www.ai.engineer/wf); [AIE schedule PDF](https://ai.engineer/worldsfair/schedule.pdf); [Arcade running diary](https://www.arcade.dev/blog/ai-engineer-worlds-fair-2026-running-diary/); [DEV recap](https://dev.to/hanzla/inside-ai-engineer-worlds-fair-2026-what-6000-engineers-showed-up-to-build-fgm)
- Princeton HAL "AI Agent Reliability Tracker" (final version covering post-Jan-2026 models). — [HAL](https://hal.cs.princeton.edu/reliability)
- 2026 arXiv on LLM judges: 2604.23178 (Apr 2026) and 2606.09843 (Jun 2026). — [arXiv 2604.23178](https://arxiv.org/html/2604.23178); [arXiv 2606.09843](https://arxiv.org/pdf/2606.09843)
- Industry consolidation events with dates:
  - ClickHouse acquired Langfuse (2026-01-16). — [Langfuse](https://langfuse.com/blog/joining-clickhouse)
  - OpenAI acquired Promptfoo (2026-03-09). — [OpenAI](https://openai.com/index/openai-to-acquire-promptfoo/)
  - [2nd] Helicone went to Mintlify (2026-03-03). — [HackerNoon](https://hackernoon.com/two-acquisitions-deep-two-still-standing-whats-really-happening-to-open-source-llm-observability)

### Inferences
**Suggested reading/watching order for the Jair OS roadmap P1 (empirical certification + independent evaluation):**
1. Anthropic Jan 2026 (grader taxonomy, pass^k, regression vs capability).
2. Hamel's 2026-09-30 post (concrete anti-patterns to avoid when automating evals with Claude Code).
3. HAL tracker (reliability dimensions to measure beyond success rate).
4. Eugene Yan's 2026-11-19 teardown (how to read benchmark claims critically when choosing models).
5. The Meta "Production Evals for Agentic AI Systems" talk, once on YouTube.

### Gaps
- Exact YouTube URLs and publish dates for the AIE 2026 Evals-track videos were not retrieved.
- No 2026 talk by Shreya Shankar specifically was identified.
- No Brazilian-Portuguese 2026 talks or videos on AgentOps or AI governance in education were researched.
