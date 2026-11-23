# Agent orchestration frameworks, durable-execution engines and workflow-automation platforms (state as of late November 2026) — reliability of long-running, multi-step agent workflows with human approval

Research date: 2026-11-23. Every claim is dated where the source allowed. Items marked **[background]** are pre-2026 facts kept for context. Items marked **[not re-verified]** come from well-known docs that were not re-fetched in this session. Note: the session's web-search budget ran out before full coverage. The topics this left thin are listed under each section's Gaps.

---

## 1. Durable execution engines in 2026 (Temporal, Inngest, Restate, DBOS, Trigger.dev v4, Hatchet, Cloudflare, AWS, Vercel): pricing, self-hosting, Postgres fit, idempotency, retries, signals, timers, sagas

### Takeaway
Durable execution became the default answer for long-running agents in 2026. Its core idea: log every external step and replay after a crash, while an agent can wait days for a human without using compute. For a solo developer on Supabase, **DBOS** fits best, because it stores state as rows in your own Postgres, the library is free, and Conductor costs $99/mo. **Temporal** is the most mature but adds a separate system. **Inngest** and **Trigger.dev** are cheap managed options for TypeScript. None of these engines makes a retried external side effect safe by itself, so idempotency keys and verification remain your job.

### Cited Findings

**Cross-cutting framing (2026)**
- (10 Nov 2026) Martin Fowler's site, article by Kiran Prakash (Thoughtworks): durable execution "helps agents recover from these failures and pursue their goals". The runtime logs each outside-world step and replays the program after a crash, skipping completed steps. Calls to the outside world (LLM, ERP, messaging) must go through steps, and code between steps only touches local state. Replay cost grows with log length, so snapshots or `continue_as_new` are needed for very long workflows — [Martin Fowler / Kiran Prakash](https://martinfowler.com/articles/durable-execution-agents.html)
- (10 Nov 2026) Same article: "What the runtime can't do is make a retry safe." Runtimes retry with backoff, which gives at-least-once semantics, so an idempotency key (e.g. the PO number) must make repeated writes safe. The key "must keep the same on every attempt and replay". Also: plan compensating actions, because "we don't know" can mean the action happened — [Martin Fowler](https://martinfowler.com/articles/durable-execution-agents.html)
- (10 Nov 2026) Same article: waits for human approval are logged, so idle agents don't consume compute. The authors measured wake-up from a wait at under 3 seconds. The article's code uses Temporal (signals, `wait_condition`, `continue_as_new`, `RetryPolicy`) and Cloudflare Workflows (`step.do`, `step.waitForEvent`). It names Restate, Inngest and DBOS as runtimes with equivalent primitives — [Martin Fowler](https://martinfowler.com/articles/durable-execution-agents.html)
- (19 Nov 2026) Temporal blog: durable execution is now embedded in platforms including NVIDIA, Google Cloud, AWS and Cursor. Temporal's survey found the share of respondents using agents daily or more rose from 47.3% to 80.8% in a year (vendor survey) — [Temporal blog](https://temporal.io/blog/temporal-ai-partner-ecosystem)
- Thoughtworks Technology Radar lists "Ignoring durability in agent workflows" as a technique (anti-pattern) entry. The exact radar volume/date was not verified — [Thoughtworks Radar](https://www.thoughtworks.com/en-in/radar/techniques/ignoring-durability-in-agent-workflows)

**Temporal**
- (6 May 2026, Replay 2026) Announcements and status:
  - Serverless Workers: pre-release, starting with AWS Lambda.
  - Standalone Activities: Public Preview in Go, Python and .NET; pre-release in Java and TypeScript.
  - Workflow Streams (streaming LLM token batches): Public Preview.
  - External Payload Storage (S3): Public Preview for Python and Go.
  - Task Queue Priority & Fairness: GA.
  - Nexus: GA for Python.
  - OpenAI Agents SDK integration: GA.
  - Google ADK integration (LLM calls and tool executions run as Activities): status not stated.
  - [Temporal Replay 2026 announcements](https://temporal.io/blog/replay-2026-product-announcements)
- (3 Aug 2026) The Temporal server changelog lists Lambda serverless workers as Public Preview, with pre-release support for Google Cloud Run and AWS Bedrock AgentCore. This supersedes the May "pre-release" label (summarized via search, not fetched) — [Temporal server changelog](https://temporal.io/changelog/product-area/server)
- (Python GA on 23 Mar 2026) The OpenAI Agents SDK integration became GA for Python as package `temporalio-openai-agents` 1.0.0 (Python 3.10+, Temporal Python SDK ≥1.33.0). A later post lists TypeScript (`@temporalio/openai-agents`) as GA too. The agent loop, tool selection and handoffs run inside the Workflow, and model calls run as Activities — [Temporal blog](https://temporal.io/blog/announcing-openai-agents-sdk-integration.md); [Temporal docs](https://docs.temporal.io/develop/python/openai-agents); [Temporal AI framework integrations](https://temporal.io/blog/ai-framework-integrations.md). [background] Public preview had launched on 30 Jul 2025 — [BusinessWire](https://www.businesswire.com/news/home/20250730783559/en/Temporal-and-OpenAI-Launch-Integration-for-Enterprises-Developing-Production-Agents)
- (Pricing page, fetched Nov 2026) Temporal Cloud plans:
  - Pay-as-you-go: $0/mo base with no minimum. Support costs 10% of usage.
  - Business: greater of $500/mo or 10% of usage; includes 2.5M Actions.
  - Actions: $50 per million for the first 5M, falling to $25/M above 100M.
  - Active storage: $0.042/GBh. Retained storage: $0.00105/GBh.
  - New accounts get $150 in credits valid for 90 days (card required). The startup program gives $6,000.
  - The open-source server, SDKs, CLI and UI can be self-hosted free.
  - [Temporal pricing](https://temporal.io/pricing)
- (Temporal docs, fetched Nov 2026) Activity timeouts:
  - Start-To-Close: the per-attempt limit. Always set it, because the server "doesn't detect failures when a Worker loses communication" and relies on this timeout to force retries.
  - Heartbeat Timeout: the maximum gap between heartbeats. A miss fails the attempt and triggers a retry. Heartbeats can carry a progress payload that the next attempt reads to resume.
  - Cancellations only reach Activities that heartbeat.
  - [Temporal docs – detecting activity failures](https://docs.temporal.io/encyclopedia/detecting-activity-failures)

**DBOS (Postgres-native)**
- (2026) DBOS is an open-source durable-execution library with libraries for Python, TypeScript, Go, Java and (from Sep 2026) Rust. Workflows checkpoint to Postgres and resume from the last completed step after restart. App servers talk to Postgres directly, with no central orchestrator server — [DBOS](https://dbos.dev/blog/postgres-is-all-you-need-for-durable-execution); [DBOS May 2026](https://www.dbos.dev/blog/new-in-dbos-may-2026)
- (2026, vendor claims) DBOS milestones:
  - July 2026: DBOSify, a drop-in replacement for Temporal Python that runs on Postgres, plus a Vercel AI SDK integration.
  - August 2026: Go library.
  - Claimed scale: over 1M workflows/s by sharding across Postgres servers (October 2026 post).
  - Workflows can be enqueued and messaged from Postgres UDFs and triggers.
  - [DBOS July 2026](https://dbos.dev/blog/new-in-dbos-july-2026); [DBOS August 2026](https://dbos.dev/blog/new-in-dbos-august-2026); [DBOS – workflows from Postgres UDFs](https://dbos.dev/blog/running-durable-workflows-from-postgres-udfs)
- (Oct 2026) SDK releases: Java SDK v1.2 (1 Oct); TypeScript v5.3, Python v3.3 and Go v1.7 (16 Oct). Source is DBOS X posts indexed by PlushCap. This conflicts with a PyPI mirror showing dbos 3.1.0 dated 24 Sep 2026; both can be true if releases came quickly — [PlushCap DBOS index](https://www.plushcap.com/companies/dbos/xtwitter); [PyPI mirror](https://simple-repository.app.cern.ch/project/dbos)
- (Pricing page, fetched Nov 2026) DBOS plans:
  - Transact library: open source, "free forever".
  - Pro: $99/mo with 1M checkpoints, then $50 per million; 2 seats, 3 apps. Includes the Conductor console, distributed workflow recovery, retention policies, automatic version upgrades and an MCP server.
  - Teams: $499/mo with 10M checkpoints.
  - Self-hosted Conductor: Enterprise only, under a proprietary license key.
  - Every workflow, step, durable sleep, notification and event counts as one checkpoint.
  - [DBOS pricing](https://dbos.dev/pricing); [DBOS self-hosting Conductor](https://docs.dbos.dev/production/hosting-conductor)
- (DBOS docs, fetched Nov 2026) Workflow communication:
  - `DBOS.send/recv(topic, timeout_seconds, suspend=True)`: a workflow can suspend for up to a week waiting for an "approval" message while consuming no resources.
  - Sends from workflows are exactly-once. Sends from ordinary code can pass an `idempotency_key`.
  - `set_event/get_event` publish durable key-value status.
  - Stream writes from workflows are exactly-once, but stream writes from steps are at-least-once.
  - [DBOS docs – workflow communication](https://docs.dbos.dev/python/tutorials/workflow-communication)
- [background, 10 Dec 2024] Supabase blog on DBOS:
  - DBOS stores workflow state in your own Postgres (a separate `*_dbos_sys` database).
  - `@DBOS.Transaction` steps give exactly-once execution for database-transactional steps.
  - An idempotency key becomes the workflow ID, so repeated calls run once.
  - [Supabase blog – Durable workflows in Postgres using DBOS](https://supabase.com/blog/durable-workflows-in-postgres-dbos)
- [background, 28 Apr 2025] DBOS stores checkpoints in two tables, `workflow_status` and `operation_outputs`. Non-deterministic operations must live in steps. Operators can query workflows with SQL and **fork a workflow from a failed step** (`list_workflows`, `list_workflow_steps`, `fork_workflow`) after an outage — [DBOS – Why workflows should be Postgres rows](https://www.dbos.dev/blog/why-workflows-should-be-postgres-rows)
- (Feb 2026) Pydantic AI + DBOS integration: durable execution runs directly under agents with no separate workflow server — [Pydantic](https://pydantic.dev/articles/pydantic-ai-dbos.md)

**Microsoft pg_durable (new, Postgres extension)**
- (9 Jun 2026) Microsoft open-sourced pg_durable under the PostgreSQL License:
  - Durable execution runs inside Postgres via a background worker (duroxide runtime) with a SQL DSL.
  - `df.start()` returns an instance ID. Each step runs in its own transaction and commits progress. Steps are checkpointed, and only a failed step retries.
  - `df.wait_for_signal()` supports human approval and `df.wait_for_schedule()` handles cron timing.
  - It ships in Azure HorizonDB, or can be built for any Postgres 17. **No mention of Supabase** and no production-readiness statement.
  - [Microsoft Tech Community](https://techcommunity.microsoft.com/blog/adforpostgresql/introducing-durable-functions-in-postgresql/4526821)

**Inngest**
- (Pricing page, fetched Nov 2026) Inngest plans:
  - Free: 50k executions/mo, 5 concurrent steps, 24h trace history, 30-day max run length. Execution pauses at the quota.
  - Pro: from $99/mo with 1M executions, 100 concurrent steps, 7-day history, 90-day max run.
  - Business: from $499/mo with 10M executions.
  - Open source and self-hostable on any plan.
  - Conflicts: CostBench reported Pro at $75/mo in June 2026, and the official page's FAQ lists tiered per-execution rates.
  - [Inngest pricing](https://www.inngest.com/pricing); [CostBench](https://www.costbench.com/software/ai-workflow-orchestration/inngest/)
- (10 Feb 2026) Inngest launched Durable Endpoints (public beta), which bring the `step` API into API handlers. Current beta limits: TypeScript and Go SDKs only, Bun and Next.js endpoints only, no POST body, and no concurrency or rate-limit flow control — [Inngest changelog](https://www.inngest.com/changelog/2026-02-10-durable-endpoints); [Inngest docs](https://www.inngest.com/docs/reference/typescript/durable-endpoints)
- (2026) No 2026 AgentKit release announcement was found. Inngest's March 2026 post on durable AI agents leans on plain step primitives rather than AgentKit — [Inngest blog](https://www.inngest.com/blog/2026-03-09-how-to-fix-nextjs-ai-route-failures)

**Trigger.dev v4**
- Trigger.dev v4 is GA. The exact GA date was not verified (Launch Week 2). Waitpoints block runs until a condition is met, for human approval, HTTP callbacks and idempotency. `wait.forToken(token.id)` with a timeout pauses until a token is completed by code, an HTTP call or a Slack button — [Trigger.dev v4 GA](https://trigger.dev/changelog/trigger-v4-ga); [Trigger.dev HITL example](https://trigger.dev/docs/guides/example-projects/human-in-the-loop-workflow)
- (Pricing page, fetched Nov 2026) Trigger.dev plans:
  - Free: $0 with $5 compute credit, 20 concurrent runs, 1-day logs.
  - Hobby: $10/mo with $10 credit, 50 concurrent runs, 7-day logs.
  - Pro: $50/mo, 200+ concurrent runs, 30-day logs.
  - Runs cost $0.000025 each. Compute is per second; Small 1x costs $0.0000338/s.
  - Waits over 5 s and waits for subtasks are checkpointed, are not billed, and don't consume concurrency.
  - Apache 2.0, self-hostable.
  - [Trigger.dev pricing](https://trigger.dev/pricing)

**Hatchet**
- (Pricing page, fetched Nov 2026) Hatchet is "100% open-source and MIT licensed" and runs on Postgres. Pay-as-you-go includes 1M task runs and 1M events free per month, then $30 per million runs. Retries aren't billed but failed runs are. Retention is 7 days. A banner announces "Hatchet v2 & our $5.7M seed round" (date not shown). Its durable tasks are positioned as a drop-in for Temporal or DBOS workflows — [Hatchet pricing](https://hatchet.run/pricing); [pkg.go.dev Hatchet](https://pkg.go.dev/github.com/hatchet-dev/hatchet@v0.102.4)
- [background, 2025] Hatchet v1 rewrote the engine on Postgres. The team said a simple `FOR UPDATE SKIP LOCKED` queue "doesn't cut it at this scale". Docs say it is load-tested to 10k tasks/s but uses more resources than Redis- or RabbitMQ-based systems — [Show HN Hatchet v1](https://hn.svelte.dev/item/43572733)

**Restate**
- (2026 blog index) Restate releases and posts:
  - Feb 13: "A remote control for your agents".
  - Mar 11: "Updating AI Agents safely in production".
  - Apr 2: Pydantic AI durable orchestration, including pausing for human input.
  - Jun 15: "Agent checkpointing is far from production-grade resiliency".
  - Jul 7: Restate 1.7 (end-to-end flow control, new UI, revamped tracing) and Restate BYOC.
  - Oct 15: Restate 1.8 "Mind the Queue".
  - Nov 3: Durable Coroutines for TypeScript.
  - Nov 17: Restate Cloud webhooks to start durable coding agents from GitHub or Linear.
  - [Restate blog](https://restate.dev/blog)
- (30 Sep 2026) Restate raised a $20M Series A led by Singular — [TechCrunch](https://techcrunch.com/2026/09/30/restate-lands-20m-as-the-need-for-durable-infrastructure-increases-with-ai-agents/)

**Cloudflare, AWS, Vercel, Diagrid**
- [background, 7 Apr 2025] Cloudflare Workflows went GA with `step.waitForEvent`, positioned for human approval — [Cloudflare blog](https://blog.cloudflare.com/workflows-ga-production-ready-durable-execution/)
- (2026) The current Agents SDK docs use an `AgentWorkflow` with a `waitForApproval()` helper (example timeout of 7 days) and agent methods to approve or reject. Agent + Workflow is recommended for tasks over 30 s and for human-approval flows. Version note: the helper appears from `agents` 0.33.0 — [Cloudflare HITL guide](https://developers.cloudflare.com/agents/guides/human-in-the-loop); [unpkg agents@0.33.0](https://unpkg.com/agents@0.33.0/docs/human-in-the-loop.md)
- (10 Sep 2026) AWS Lambda durable functions integrated with Pydantic AI. Each model and tool call is a durable step, so an interrupted run doesn't repeat completed calls — [AWS What's New](https://aws.amazon.com/about-aws/whats-new/2026/09/aws-lambda-durable-pydantic-ai/)
- (2026) Bedrock AgentCore Runtime:
  - Consumption billing; I/O wait is not charged for CPU, but memory stays billable.
  - Maximum session is 8 hours (not adjustable), with a 15-minute adjustable idle timeout. The "Instances" compute type allows up to 14 days.
  - Default runtime quotas were raised in July 2026.
  - Some doc mirrors still carry a "preview" banner, so GA status was not confirmed.
  - [AgentCore limits](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/bedrock-agentcore-limits.html); [AgentCore pricing](https://aws.amazon.com/bedrock/agentcore/pricing/); [AWS What's New Jul 2026](https://aws.amazon.com/about-aws/whats-new/2026/07/amazon-bedrock-agentcore-increases-default-runtime-quota-limits)
- Vercel Workflow (WDK): `sleep` pauses without compute, and hooks (`createHook`/`resumeHook`) wait for external events. The latest doc found (1 Dec 2025) still said **Beta**; GA was not confirmed — [Vercel Workflow docs](https://vercel.com/docs/workflow); [Vercel blog](https://vercel.com/blog/introducing-workflow)
- (28 Jul 2026) Diagrid Catalyst 2.0 (Dapr-based) adds failure recovery and cryptographically signed step traces for about 10 agent frameworks (LangGraph, Microsoft Agent Framework, Google ADK, Dapr Agents). Pricing was not disclosed — [SiliconANGLE](https://siliconangle.com/2026/07/28/diagrid-catalyst-2-0-adds-durable-execution-10-agent-frameworks/); [InfoQ](https://infoq.com/news/2026/08/diagrid-catalyst-ai-agents)

### Inferences
- **Fit for a Supabase stack, ranked:**
  1. **DBOS** keeps state as rows next to the business data. One transaction can update both the workflow checkpoint and Jair OS tables, which is the same property the "external result confirmed but receipt missing" problem needs. Workflows can be started from Postgres triggers, and SQL-based fork-from-step recovery maps directly to the P0 "checkpoint recovery" item.
  2. **Hatchet** and **Inngest** (self-hosted) also use Postgres, but in their own schema and server.
  3. **Temporal** keeps its own persistence.
  4. **pg_durable** would be ideal in principle, but it needs extension installation on Postgres 17, which managed Supabase almost certainly doesn't allow (not verified).
- **Cost at low volume (solo use, about 81 workflows):**
  - DBOS Transact: $0, plus $99/mo if you want Conductor.
  - Temporal Cloud pay-as-you-go: no minimum, likely a few dollars a month at hobby volume, plus 10% support.
  - Inngest Free: 50k executions.
  - Trigger.dev Hobby: $10.
  - Hatchet: 1M runs free.
  - All are affordable. The real cost is operational complexity.
- **DBOS caveat:** "distributed workflow recovery" is listed as a Conductor feature. Without Conductor, plan for a single long-lived worker with a fixed executor identity and auto-restart (launchd/systemd/container restart policy), or pay for Pro. This needs verification against the DBOS docs.
- **Edge Functions can't host the engine.** Every option needs a long-lived worker process, or a hosted runner (Trigger.dev, Inngest Cloud, Temporal serverless workers). Supabase Edge Functions can't host the durable runtime, because of the 150 s / 400 s wall clock (see section 2).

### Gaps
- Exact GA dates for Trigger.dev v4 and Hatchet v2, and the current Vercel Workflow status (GA or not) as of Nov 2026, were not confirmed.
- Whether DBOS connects cleanly through Supabase's pooler (session vs transaction mode, LISTEN/NOTIFY use) was not verified. This needs a test.
- No independent benchmarks were found. DBOS' 1M workflows/s and Hatchet's 10k tasks/s are vendor claims.
- Sagas and compensation are documented as a pattern (Fowler; Temporal background), but each engine's built-in support was not compared side by side.

---

## 2. Postgres/Supabase-native options: Supabase Queues (pgmq), pg_cron/Supabase Cron, Edge Function background tasks, pgflow, Graphile Worker, pg-boss; Edge Function limits

### Takeaway
Supabase gives you the building blocks — queues (pgmq), cron, pg_net and short-lived Edge Functions — but not a durable workflow engine. pgmq gives exactly-once delivery *within a visibility window* and has no built-in DLQ or retry limit. Edge Functions hit a 150 s (Free) or 400 s (paid) wall clock that `waitUntil` cannot extend. Use Edge Functions as thin ingress and short steps, and put orchestration state in Postgres via DBOS, pgflow or your own step tables.

### Cited Findings
- (Supabase docs, 2026) Edge Function wall-clock limit is 150 s on Free and 400 s on paid plans. The only way to raise it is to self-host Edge Functions. `EdgeRuntime.waitUntil()` prevents early retirement but does **not** extend the hard wall-clock limit. The CPU budget is separate and can run out first. Long work should be chunked through queues (pg_net, pgmq or webhooks) — [Supabase limits](https://supabase.com/docs/guides/functions/limits); [Supabase background tasks](https://supabase.com/docs/guides/functions/background-tasks); [Supabase KB – wall clock](https://supabase.com/docs/guides/troubleshooting/edge-function-wall-clock-time-limit-reached-Nk38bW); [Supabase KB – CPU limits](https://supabase.com/docs/guides/troubleshooting/edge-function-cpu-limits)
- (GitHub discussion) Calling Edge Functions from pg_cron via pg_net can hit a 5000 ms timeout. Users report this as a common pitfall; check pg_net's `timeout_milliseconds` — [Supabase discussion #37574](https://github.com/orgs/supabase/discussions/37574)
- (Supabase docs) Supabase Queues is built on pgmq:
  - A message is delivered exactly once to a consumer within a customizable visibility window.
  - `pgmq_public.archive` moves messages to an archive table for audit.
  - The `read` `sleep_seconds` argument sets the visibility timeout, and `set_vt` changes it.
  - Unacknowledged messages reappear after the timeout.
  - [Supabase Queues](https://supabase.com/docs/guides/queues); [Supabase PGMQ](https://supabase.com/docs/guides/queues/pgmq); [pgmq GitHub](https://github.com/pgmq/pgmq)
- (Jul 2026, third-party but concrete) Production pattern for pgmq:
  - pgmq has **no built-in DLQ, no retry limit and no failure alerting**.
  - Use `read_ct` as an attempt counter. With a limit of 5, the 6th read diverts the message to a DLQ queue with context, and the original is archived.
  - Set `vt` to the p99 processing time plus a buffer, and extend it per message as a **heartbeat** with `pgmq.set_vt()` for long jobs.
  - Add an idempotency claim table keyed by a key set at send time, not by `msg_id`, because DLQ reprocessing changes the ID.
  - Run a pg_cron health check every 5 min on `pgmq.metrics()`. Alert when DLQ depth > 0 or the oldest message is older than 900 s, via pg_net to a webhook with the URL in Vault.
  - The worker archives only on success, and its `catch` deliberately does nothing.
  - In a test, a poison message reached `read_ct` 14 without any error surfacing.
  - [DEV – Supabase Queues in production](https://dev.to/mwiginton/supabase-queues-in-production-dead-letter-queues-retries-and-poison-messages-with-pgmq-28dp)
- pgflow (Apache 2.0, alpha announced May 2025 [background]):
  - Marketed as "AI workflows in Supabase, no extra infra", with TypeScript DAG workflows on Postgres + Edge Functions.
  - Replaces hand-built pgmq + pg_cron + Edge Function setups. State lives in Postgres tables queryable by SQL.
  - Per-step retries use exponential backoff, and only the failing step retries.
  - The landing page documents **no human-approval or wait primitive and no timeout feature**, and gives no current version or stability status.
  - [pgflow.dev](https://www.pgflow.dev/); [r/Supabase alpha announcement](https://reddit.birdcat.cafe/r/Supabase/comments/1kgaru5/pgflow_alpha_is_live_a_supabaseintegrated)
- Graphile Worker:
  - At-least-once execution ("most jobs running exactly once"), with automatic retries and exponential backoff.
  - "Exceptionally well suited" when jobs are created inside the database (triggers, stored procedures).
  - [Graphile Worker](https://worker.graphile.org/)
- (18 Nov 2026) Encore article: pg-boss and Graphile Worker (Node) implement `SKIP LOCKED` queues with retries, scheduling, unique jobs and LISTEN/NOTIFY, and "have already hit the edge cases". It recommends a Postgres queue (River, pg-boss or Graphile Worker) when jobs must be enqueued atomically with your own writes and volume is modest — [Encore](https://encore.dev/articles/postgres-job-queue-skip-locked)
- (9 Jun 2026) pg_durable (see section 1) is the first Microsoft-backed in-database durable-function engine, but it is not documented for Supabase — [Microsoft](https://techcommunity.microsoft.com/blog/adforpostgresql/introducing-durable-functions-in-postgresql/4526821)

### Inferences
- **"Stale executions without progress" is the classic visibility-timeout or lease problem.** Each claimed job needs a `lease_expires_at`, extended by a heartbeat (pgmq `set_vt` or a `leases` table). A pg_cron sweeper should reclassify expired leases. It must not just re-enqueue them blindly, because the effect may already have happened.
- **Build a DLQ yourself** if you use pgmq directly: an attempt counter on `read_ct`, a DLQ queue, an idempotency claim table, and pg_cron metrics alerts sent to WhatsApp or e-mail.
- **pgflow is good for data/AI pipelines** (RAG ingestion, batch embedding) that run entirely inside Supabase. It is not documented for multi-day approval waits or remote-device steps, so it is insufficient as the only engine for the Jair OS router.
- **Edge Functions should be ingress only:** webhooks (WhatsApp, approvals), enqueue, short read/verify calls. Nothing should run longer than about 60–100 s there.

### Gaps
- No official Supabase doc was found on pgmq DLQ or retry limits. The DLQ pattern above comes from a third party.
- pgflow's current version and status page was not retrieved.
- pg-boss 2026 version and features were not verified.

---

## 3. Agent frameworks in 2026: production-grade vs hype, and multi-agent patterns that work vs fail

### Takeaway
Three things converged in 2026:
1. Frameworks stabilized (LangGraph v1, Microsoft Agent Framework 1.0, Temporal's OpenAI Agents SDK integration GA), and MCP support is near-universal.
2. Durability moved *under* frameworks, through Temporal, DBOS, Restate and AWS integrations, rather than living inside them.
3. Practitioners converged on deterministic software with targeted LLM steps, "single-threaded writes", stateless harnesses over an external event log, and evaluators used only for review.

This validates Jair OS's "single specialist by default" router.

### Cited Findings

**Framework status**
- LangGraph v1:
  - Described as a "stability-focused release" that keeps the graph APIs and execution model unchanged. Durable execution, checkpointing and HITL remain first-class.
  - Durability modes: `exit`, `async` (small risk of losing checkpoints on crash) and `sync` (checkpoint written before the next step).
  - `interrupt()` saves state and "waits indefinitely" until resumed with `Command(resume=...)`. The checkpointer requires a `thread_id`.
  - `createReactAgent` is deprecated in favour of LangChain `createAgent`.
  - [LangGraph v1 release notes](https://docs.langchain.com/oss/javascript/releases/langgraph-v1); [LangGraph durable execution](https://docs.langchain.com/oss/python/langgraph/durable-execution); [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- Microsoft Agent Framework (AutoGen + Semantic Kernel merger):
  - Release candidate on 19 Feb 2026; 1.0 GA for .NET and Python on 3 Apr 2026 (some sources say 2 Apr), with stable APIs and LTS.
  - Covers single agents, middleware, memory, graph workflows and multi-agent orchestration. The predecessors moved to maintenance mode.
  - The Agent Harness and the GitHub Copilot SDK and Claude Agent SDK connectors went stable at Build 2026 (2–3 Jun).
  - [Microsoft devblog](https://devblogs.microsoft.com/agent-framework/microsoft-agent-framework-version-1-0/); [Visual Studio Magazine](https://visualstudiomagazine.com/articles/2026/04/06/microsoft-ships-production-ready-agent-framework-1-0-for-net-and-python.aspx); [Foundry RC](https://devblogs.microsoft.com/foundry/microsoft-agent-framework-reaches-release-candidate/); [InfoQ Aug 2026](https://infoq.com/news/2026/08/agent-framework-harness-ga)
- OpenAI Agents SDK: durable via Temporal (GA, see section 1). A secondary source says it added a native sandbox layer in April 2026 and has session-only state. Google ADK is reported at 1.0 in four languages (secondary). MCP is reported native in OpenAI SDK, ADK, Microsoft's framework, LangGraph, Strands and Mastra, and A2A reached v1.0 (secondary, unverified) — [DEV comparison](https://dev.to/pockit_tools/openai-agents-sdk-vs-google-adk-vs-langgraph-in-2026-the-definitive-framework-showdown-583g); [LangChain frameworks overview](https://www.langchain.com/resources/ai-agent-frameworks)
- Pydantic AI has durable-execution integrations with DBOS (Feb 2026), Restate (2 Apr 2026) and AWS Lambda durable functions (10 Sep 2026) — [Pydantic + DBOS](https://pydantic.dev/articles/pydantic-ai-dbos.md); [Restate + Pydantic AI](https://restate.dev/blog/durable-orchestration-for-ai-agents-with-restate-and-pydantic-ai); [AWS](https://aws.amazon.com/about-aws/whats-new/2026/09/aws-lambda-durable-pydantic-ai/)
- Mastra (1.x line; npm `@mastra/core` 1.50–1.51 seen): workflows have `suspend()` / `resume()` with snapshots persisted to a storage provider that survive restarts. Resume data is schema-validated — [Mastra docs](https://mastra.ai/docs/workflows/suspend-and-resume.md); [@mastra/core 1.51.0 docs](https://cdn.jsdelivr.net/npm/@mastra/core@1.51.0/dist/docs/references/docs-workflows-suspend-and-resume.md)
- Claude Agent SDK (fetched Nov 2026):
  - Claude Code as a library in Python and TypeScript, with built-in tools, hooks, subagents, MCP, **permissions** ("which tools run automatically, which need approval"), and **sessions** (resume or fork).
  - Anthropic also offers **Managed Agents**, a hosted harness with an Anthropic cloud sandbox or a self-hosted sandbox.
  - [Claude Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)

**Practitioner patterns**
- (8 Apr 2026) Anthropic "Scaling Managed Agents: Decoupling the brain from the hands":
  - The session is an append-only event log outside the harness. The harness is stateless: if it crashes, `wake(sessionId)` reads the log and resumes. "The harness also became cattle."
  - Every "hand" (sandbox or tool) sits behind `execute(name, input) → string`. A failed container is returned to Claude as a tool error.
  - Credentials never reach the sandbox: they stay in a vault and a proxy makes the calls.
  - In the coupled design, a harness bug, a dropped event and a dead container "looked identical from outside". Separating them made failures distinguishable.
  - [Anthropic Engineering](https://www.anthropic.com/engineering/managed-agents)
- (Anthropic engineering, dates not confirmed) Long-running-agent harness posts:
  - An initializer agent sets up a progress log for handoffs between sessions.
  - A planner/generator/evaluator setup counters agents over-rating their own work, but the evaluator "is still an LLM that is inclined to be generous".
  - Context resets became "dead weight" with newer models.
  - [Anthropic – effective harnesses](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents); [Anthropic – harness design for long-running apps](https://anthropic.com/engineering/harness-design-long-running-apps)
- (22 Apr 2026) Cognition, "Multi-Agents: What's Actually Working" (Walden Yan), revising "Don't Build Multi-Agents" (Jun 2025):
  - Multi-agent works when extra agents contribute *intelligence* (review, consultation, planning) "while writes stay single-threaded".
  - What works:
    - A code-review loop. Devin Review catches about 2 bugs per PR, ~58% of them severe. It works best when the coding and review agents "do not share any context beforehand".
    - A "smart friend" consult to a stronger model, which only works when the primary model is strong.
    - Manager-to-child delegation, live but immature.
  - What fails: parallel-writer swarms, and unstructured negotiating swarms ("mostly a distraction"). Cognition favours map-reduce-and-manage.
  - [Cognition](https://cognition.com/blog/multi-agents-working)
- [background, 2025; still the main reference in 2026] 12-Factor Agents (HumanLayer, about 23.5k stars, last pushed Sep 2025 per a June 2026 refresh). Most-cited factors:
  - Factor 3: own your context window.
  - Factor 12: make your agent a stateless reducer.
  - Also: unify execution state and business state; launch/pause/resume with simple APIs; contact humans with tool calls; own your control flow; small, focused agents (factor list from the repo [not re-verified]).
  - Thesis: production agents are mostly deterministic software with targeted LLM steps.
  - [GitHub humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents); [Developers Digest Jun 2026](https://www.developersdigest.tech/blog/12-factor-agents-production-principles); [AI Engineer talk](https://ai.engineer/talks/12-factor-agents)
- [background, Dec 2024] Anthropic "Building effective agents":
  - Distinguishes workflows (predefined code paths) from agents.
  - Recommends the simplest pattern that works: prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer.
  - [not re-verified] — [Anthropic](https://www.anthropic.com/research/building-effective-agents)

### Inferences
- **Production-grade for Jair OS** (with durable backing):
  - Claude Agent SDK, or the plain Claude client SDK with a hand-written loop (most aligned with the existing MCP server).
  - Pydantic AI, which has the most durable-execution integrations (DBOS, Temporal, Restate, AWS).
  - LangGraph v1, if a graph or interrupt model is wanted; it has a Postgres checkpointer.
  - Microsoft Agent Framework 1.0, mainly for .NET or Azure shops.
- **Hype risk:** "swarm" or "crew" style autonomous multi-agent frameworks used for *writes*. CrewAI-style role-play crews were not evaluated in this session.
- **Patterns to keep:**
  - Router plus one specialist (already in place).
  - Evaluator/reviewer agents that are read-only and start with a clean context, used as a verification gate. Never let them be the only verification of an external effect; use deterministic readback.
  - Orchestrator-workers only for read or research fan-out.
- **Treat the agent loop as a stateless reducer over an append-only event log in Postgres** (12-Factor #12 plus Managed Agents). This directly gives "stateless execution" and "reducing coupling to runtimes" (P1).

### Gaps
- No 2026 primary sources were gathered on CrewAI, LlamaIndex Workflows, Strands Agents, smolagents or DSPy (search budget exhausted).
- Google ADK and OpenAI Agents SDK 2026 feature claims come from secondary blogs.
- Dates of Anthropic's "effective harnesses" and "harness design" posts were not confirmed.
- The Cognition "Devin Bots" launch (17 Nov 2026) appears only in a secondary source.

---

## 4. Workflow automation platforms in 2026 (n8n v2.x, Zapier, Make, Activepieces, Windmill, Pipedream, Gumloop, Lindy, Relay.app): should n8n stay, be hardened, or be replaced?

### Takeaway
n8n 2.x is mature for connectors and has native human review for AI tool calls (since v2.6). However:
- Queue mode is not the default.
- High availability (multi-main) is self-hosted Enterprise only.
- The community reported reliability regressions in queue mode after the v2 upgrade.

For Jair OS, **keep n8n only as a stateless integration adapter behind the durable control plane.** Harden it if you keep it (Postgres + Redis + 1–2 workers, pinned version), and don't use it as the source of truth for execution state or approvals.

### Cited Findings
- [background, Dec 2025] n8n 2.0: beta on 8 Dec 2025, stable on 15 Dec 2025.
  - Breaking change "Save vs Publish": saving no longer changes the live production version.
  - Task runners run as separate containers in "external mode", which broke some Code-node libraries.
  - Code nodes lose environment-variable access by default, and Execute Command is removed by default (secondary).
  - [n8n blog](https://blog.n8n.io/introducing-n8n-2-0); [n8n v2.0 breaking changes](https://docs.n8n.io/2-0-breaking-changes); [n8n forum](https://community.n8n.io/t/announcing-n8n-version-2-0-coming-soon/226475?page=7&tl=en)
- (n8n docs, fetched Nov 2026) Queue mode:
  - The main instance creates but does not run executions. Redis is the broker, and workers run jobs and write results to Postgres.
  - Optional webhook processors sit behind a load balancer.
  - Default worker concurrency is 10; n8n recommends ≥5 to avoid exhausting DB connections.
  - **Multi-main HA is Enterprise and self-hosted only** (not on n8n Cloud). It requires identical versions on all processes and sticky sessions.
  - Graceful shutdown is 30 s by default. Redis-outage exit threshold is 10 s.
  - SQLite with queue mode is not recommended.
  - The docs reference features requiring n8n ≥2.34.0, which implies the 2.3x line is current as of late 2026.
  - [n8n queue mode docs](https://docs.n8n.io/hosting/scaling/queue-mode/)
- (2026, community) Reported v2 reliability problems:
  - "After Upgrading n8n self-hosted to v2.x, Queue Mode Reliability Much Worse".
  - Workers never picking up jobs from Redis with external task runners (v2.0.0).
  - Simple workflows taking 8–30 minutes in queue mode after upgrading.
  - Each worker needs its own runner port.
  - [n8n forum – reliability](https://community.n8n.io/t/after-upgrading-n8n-self-hosted-to-v2-x-queue-mode-reliability-much-worse/247235?tl=es); [n8n forum – stuck](https://community.n8n.io/t/workflows-get-stuck-indefinitely-v2-0-0-queue-external-task-runners/260734); [n8n forum – slow](https://community.n8n.io/t/simple-workflows-running-for-8-minutes-to-half-an-hour-queue-mode-after-updating-to-v2/284439)
- (2026) n8n "Human-in-the-loop for AI tool calls" (announced as v2.6):
  - A human review step can sit on the connector between an AI Agent and a tool. The reviewer sees the tool name and AI-chosen parameters. Channels include Slack, Telegram, n8n Chat, Gmail and Outlook.
  - A community report on **v2.10.4** says that when approval comes through Gmail/SMTP, the agent never receives the result (open GitHub issues).
  - [n8n docs HITL for tools](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools); [n8n forum – HITL v2.10.4](https://community.n8n.io/t/hitl-on-latest-2-10-4/274050); [n8n forum announcement](https://community.n8n.io/t/new-human-in-the-loop-capabilities-add-fine-grained-control/258423?tl=ar)
- (2026, mostly vendor or secondary comparisons) Windmill is developer-centric (scripts as the unit of work, multi-service self-host). Activepieces is no-code and self-hostable. Licence claims conflict across sources (MIT vs Apache 2.0 for Activepieces; n8n uses the Sustainable Use License) — [Activepieces vs Windmill (vendor)](https://www.activepieces.com/blog/activepieces-vs-windmill-pricing-and-features-2026); [DEV Windmill vs n8n](https://dev.to/selfhostingsh/windmill-vs-n8n-which-automation-platform-to-self-host-55a2)

### Inferences
- **Recommendation: harden and demote n8n, don't replace it yet.**
  1. n8n becomes one "executor" behind a uniform `execute(name, input, idempotency_key)` contract, called by the durable control plane via webhook.
  2. It must return a receipt to Supabase and must stamp the idempotency key into the external artifact.
  3. Success is decided by the control plane's independent readback, not by the n8n execution status.
  4. If kept self-hosted: queue mode with Postgres + Redis + at least one worker, version pinned and only upgraded after testing (given the v2 regressions), and a heartbeat to Supabase. The circuit breaker opens when the host is offline (it is offline today).
- **Don't use n8n's HITL as the approval system of record.** The Gmail/SMTP bug and the per-instance state make it fragile. Approvals should live in Supabase (section 6), and n8n only *delivers* the notification.
- **Gradually move high-risk or long-running workflows** (ERP UI automation, grade or financial writes) to durable code (DBOS or Temporal). n8n stays for low-risk glue such as Google Workspace or social posting.
- **Replacement candidates if n8n is dropped:** Windmill (code-first, self-host, Postgres-based) or Activepieces (MIT/Apache, no-code). Neither solves durability better than a code-level engine.

### Gaps
- Zapier (Agents, MCP), Make (AI Agents), Pipedream, Gumloop, Lindy and Relay.app 2026 features and pricing were **not researched** (search budget exhausted). This needs a follow-up.
- n8n's exact latest version in Nov 2026, the date of HITL v2.6, and whether the v2 queue-mode regressions were fixed were not confirmed.
- n8n Evaluations and MCP Server/Client trigger 2026 status were not verified.
- No Hacker News sentiment was gathered.

---

## 5. Reliability patterns: idempotency keys, outbox, transactional readback/verification, exactly-once vs at-least-once, compensation, circuit breakers, heartbeats/leases, DLQs, deterministic replay, checkpointing, "verify before declaring done"

### Takeaway
Every 2026 source agrees on four points:
1. Durable runtimes give at-least-once execution of steps and exactly-once only for steps inside the same database transaction.
2. External side effects need idempotency keys that survive retries and replays.
3. "Unknown outcome" must be treated as "maybe happened" and resolved by verification or reconciliation, not blind retry.
4. Liveness of remote workers comes from heartbeats extending leases plus timeouts that force retries.

These map one-to-one onto Jair OS's P0 list.

### Cited Findings
- **Exactly-once only inside the DB transaction:**
  - DBOS: steps that perform database operations in the same Postgres as the workflow metadata are exactly-once, because both are updated in one transaction. The workflow ID doubles as the idempotency key — [DBOS](https://dbos.dev/blog/postgres-is-all-you-need-for-durable-execution); [Supabase/DBOS](https://supabase.com/blog/durable-workflows-in-postgres-dbos)
  - DBOS stream writes from steps are at-least-once — [DBOS docs](https://docs.dbos.dev/python/tutorials/workflow-communication)
  - pgmq is exactly-once only within a visibility window — [Supabase Queues](https://supabase.com/docs/guides/queues)
  - Graphile Worker is at-least-once — [Graphile Worker](https://worker.graphile.org/)
- **Idempotency key stable across retries and replay; compensation for "maybe happened":** "the harness must keep the same [key] on every attempt and replay". A `cancel_order` compensating tool handles duplicates discovered later — [Martin Fowler](https://martinfowler.com/articles/durable-execution-agents.html)
- **Idempotency keys must not derive from queue message IDs.** DLQ reprocessing changes `msg_id`, so the key belongs to the business intent set at send time — [DEV pgmq production](https://dev.to/mwiginton/supabase-queues-in-production-dead-letter-queues-retries-and-poison-messages-with-pgmq-28dp)
- **Heartbeats and leases:**
  - Temporal: the server can't detect a worker that lost connectivity, so Start-To-Close must always be set. Heartbeat Timeout fails the attempt when heartbeats stop, and the heartbeat payload carries progress for the retry to resume from — [Temporal docs](https://docs.temporal.io/encyclopedia/detecting-activity-failures)
  - pgmq: `set_vt` acts as a lease heartbeat — [DEV](https://dev.to/mwiginton/supabase-queues-in-production-dead-letter-queues-retries-and-poison-messages-with-pgmq-28dp)
- **Recovery state must live outside the worker.** The core claim of Inngest CTO Dan Farrelly's AIEWF 2026 talk: for a long run to survive losing its worker, memory and local disk can't be the only source of truth — [Inngest event page](https://www.inngest.com/events/your-agent-architecture-half-life); [AI Engineer](https://ai.engineer/talks/your-agent-architecture-has-a-half-life-of-6-months)
- **Stateless harness plus external append-only log** (`wake(sessionId)`) makes harness crashes recoverable and failures distinguishable — [Anthropic Managed Agents](https://www.anthropic.com/engineering/managed-agents)
- **Deterministic replay:**
  - Workflow code must be deterministic, and non-determinism (LLM calls, clocks, I/O) goes in steps — [DBOS](https://www.dbos.dev/blog/why-workflows-should-be-postgres-rows)
  - Running workflows must finish under the rules they started with (Parallel Change and versioning). "We need to know how the runtime behaves before we deploy a change" — [Martin Fowler](https://martinfowler.com/articles/durable-execution-agents.html)
  - Restate wrote about "Updating AI Agents safely in production" (11 Mar 2026) — [Restate blog](https://restate.dev/blog)
- **Checkpoint recovery by forking from the failed step** after an outage, via SQL-driven `fork_workflow` — [DBOS](https://www.dbos.dev/blog/why-workflows-should-be-postgres-rows)
- **DLQ plus alerting:** `read_ct` limit to DLQ, archive on success only, pg_cron metrics alert on DLQ depth or oldest-message age — [DEV](https://dev.to/mwiginton/supabase-queues-in-production-dead-letter-queues-retries-and-poison-messages-with-pgmq-28dp)
- **"Checkpointing is not resiliency".** Restate argued (15 Jun 2026) that agent checkpointing alone is "far from production-grade resiliency" and added flow control in 1.7 (Jul 2026) — [Restate blog](https://restate.dev/blog)
- **Business rules in code, not prompts:** gate tools with deterministic `allowed` checks, give decisions expiry dates, and re-check facts before irreversible actions — [Martin Fowler](https://martinfowler.com/articles/durable-execution-agents.html)
- **Signed or traceable step logs:** Diagrid Catalyst 2.0 signs each step cryptographically and traces it to its source (28 Jul 2026), which is relevant to auditing — [SiliconANGLE](https://siliconangle.com/2026/07/28/diagrid-catalyst-2-0-adds-durable-execution-10-agent-frameworks/)
- [background, not re-verified] Transactional outbox: write the business change and an "outbox" event in one DB transaction, then have a relay publish it — [microservices.io](https://microservices.io/patterns/data/transactional-outbox.html). Circuit breaker (closed/open/half-open) — [Martin Fowler bliki](https://martinfowler.com/bliki/CircuitBreaker.html)

### Inferences (mapped to Jair OS P0 problems)

1. **"External result confirmed but original executor receipt missing; job blocked".** This is a design bug: the receipt is treated as the success criterion. Fix: success = **verified postcondition**, and the receipt is just one form of evidence.
   - Each effect gets an `effect_intent` row: idempotency key, target, expected postcondition, readback method. It is written in the same transaction as the step checkpoint (outbox).
   - The executor stamps the key into the artifact. Examples (API capabilities from general knowledge, not verified in this session): Google Drive `appProperties`, Calendar `extendedProperties.private`, a Gmail custom header, a WhatsApp Cloud API returned message ID and status webhooks, ERP record notes, or a screenshot plus record query for UI automation.
   - When readback finds the artifact by key, mark `VERIFIED_BY_READBACK` and synthesize the receipt from the evidence. **Never block.**
2. **"Unverified, readback required".** Make readback a mandatory durable step with its own retry policy: poll with backoff and a durable timer for up to N minutes. Only then escalate to human ("unknown outcome") with the evidence attached.
3. **Classified retries.** Keep a taxonomy table, and never retry blindly after an ambiguous send:

   | Error class | Action |
   |---|---|
   | `TRANSIENT` (network, 5xx, timeout before send) | Retry with exponential backoff and jitter |
   | `RATE_LIMIT` | Retry after the indicated delay |
   | `AUTH`/`PERMISSION` | No retry; open the breaker and alert |
   | `VALIDATION`/`BUSINESS` | No retry; DLQ plus human |
   | `UNKNOWN_OUTCOME` (timeout *after* send, device lost mid-action) | No retry; go to verify, then reconcile |
   | `DEVICE_OFFLINE` | Park and wait for the breaker to close |

4. **Circuit breakers** per executor (n8n host, Mac agent, Windows agent, local AI worker), per external API (Google, WhatsApp) and per school ERP. Store a `circuit_breakers` row with state, failure_count, opened_at and next_probe_at. The router checks it before dispatch, and a pg_cron half-open probe tests recovery. Open breakers *park* work (state `waiting_executor`) instead of failing it.
5. **Heartbeat loss on devices.**
   - Make desktop agents **pull** work through Supabase RPC: claim with `SKIP LOCKED`, or pgmq `read` with `vt` as the lease. They heartbeat by extending the lease (`set_vt` or a `leases.expires_at` update).
   - Split UI automation into small checkpointed sub-steps, each with a readback (screen or record check).
   - On lease expiry, the watchdog classifies the step: if it was idempotent or read-only, requeue; if it was a non-idempotent submit, run verify and reconcile before any retry.
6. **Checkpoint recovery.** Adopt an engine with step checkpoints (DBOS), or at least an `execution_steps` table with output caching. Operators can then fork or resume from the failed step instead of re-running the whole workflow.

### Gaps
- No 2026-specific write-up was found that implements "receipt-missing reconciliation" for desktop/RPA agents. The design above is inferred from general patterns.
- Specific idempotency behaviours of Google Workspace and WhatsApp APIs were not verified in this session.

---

## 6. Human-in-the-loop patterns: approval inboxes, interrupts, HumanLayer, approvals via chat/WhatsApp/Slack, risk tiers

### Takeaway
Every serious engine now has a durable "wait for external event" primitive with a timeout:

| Engine | Primitive |
|---|---|
| DBOS | `recv(..., suspend=True)` |
| Temporal | signals / `wait_condition` |
| Trigger.dev | `wait.forToken` |
| Cloudflare | `waitForApproval` / `waitForEvent` |
| LangGraph | `interrupt` / `Command(resume)` |
| Mastra | `suspend` / `resume` |
| Vercel | hooks |
| pg_durable | `wait_for_signal` |

The approval *record* and *risk policy* should live in your own database, with chat channels such as WhatsApp used only as transport. HumanLayer, the reference HITL SaaS, was acquired by Factory in Nov 2026 and open-sourced, so don't build on its hosted service.

### Cited Findings
- **DBOS:** an approval workflow can suspend up to 7 days waiting on `recv("approval")` without consuming resources. An endpoint calls `send()` (with an idempotency key from non-workflow code) to deliver the decision — [DBOS docs](https://docs.dbos.dev/python/tutorials/workflow-communication)
- **Trigger.dev:** waitpoint tokens are completed by an HTTP call, from code or by Slack buttons, with a timeout, and the waiting time isn't billed — [Trigger.dev HITL](https://trigger.dev/docs/guides/example-projects/human-in-the-loop-workflow); [Trigger.dev pricing](https://trigger.dev/pricing)
- **Cloudflare:** `waitForApproval()` with a 7-day timeout, plus agent approve and reject methods (agents ≥0.33.0) — [Cloudflare HITL](https://developers.cloudflare.com/agents/guides/human-in-the-loop)
- **LangGraph:** `interrupt()` persists state and waits indefinitely; resume with `Command(resume=...)` — [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- **Mastra:** `suspend()`/`resume()` with schema-validated resume data. Resume can come from HTTP, events, human input or timers — [Mastra](https://mastra.ai/docs/workflows/suspend-and-resume.md)
- **pg_durable:** an invoice approval example uses `df.wait_for_signal('invoice-42')` — [Microsoft](https://techcommunity.microsoft.com/blog/adforpostgresql/introducing-durable-functions-in-postgresql/4526821)
- **n8n:** a per-tool "human review step" between an AI Agent and a tool (Slack, Telegram, Chat, Gmail, Outlook). Reported bug in v2.10.4 with e-mail approvals — [n8n docs](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools); [n8n forum](https://community.n8n.io/t/hitl-on-latest-2-10-4/274050)
- **Claude Agent SDK:** permissions control which tools run automatically and which need approval — [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview)
- **Approval semantics** (10 Nov 2026):
  - Approvals arrive as messages.
  - The tool that acts checks that the action is within the **approved range**. Approve ranges, not single values.
  - Decisions get **expiry dates**.
  - Facts are re-checked before irreversible actions.
  - [Martin Fowler](https://martinfowler.com/articles/durable-execution-agents.html)
- **HumanLayer:**
  - Its core was open-sourced under Apache 2.0 on 23 Oct 2026.
  - Factory announced the acquisition on 4 Nov 2026, with the co-founders joining Factory.
  - The hosted service was reportedly guaranteed for about 30 days. Sources conflict on the shutdown date.
  - [The New Stack](https://thenewstack.io/?p=22842922); [Runtime Wire](https://runtimewire.com/article/factory-acquires-humanlayer-multiplayer-coding-agents); [beri.net](https://www.beri.net/article/factory-humanlayer-acquisition-hosted-platform-30-day-transition-export-self-host-open-source-refunds-coding-agents-customer-continuity)
- [background, 2025] 12-Factor Agents factor 7, "Contact humans with tool calls": human contact is modelled as a structured tool call that pauses the agent — [12-factor-agents](https://github.com/humanlayer/12-factor-agents)

### Inferences
- **Approval inbox in Supabase.** An `approvals` table holds: id, execution_id, step_id, risk_tier, action summary, **approved parameter range**, requested_at, expires_at, channel_message_id, decision, decided_by, decided_at, evidence.
  1. The durable workflow writes the row, then waits on `recv(approval_id)` (DBOS) with timeout = expiry.
  2. A WhatsApp interactive message (buttons) or Telegram/e-mail link carries a signed token.
  3. The webhook Edge Function validates the token and calls `DBOS.send(workflow_id, decision, topic=approval_id, idempotency_key=approval_id)`.
  4. On timeout, the default is **deny or park**, never auto-approve.
- **Risk tiers** (consistent with the existing "risk-based approval"):

  | Tier | Scope | Rule |
  |---|---|---|
  | R0 | Read-only | Auto |
  | R1 | Reversible, internal | Auto + notify |
  | R2 | External or visible to others (post to Classroom, message to students/parents, ERP write) | Explicit approval with an expiry |
  | R3 | Irreversible, financial or grade-related | Approval + re-validation of facts right before execution + mandatory readback + compensation plan recorded |

- **The executing tool re-checks** the approval (range and expiry) deterministically in code, so an LLM can't "talk past" an approval.

### Gaps
- WhatsApp Business interactive-button specifics and 2026 policy changes were not researched here; other notes may cover them.
- No 2026 survey of HITL product alternatives to HumanLayer (e.g. gotoHuman, Humangent) was done.

---

## 7. 2026 talks and videos from practitioners on production agents (AI Engineer World's Fair, Temporal Replay 2026, YouTube), with dates

### Takeaway
The 2026 conference circuit converged on durable runtimes, harness design and HITL. The most directly relevant items are Inngest's AIEWF talk, the Replay 2026 keynote and sessions, Anthropic's Managed Agents engineering post, and Martin Fowler's Nov 2026 article (written, not video).

### Cited Findings
- **AI Engineer World's Fair 2026** (29 Jun – 2 Jul 2026, San Francisco) — [ai.engineer/wf](https://www.ai.engineer/wf):
  - Dan Farrelly (Inngest co-founder and CTO), "Your agent architecture has a half-life of 6 months". Covers durable, resumable execution, HITL, sub-agent orchestration, sandboxing, observability and triage. Recovery state must live outside the worker — [AI Engineer talk page](https://ai.engineer/talks/X1kp-ABIIxQ-your-agent-architecture-has-half-life-6); [Inngest event page](https://www.inngest.com/events/your-agent-architecture-half-life)
  - From a third-party schedule (not verified against the official one): "Harnessing Agents: The Durable Runtime for Dynamic Workflows" (Viren Baraiya, Day 3) and "No Memory, No Harness: Why the Database Is the Last Line of Defense" (Kay Malcolm, Day 4) — [wal.sh schedule notes](https://wal.sh/events/ai-engineer-worldsfair/2026/)
  - Trend recap — [Latent Space AIEWF26 trends](https://latent.space/p/aiewf26trends); running diary — [Arcade.dev](https://www.arcade.dev/blog/ai-engineer-worlds-fair-2026-running-diary/)
- **AI Engineer Europe 2026:** a session titled "Two Roads to Durable Agents: Replay vs. …" (full title not retrieved) — [AI Engineer Europe llms-full](https://ai.engineer/europe/2026/llms-full.txt). Also a HITL secure-AI-workflows talk — [AI Engineer Europe](https://www.ai.engineer/talks/tDArkCqjA-c-building-your-own-secure-ai-workflows-human)
- **Temporal Replay 2026** (May 2026): opening keynote by Samar Abbas (on-demand) — [Temporal](https://temporal.io/resources/on-demand/replay-2026-open-keynote). Session "Durable agents: long-running AI workflows in a flaky world" — [Replay schedule](https://replay.temporal.io/schedule/durable-agents-long-running-ai-workflows-flaky-world). Launch recap — [Temporal community](https://community.temporal.io/t/replay-26-launch-recap-serverless-workers-standalone-activities-task-queue-priority-fairness-and-much-more/19695)
- [background, 2025] Dex Horthy, "12-Factor Agents: Patterns of reliable LLM applications" (AI Engineer 2025; MLOps Community "Agents in Production", 6 Aug 2025) — [AI Engineer](https://ai.engineer/talks/12-factor-agents); [MLOps Community](https://home.mlops.community/public/videos/12-factor-agents-patterns-of-reliable-llm-applications-dexter-horthy-agents-in-production-2025-2025-08-06)
- **Written practitioner pieces (2026):**
  - Martin Fowler / Kiran Prakash, 10 Nov 2026 — [link](https://martinfowler.com/articles/durable-execution-agents.html)
  - Anthropic Managed Agents, 8 Apr 2026 — [link](https://www.anthropic.com/engineering/managed-agents)
  - Cognition, 22 Apr 2026 — [link](https://cognition.com/blog/multi-agents-working)
  - Restate, "Agent checkpointing is far from production-grade resiliency", 15 Jun 2026 — [link](https://restate.dev/blog)

### Inferences
- If you only watch two: the Farrelly AIEWF talk, for the architecture argument, and a Replay 2026 durable-agents session, for the Temporal-style implementation. Then read Fowler's Nov 2026 article for concrete patterns (idempotency, approvals as ranges, compensation, versioning).

### Gaps
- YouTube URLs and exact dates for individual Replay 2026 and AIEWF 2026 recordings were not collected (beyond the talk pages).
- Practitioner YouTube channels were not surveyed.
- The official AIEWF 2026 schedule was not cross-checked.

---

## 8. Recommended architecture for Jair OS (P0 now, P1 next)

### Takeaway
Make **Supabase Postgres the single control plane and source of truth**, and add a **Postgres-native durable-execution layer (DBOS Transact)** run by one or two stateless worker processes. Every external effect goes through an **intent → dispatch → evidence → verify → commit** protocol keyed by a stable idempotency key. Under it sit classified retries, per-executor circuit breakers, pull-based leases with heartbeats for desktop agents, a Supabase approval inbox with WhatsApp as transport, and n8n demoted to a stateless connector executor. Temporal Cloud is the fallback if DBOS proves unsuitable.

### Cited Findings (evidence the design rests on)
- DBOS: Postgres-row workflows, exactly-once transactional steps, idempotency key as workflow ID, `recv(suspend=True)` approvals up to 7 days, fork-from-step recovery, enqueue from Postgres triggers/UDFs. Transact is free; Pro (with Conductor) is $99/mo — [DBOS docs](https://docs.dbos.dev/python/tutorials/workflow-communication); [DBOS rows](https://www.dbos.dev/blog/why-workflows-should-be-postgres-rows); [DBOS UDFs](https://dbos.dev/blog/running-durable-workflows-from-postgres-udfs); [DBOS pricing](https://dbos.dev/pricing)
- Edge Functions: 150/400 s wall clock, and `waitUntil` doesn't extend it — [Supabase](https://supabase.com/docs/guides/functions/limits)
- pgmq lacks DLQ and retry limits; use the `read_ct` + DLQ + `set_vt` heartbeat pattern — [DEV](https://dev.to/mwiginton/supabase-queues-in-production-dead-letter-queues-retries-and-poison-messages-with-pgmq-28dp)
- A stateless harness plus external append-only log, and a uniform `execute(name,input)` hand interface — [Anthropic](https://www.anthropic.com/engineering/managed-agents)
- Writes single-threaded; reviewers with clean context — [Cognition](https://cognition.com/blog/multi-agents-working)
- At-least-once runtimes need stable idempotency keys; plan compensation; approve ranges with expiry — [Fowler](https://martinfowler.com/articles/durable-execution-agents.html)
- Heartbeat and Start-To-Close timeouts for lost workers — [Temporal docs](https://docs.temporal.io/encyclopedia/detecting-activity-failures)
- n8n HA is Enterprise only, and v2 queue-mode regressions were reported — [n8n docs](https://docs.n8n.io/hosting/scaling/queue-mode/); [n8n forum](https://community.n8n.io/t/after-upgrading-n8n-self-hosted-to-v2-x-queue-mode-reliability-much-worse/247235?tl=es)

### Inferences (the proposed architecture)

**A. Layers**
1. **Ingress (Supabase Edge Functions, short):**
   - MCP server endpoints, WhatsApp/Classroom/Google webhooks, approval callbacks, device heartbeat and claim RPCs.
   - Each request only validates input, writes rows, enqueues, and calls `DBOS.send` (or inserts into a table that a trigger or UDF forwards to DBOS).
   - Target under 60 s each.
2. **Control plane (Supabase Postgres):**
   - Existing tables: workflow registry (WF-001…), agent contracts, audit.
   - New tables: `executions` (state machine), `effect_intents` (outbox), `evidence` (receipts and readbacks), `approvals`, `leases`, `circuit_breakers`, `error_classes`, `dlq`.
   - DBOS system tables live in a separate schema or database on the same instance.
3. **Durable runner (DBOS Transact, TypeScript or Python):**
   - A stateless worker process with automatic restart.
   - Start with one always-on instance on a small VM or container. The Mac local worker is acceptable only if it is reliably online; otherwise use a cheap cloud VM.
   - Add a second instance plus DBOS Pro/Conductor ($99/mo) when distributed recovery is needed (P1 horizontal scale).
   - Each Jair OS workflow ID maps to a DBOS workflow function. Each LLM call, executor dispatch, readback and notification is a DBOS step.
   - DBOS queues with concurrency limits per executor or device.
4. **Executors (the "hands"), behind one contract** `execute(capability, input, idempotency_key, deadline) → receipt`:
   - Google Workspace API calls: direct from the runner, preferred over n8n.
   - WhatsApp Cloud API.
   - n8n: queue mode, version pinned, for legacy connectors only.
   - Desktop agents (macOS and Windows/PowerShell over Tailscale) for school-ERP UI automation.
   - The local AI worker.
5. **Agents (the "brain"):**
   - The router plus a single specialist by default, as LLM steps inside workflows.
   - Each agent is a stateless reducer over the execution's event log (12-Factor #12).
   - Reviewer/evaluator agents are read-only, start with a clean context, and are never the sole verifier of an external effect.

**B. Effect protocol (fixes "receipt missing → blocked" and "unverified, readback required")**
1. Step `plan_effect`: in one Postgres transaction, write the `effect_intent` (key = hash of workflow_id + step + business entity, *not* a queue message ID), the expected postcondition and the readback method.
2. Step `dispatch`: call the executor with the key. The executor must stamp the key into the external artifact where possible.
3. Step `collect_evidence`: accept a receipt if one arrives, but don't require it.
4. Step `verify`: run a deterministic readback by key, with backoff and a durable timer, bounded by a deadline.
   - Postcondition met → `VERIFIED` (record whether via `RECEIPT+READBACK` or `READBACK_ONLY`).
   - Not met by the deadline → `UNKNOWN_OUTCOME` → approval-inbox item "please confirm", with evidence attached.
5. Step `commit`: update business tables and audit in the same transaction as the step checkpoint. Only now is the execution "done".
6. Compensation: R2/R3 effects register a compensating action (delete draft, retract post, cancel event) to run if a later step fails or a duplicate is detected.

**C. Retries and circuit breakers (P0)**
- An `error_classes` mapping drives the retry policy (see section 5 table). Ambiguous failures go to verify, never retry.
- Breakers per executor, device, external API and ERP. When open, the router parks work in `waiting_executor` and notifies once. A pg_cron half-open probe tests recovery.

**D. Remote devices (heartbeat loss)**
- Devices pull work: an RPC claims a job with a lease (`expires_at = now() + vt`) and heartbeats extend it.
- The DBOS step waiting for the device uses `recv(topic=job_id, timeout=lease)`. On timeout it checks the lease and device heartbeat:
  - Lease expired and the sub-step was idempotent → re-dispatch.
  - Non-idempotent sub-step → verify first.
- Split ERP UI automation into checkpointed sub-steps (navigate → fill → **pre-submit snapshot** → submit → **post-submit readback**). Resume from the last verified sub-step.

**E. Human approval**
- Use the Supabase `approvals` inbox with risk tiers R0–R3 (section 6). WhatsApp interactive buttons and e-mail are transport only, with signed tokens.
- The workflow waits with `DBOS.recv(..., suspend=True, timeout=expiry)`.
- The tool re-checks the approved range and expiry in code. Timeout defaults to deny or park.

**F. Watchdog and AgentOps (replaces heuristic "stale" detection)**
- pg_cron SQL checks every 5 min:
  - Workflows in PENDING or ERROR beyond SLA (DBOS rows).
  - Expired leases.
  - Device heartbeat older than N.
  - DLQ depth > 0.
  - Open breakers.
  - Count of UNKNOWN_OUTCOME items.
- Alerts go out via pg_net. Self-healing actions are limited to safe ones (requeue idempotent steps, fork from the failed step after the fix). Everything else goes to the inbox.

**G. P1 (scale, statelessness, decoupling, legacy removal)**
- Workers are cattle: any runner instance can resume any workflow (DBOS Conductor or similar).
- Executors behind a capability registry, so a capability can move between n8n, a direct API and a device without changing workflows.
- Version workflow code (Parallel Change) so in-flight executions finish on their original version.
- Retire n8n workflows one by one, starting with high-risk ones, into durable code.

**H. Alternatives if DBOS doesn't fit (decision criteria)**

| Option | When to choose it |
|---|---|
| **Temporal Cloud** (pay-as-you-go, $0 base; OpenAI Agents SDK, ADK, Pydantic AI integrations) | Want the most battle-tested semantics and accept a second state store |
| **Trigger.dev** Hobby $10 / Pro $50 (Apache 2.0) or **Inngest** (Free 50k executions / Pro $99) | Prefer a hosted TS runner with no always-on worker; waits are free and HITL tokens are built in |
| **Hatchet** (MIT, 1M runs free) | Want an open-source Postgres-based engine with a dashboard to self-host |
| **pgflow** | Only for in-Supabase data/AI pipelines (no documented HITL waits) |
| **pg_durable** | Not available on managed Supabase (inferred) |

### Gaps
- No empirical test yet of DBOS against Supabase connection modes, or of how DBOS recovery behaves without Conductor across two executors. Prototype one workflow (e.g. a Classroom post with approval and readback) before committing.
- Cost estimates assume low volume. Measure actual step and checkpoint counts per workflow.
- API-level idempotency and readback capabilities of the specific school ERPs (UI-only) are unknown and may force "human confirm" for some R3 steps.
