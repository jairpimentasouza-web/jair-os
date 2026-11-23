# Agent interoperability protocols and their security model (MCP, A2A, Agent Skills, AGENTS.md, AG-UI/A2UI/MCP Apps): state as of 2026-11-23

Research date: 2026-11-23. Each claim carries its date. "[BG]" marks pre-2026 background. "[2°]" marks a claim that comes only from a secondary or vendor source. I drew most claims from primary sources: modelcontextprotocol.io, the MCP blog, aaif.io, anthropic.com, a2a-protocol.org and genai.owasp.org.

---

## 1. MCP: what is in the latest spec revisions (2025-06-18, 2025-11-25, 2026-07-28) and how governance works

### Takeaway
The current MCP revision is **2026-07-28**. It is a breaking redesign that makes the protocol **stateless**: there is no `initialize` handshake and no `Mcp-Session-Id`. It adds `server/discover`, and it replaces server-to-client requests with Multi Round-Trip Requests (`input_required`). Tasks moved out of core into an official extension. Roots, Sampling, Logging and Dynamic Client Registration are deprecated, with Client ID Metadata Documents preferred over DCR. MCP Apps (interactive UI) and Enterprise-Managed Authorization are now **Stable** official extensions. Governance sits with the Agentic AI Foundation (AAIF) under the Linux Foundation, founded 2025-12-09.

### Cited Findings
**Revision timeline**
- [BG] Revision 2025-06-18 is the predecessor generation. 2025-11-25 introduced URL-mode elicitation (with `elicitationId` and `notifications/elicitation/complete`), experimental Tasks, and Client ID Metadata Documents (CIMD). The 2026-07-28 changelog confirms this when it removes or reworks those features. — [MCP 2026-07-28 changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [BG, 2025-06-18] That revision added structured tool output (`outputSchema`/`structuredContent`) and elicitation. It classified MCP servers as OAuth resource servers and required resource indicators (RFC 8707). — [MCP 2025-06-18 changelog](https://modelcontextprotocol.io/specification/2025-06-18/changelog) (from prior knowledge of the changelog; I did not re-fetch it in this session)
- The 2026-07-28 release candidate was locked on **2026-05-21**, and the final spec shipped on **2026-07-28**. The ten-week window gave Tier 1 SDKs time to ship support. — [MCP blog: 2026-07-28 RC](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- The stated motivation is to let MCP scale on "ordinary HTTP infrastructure", with no sticky routing or shared session stores. Applications that need state mint explicit handles (e.g., `basket_id`) that the model passes back as arguments. — [MCP blog RC](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)

**Major changes in 2026-07-28** (all from the [official changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog))
- Protocol-level sessions and the `Mcp-Session-Id` header are removed. `tools/list` no longer varies per connection, and cross-call state uses server-minted handles passed as tool arguments (SEP-2567).
- The `initialize`/`initialized` handshake is removed. Every request carries `_meta` keys `io.modelcontextprotocol/protocolVersion`, `clientCapabilities` and (SHOULD) `clientInfo`, and results SHOULD carry `serverInfo` (SEP-2575).
- New `server/discover`, which servers MUST implement and clients MAY call (SEP-2575).
- `subscriptions/listen` replaces the HTTP GET stream and `resources/subscribe`. It is a single long-lived POST response stream that clients opt into (`toolsListChanged`, `resourcesListChanged`, etc.).
- `ping`, `logging/setLevel` and `notifications/roots/list_changed` are removed. Log level is now set per request in `_meta`.
- **Tasks moved to the official extension `io.modelcontextprotocol/tasks`** (SEP-2663). Polling uses `tasks/get`, client input uses `tasks/update`, `tasks/list` is removed, and servers can return task handles without the client opting in per request.
- **Multi Round-Trip Requests (MRTR, SEP-2322)** replace server-initiated `roots/list`, `sampling/createMessage` and `elicitation/create`. The server returns `resultType: "input_required"` with `inputRequests`, and the client retries the original request with `inputResponses` and the echoed `requestState`. All results now carry `resultType`.
- SSE resumability (`Last-Event-ID`) is removed. A broken stream loses the request, so the client must re-issue it.
- Minor changes:
  - OpenTelemetry trace context (`traceparent`, `tracestate`, `baggage`) in `_meta` (SEP-414).
  - Servers SHOULD return `tools/list` in **deterministic order** to improve prompt-cache hit rates.
  - Required `Mcp-Method`/`Mcp-Name` HTTP headers that must match the body (SEP-2243).
  - Required `ttlMs`/`cacheScope` on list and read results (SEP-2549).
  - Full JSON Schema 2020-12 in `inputSchema`/`outputSchema` (SEP-2106).
  - The resource-not-found error code changes from -32002 to -32602 (SEP-2164).
  - Error-code allocation policy.
- Authorization hardening:
  - Clients MUST validate `iss` per RFC 9207 (SEP-2468).
  - DCR clients must send `application_type` (SEP-837).
  - Credentials are bound to their issuer and must be re-registered if the authorization server changes (SEP-2352).
  - The blog adds clarifications on refresh tokens (SEP-2207), step-up scope accumulation (SEP-2350) and the `.well-known` suffix (SEP-2351). — [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog); [RC blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- **Deprecated** (minimum 12-month window under the new feature-lifecycle policy, SEP-2596):
  - Roots, Sampling and Logging (SEP-2577). Migrate to tool params or config, to direct LLM API calls, and to stderr or OpenTelemetry respectively.
  - The HTTP+SSE transport.
  - `includeContext` values `thisServer`/`allServers`.
  - **OAuth Dynamic Client Registration, deprecated in favour of Client ID Metadata Documents** (PR #2858). — [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- Process changes: Standards Track SEPs need a conformance-suite scenario before they can reach Final (SEP-2484). — [RC blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [2°] A post-release draft updates the CIMD reference to draft-ietf-oauth-client-id-metadata-document-03 and restores `_meta` fields that were unintentionally dropped. — [nhimg MCP spec tracker](https://nhimg.org/mcp-spec-version-tracker)

**Extensions framework and official extensions** (as of 2026-11)
- Extensions use reverse-DNS IDs (`io.modelcontextprotocol/...`), are negotiated via `extensions` in capabilities and `server/discover`, and are **disabled by default with explicit opt-in**. Stages are Experimental → Beta → Stable, or promotion to Core (SEP-2133, SEP-3392). — [MCP Extensions overview](https://modelcontextprotocol.io/docs/extensions/overview)
- Stage of each official extension, from the same [Extensions overview](https://modelcontextprotocol.io/docs/extensions/overview):
  - **Stable:** OAuth Client Credentials (machine-to-machine), **Enterprise-Managed Authorization**, and **MCP Apps**.
  - **Beta, headed to Core:** **Tasks**.
  - **Beta, destination not yet stated:** **Skills over MCP**, **Server Cards** (pre-connection metadata discovery, SEP-2127) and **Events** (upstream event subscriptions via poll, push or webhook).
  - **Experimental:** interceptors, variants, tool annotations (action metadata and trust), file uploads and filesystems.
- MCP Apps (SEP-1865) lets servers ship sandboxed HTML UIs as declared UI templates that hosts can prefetch and review. — [RC blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)

**Roadmap** (last updated 2026-08-22; "current thinking rather than firm commitments") — [MCP roadmap](https://modelcontextprotocol.io/development/roadmap.md)
1. Agentic messaging primitives: server-initiated events including webhooks, composition of Tasks, Triggers and subscriptions, and Tasks toward Core.
2. HTTP-native transport unification: "HTTP over stdio" (HTTP/2 over stdin/stdout) as the single binding, plus ETag caching including for tool calls.
3. **Agent identity and enterprise security**:
   - DPoP.
   - Workload Identity Federation (SEP-1933).
   - ID-JAG (Identity Assertion JWT Authorization Grant) as used by Enterprise-Managed Authorization.
   - RFC 8693 token exchange, coordinated with the IETF OAuth and WIMSE working groups.
   - Under discussion: human-presence attestation to distinguish interactive clients from headless agents.
   - Problem statement quote: "MCP authorization assumes a person with a browser at consent time... Existing MCP servers lean on pasted API keys and long-lived refresh tokens."
4. Improved primitives: a redesign of the `tools/call` result shape (the dual `content` + `structuredContent` "has confused server and client authors"), **progressive discovery** (an experimental server-side discovery mechanism), and possible deprecation of the little-used content annotations.
5. SDK developer experience: an extension contract, and SDKs generated from the spec plus the conformance suite.

**Governance**
- On 2025-12-09 the Linux Foundation formed the **Agentic AI Foundation (AAIF)**, anchored by MCP, goose and AGENTS.md. — [LF press release](https://linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- AAIF had 247 members by August 2026 — [LF press, Aug 2026](https://www.linuxfoundation.org/press/agentic-ai-foundation-welcomes-57-new-members-gaining-major-financial-services-players-and-apac-leaders) — and announced it had passed 300 members on 2026-10-22 — [LF press](https://www.linuxfoundation.org/press/agentic-ai-foundation-surpasses-300-members-in-less-than-one-year).
- AAIF projects as of 2026-08-17 are MCP, AGENTS.md, goose, agentgateway (traffic mediation) and A2A (joining). Agent Skills joined on 2026-10-22 (see §5). — [AAIF blog: A2A joins AAIF](https://aaif.io/blog/a2a-joins-aaif)

### Inferences
- The 2026-07-28 stateless model suits a **Supabase Edge Functions**-hosted MCP server, because edge functions are stateless per invocation. The old session model was the awkward fit. The "server-minted handle" guidance matches the pattern jos-claude already uses (desktop job → result lookup by ID).
- Breaking changes that affect a hand-rolled server:
  - implement `server/discover`;
  - read version and capabilities from `_meta` on every request;
  - validate the `Mcp-Method`/`Mcp-Name` headers;
  - return `resultType`, `ttlMs` and `cacheScope`;
  - return tools in deterministic order;
  - move off the -32002 error code;
  - replace any server-initiated elicitation with MRTR.
- Elicitation is not deprecated; it is now delivered through MRTR `input_required`. That gives a protocol-native way to request human approval mid-tool-call, *if the host supports it*.
- Sampling is deprecated. Any plan to have jos-claude "borrow" Claude's LLM via sampling should be dropped; the server should call its own LLM API (e.g., the local Mac worker or a provider API) directly.

### Gaps
- I did not verify which spec revision Claude.ai's custom-connector client currently negotiates (2025-11-25 or 2026-07-28), or whether it implements MRTR `input_required`, Tasks or Skills-over-MCP. Check the [client matrix](https://modelcontextprotocol.io/extensions/client-matrix.md) before migrating.
- I did not fetch the 2025-06-18 and 2025-11-25 changelogs in this session. The details above come from the 2026 changelog's references plus background knowledge.
- I found no evidence of a further numbered MCP revision after 2026-07-28 as of 2026-11-23; only a draft exists.

---

## 2. Best-practice MCP server design in 2026 (tool count, descriptions, code execution, progressive disclosure, tool search)

### Takeaway
The 2026 consensus is to keep tool catalogs small and well described, then let the client or host do progressive discovery (tool search) and programmatic or code-execution tool calling once definitions consume a significant share of context. The spec has no standard `tools/search` method yet; progressive discovery is a roadmap item as of 2026-08-22. Cacheable, deterministic tool lists and clear structured output are now spec-level expectations.

### Cited Findings
- The official MCP client best-practices doc (2026-07-28 docs) describes two complementary patterns. **Progressive discovery** controls *when* tool definitions enter context; **programmatic tool calling** controls *how* tools are invoked. Clients should switch to progressive discovery once definitions fill a significant share of the context window, and should re-index their search catalog on `tools/list_changed`. — [MCP Client Best Practices](https://modelcontextprotocol.io/docs/2026-07-28/develop/clients/client-best-practices)
- No standard `tools/search` method exists in the spec. Progressive discovery is currently a host, client or gateway concern, and the 2026-08-22 roadmap starts work on an "experimental server-side discovery mechanism". — [MCP roadmap](https://modelcontextprotocol.io/development/roadmap.md); [GitHub issue discussion](https://github.com/FullFran/training-mcp/issues/28) [2°]
- [BG, 2025-11] Anthropic's "Code execution with MCP" (2025-11-04) describes exposing MCP tools as a code API or filesystem that the agent explores and calls from code. Intermediate data stays in the sandbox instead of passing through context, and the post reports a reduction from ~150k to ~2k tokens in its example. — [Anthropic Engineering](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [BG, 2025-09] Cloudflare's "Code Mode" turns MCP tools into a TypeScript API that the model writes code against. — [Cloudflare blog](https://blog.cloudflare.com/code-mode/)
- [BG, 2025-11] Anthropic's Tool Search Tool and Programmatic Tool Calling ("advanced tool use") came with vendor-reported token savings (~85% for tool search). — [Anthropic Engineering: advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use). The savings figures are vendor-reported and also repeated in [mcp.directory](https://mcp.directory/blog/mcp-context-bloat-fix-2026-tool-search-code-mode-progressive-disclosure) [2°].
- [2°] Practitioner guidance:
  - The "meta-tool" pattern pairs a discovery tool with an execute tool; the discovery tool's description serves as a menu. — [Synaptic Labs](https://blog.synapticlabs.ai/bounded-context-packs-meta-tool-pattern)
  - With large catalogs (~90 tools), agent tool selection degrades. — [Stride Techworks](https://www.stridetechworks.com/blog/mcp-tool-sprawl-progressive-discovery)
  - Weak search embeddings mean tools are never found, so do not hide tools permanently. — [mcp.directory](https://mcp.directory/blog/mcp-context-bloat-fix-2026-tool-search-code-mode-progressive-disclosure)
- Spec-level design expectations in 2026-07-28 — [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog):
  - deterministic `tools/list` order to improve prompt-cache hits;
  - `ttlMs`/`cacheScope` on lists;
  - full JSON Schema 2020-12 for input and output schemas, with servers told not to auto-dereference external `$ref` and to bound schema depth and validation time ([RC blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/));
  - OpenTelemetry trace propagation in `_meta`.
- The roadmap acknowledges that returning both `content` and `structuredContent` "has confused server and client authors" and that `tools/call` will be redesigned. — [MCP roadmap](https://modelcontextprotocol.io/development/roadmap.md)
- Supporting evidence from a large real server: the Adspirer ads connector in this same environment instructs clients to call `search_tools` and then `get_tool_schema` before invoking routers. This is the meta-tool and progressive-discovery pattern in production (observed in this session's connector instructions, 2026-11-23).

### Inferences
- jos-claude has about 25 tools: context, routing, execute, memory and knowledge search, tasks, desktop, Classroom and others. That is within a manageable range for one server; the problem grows with 81 workflows and 72 agent contracts. The right move is not one MCP tool per workflow. Instead:
  - keep ~15–25 stable "verb" tools (`executar`, `rotear`, `buscar_*`, `criar_tarefa`, `desktop`, etc.);
  - expose the catalog through discovery tools (`listar_workflows`, `buscar_agentes`, which already exist) and/or Skills-over-MCP (§5);
  - let the host's tool search handle the rest.
- Tool descriptions should:
  - say exactly when to use the tool and when not to;
  - give IDs and handles as typed parameters;
  - declare risk, i.e., whether it is read-only, sends externally, or touches students;
  - return `structuredContent` with an `outputSchema` plus a short text summary, so non-UI clients still work.
- Return `ttlMs` on `tools/list` and order tools deterministically. Both are cheap and improve cache hits in Claude.
- Propagate `traceparent` from `_meta` into Supabase logs, n8n and desktop jobs. That gives end-to-end tracing for the P0 reliability goal and for the audit and self-healing loop.

### Gaps
- I found no independent (non-vendor) benchmark establishing an optimal tool count. Figures such as "85%" or "99.9%" savings are vendor-reported.
- I did not verify current Claude.ai behaviour for automatic tool search over custom connectors.

---

## 3. MCP hosting, gateways, registry, inspectors and testing

### Takeaway
Remote Streamable-HTTP servers on edge runtimes (Cloudflare Workers, Supabase Edge Functions) are mainstream. Supabase documents OAuth protected-resource discovery and a JWT/RLS gate for MCP servers on Edge Functions. Gateways (Docker MCP Gateway, Kong, Cloudflare MCP server portals, agentgateway, plus many vendors) add policy, audit and isolation. The official MCP Registry still appeared to be in **preview** in my searches; its API froze at v0.1 on 2025-10-24. It verifies namespaces only, not code safety.

### Cited Findings
- Supabase's "Deploy MCP servers" guide covers building remote MCP servers on Edge Functions with any Edge-Runtime-compatible framework, e.g., mcp-lite. — [Supabase docs](https://supabase.com/docs/guides/ai-tools/byo-mcp); [mcp-lite example](https://supabase.com/docs/guides/functions/examples/mcp-server-mcp-lite)
- Supabase's newer pattern wraps the handler with OAuth protected-resource discovery and a user-auth gate. The gate verifies the JWT and gives the handler a client scoped to the user's RLS. — [Supabase UI docs: MCP](https://supabase.com/ui/docs/headless/mcp)
- In that pattern the built-in JWT check is typically disabled so unauthenticated discovery requests (`.well-known`) can reach the function, with auth enforced in middleware. — [Supabase blog: give your app its own MCP server](https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server.md)
- An older Supabase page says MCP auth is not yet supported on Edge Functions. It conflicts with the newer pages and is likely outdated. — [Supabase docs (older)](https://supabase.com/docs/guides/getting-started/byom)
- The `@supabase/server` package handles header-based auth for Edge Functions. — [Supabase blog](https://supabase.com/blog/introducing-supabase-server)
- The official MCP Registry docs describe it as "currently in preview", with possible breaking changes or data resets before GA. The REST API froze at v0.1 on 2025-10-24. Namespaces are verified through GitHub OAuth/OIDC (`io.github.<user>`) or DNS/HTTP challenges (`com.example`). — [MCP Registry about](https://modelcontextprotocol.io/registry/about); [Registry preview launch, 2025-09-08](https://blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview/)
- The registry relies on "the broader ecosystem for security scanning of actual server code". — [MCP Registry about](https://modelcontextprotocol.io/registry/about)
- [2°] UpGuard (May 2026) found uneven moderation across registries. For example, Smithery.ai was community-submitted and 92% unverified. — [UpGuard: MCP server lookalikes](https://upguard.com/blog/mcp-server-lookalikes)
- Gateways [2°, mostly vendor comparison articles]:
  - Kong added MCP in Gateway 3.12 (October 2025) via the AI MCP Proxy and OAuth2 plugins; enterprise and paid.
  - Cloudflare MCP server portals in Zero Trust reportedly reached GA on 2026-09-24; remote HTTP only, with access via Cloudflare Access.
  - Docker MCP Gateway (open source) runs servers in isolated containers and is suited to dev and staging.
  - agentgateway (Linux Foundation, Apache-2.0, now an AAIF project) mediates both MCP and A2A traffic.
  - Sources: [Maxim comparison](https://www.getmaxim.ai/articles/mcp-gateway-comparison-2026-bifrost-docker-microsoft-kong-cloudflare.md); [WorkOS gateways compared](https://workos.com/blog/mcp-gateways-compared); [AAIF: agentgateway listed](https://aaif.io/blog/a2a-joins-aaif)
- Server Cards (Beta extension, SEP-2127) let clients discover a server's metadata over HTTP before connecting. — [Extensions overview](https://modelcontextprotocol.io/docs/extensions/overview)
- Testing and conformance:
  - The MCP project maintains a conformance test suite, which Standards Track SEPs now require (SEP-2484). — [RC blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/); [MCP roadmap](https://modelcontextprotocol.io/development/roadmap.md)
  - MCP Inspector is the official debugging tool. It had an unauthenticated RCE (CVE-2025-49596, June 2025), so only patched versions should be run. — [AuthZed timeline](https://authzed.com/blog/timeline-mcp-breaches)
  - MCPJam appears as a host or test client in the MCP Apps support matrix [2°]. — [MCP Apps search summary / ext-apps](https://apps.extensions.modelcontextprotocol.io/api/)

### Inferences
- For Jair OS, **staying on Supabase Edge Functions** is defensible and aligns with the stateless spec. Add:
  - RFC 9728 protected-resource metadata;
  - OAuth 2.1 with CIMD-aware authorization;
  - `iss` validation;
  - per-request JWT verification;
  - RLS-scoped DB clients rather than the service role inside tool handlers.
- A full gateway (Kong, Cloudflare portal) is overkill for a single owner. Two cheaper alternatives cover most of the benefit:
  - (a) implement policy, audit and rate limiting inside the jos-claude edge function;
  - (b) if more third-party MCP servers are added (Gmail, Drive, Supabase, GitHub are already connected to Claude), consider Docker MCP Gateway locally on the Mac for desktop-side servers, to get container isolation.
- Do not publish jos-claude to the public MCP Registry. It is a private, single-tenant server holding minors' data. A Server Card is optional.
- For P1 "empirical agent certification", run the MCP conformance suite against jos-claude in CI, plus scripted MCP Inspector sessions on a patched version, as a cheap first gate.

### Gaps
- I could not confirm whether the MCP Registry reached GA between October 2025 and November 2026. The docs I found still say preview, and the GA date is unknown.
- I did not independently verify the Cloudflare portals GA date of 2026-09-24 (it appears in one comparison article only).
- I did not research Microsoft's MCP gateway or Azure API Management MCP specifics.

---

## 4. A2A: current version, adoption, governance, relation to MCP, and whether a single-owner system needs it

### Takeaway
The current A2A release is **v1.0.0**, the first stable version, released in March 2026. It added multi-protocol bindings (JSON-RPC, gRPC, HTTP+JSON), version negotiation, multi-tenancy and **signed Agent Cards**. IBM's ACP merged into A2A in August 2025. More than 150 organizations back it, and it moved under the Agentic AI Foundation in August 2026. A2A is for crossing trust and vendor boundaries between independent agents. In a single-owner system where one orchestrator controls every agent, it adds overhead with little benefit today.

### Cited Findings
- A2A v1.0 shipped in March 2026 as the "first stable specification". It added multi-protocol bindings and version negotiation, multi-tenancy, and signed agent cards for cryptographic identity verification. — [AAIF blog: A2A joins AAIF](https://aaif.io/blog/a2a-joins-aaif); [Google Open Source Blog, Apr 2026](https://opensource.googleblog.com/2026/04/a-year-of-open-collaboration-celebrating-the-anniversary-of-a2a.html)
- The a2a-protocol.org "latest" spec is **1.0.0**, with previous versions 0.3.0, 0.2.6 and 0.1.0. — [A2A specification](https://a2a-protocol.org/latest/specification/)
- Core concepts in the A2A spec — [A2A specification](https://a2a-protocol.org/latest/specification/):
  - **Agent Card**: JSON with identity, capabilities, skills, endpoint and auth.
  - **Task**: states submitted, working, completed, failed, canceled, input-required, auth-required and rejected.
  - **Message**, **Part**, **Artifact** and **Context**.
  - Three normative bindings (JSON-RPC, gRPC, HTTP+JSON/REST), with `a2a.proto` as the normative data model.
  - Push notifications via webhook POST.
  - Security schemes: API key, HTTP, OAuth 2.0 (including client credentials and device code), OIDC and mTLS.
  - An extended Agent Card behind authentication.
- Launch history: Google launched A2A in April 2025, donated it to the Linux Foundation in June 2025, and IBM's **Agent Communication Protocol (ACP) merged into A2A in August 2025**. — [AAIF blog](https://aaif.io/blog/a2a-joins-aaif); [LF launch press](https://linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents)
- Adoption:
  - More than 150 organizations at the one-year mark (April 2026). — [LF press](https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year)
  - Named deployments include Huawei Celia (HarmonyOS), Tencent WeChat, Google Cloud, Azure AI Foundry and AWS Bedrock AgentCore. — [AAIF blog](https://aaif.io/blog/a2a-joins-aaif)
- Governance: A2A became an AAIF-hosted project, announced 2026-08-17 by [Axios](https://axios.com/2026/08/17/a2a-agentic-ai-foundation-open-ai-standards) and the [AAIF blog](https://aaif.io/blog/a2a-joins-aaif). The a2a-protocol.org site links an announcement dated 2026/08/27, a minor date conflict. — [A2A spec page](https://a2a-protocol.org/latest/specification/)
- Relation to MCP: the two sit at different layers. MCP covers agent-to-tool, data and service connectivity; A2A covers how independent agents discover each other, communicate, delegate tasks and exchange results. — [AAIF blog](https://aaif.io/blog/a2a-joins-aaif)
- [2°] Reference stacks put MCP at the backend tool layer and A2A between agents. agentgateway proxies both. — [Oracle developers blog](https://blogs.oracle.com/developers/develop-a2ui-and-mcp-apps-with-oracle-ai-database-and-the-java-mcp-toolkit-running-in-google-gemini-enterprise-app-chatgpt-and-claude); [Maxim](https://www.getmaxim.ai/articles/mcp-gateway-comparison-2026-bifrost-docker-microsoft-kong-cloudflare.md)

### Inferences
- **Recommendation: do not adopt A2A as an internal bus in 2026.** The 72 agent contracts and the macOS/Windows desktop agents all live in one trust domain under one owner and one orchestrator (Supabase). Internal job queues and contracts are simpler, cheaper and easier to audit.
- **Borrow A2A's design ideas instead.** Its task state machine (submitted/working/input-required/auth-required/completed/failed/canceled/rejected) is a good normalized lifecycle for Jair OS executions and desktop jobs. Its Agent Card schema (identity, skills, auth, endpoint) is a good template for the 72 agent contracts. Signed Agent Cards are a useful model for certifying agent versions under P1.
- Revisit A2A only if Jair OS must interoperate with *external* agents, such as a school's or platform's agent, a partner consultant's agent, or Gemini Enterprise and Copilot agents. In that case, expose one A2A façade agent with a signed card, not every internal agent.

### Gaps
- I did not find A2A v1.x point releases after 1.0.0, or adoption numbers for late 2026.
- I did not read Appendix B of the A2A spec ("Relationship to MCP"), which was beyond the fetched portion.

---

## 5. Agent Skills (SKILL.md), AGENTS.md, Claude plugins and OpenAI Apps SDK: packaging procedural knowledge, and how to package 81 workflows and 72 agent contracts

### Takeaway
**Agent Skills** (a folder with `SKILL.md` plus scripts and references, loaded by progressive disclosure) is the de facto cross-vendor format for procedural knowledge. Anthropic published it in December 2025 and donated it to AAIF on 2026-10-22, reporting more than 70 platforms, ~1M skills published and ~280M installs. The official MCP **Skills extension** (`io.modelcontextprotocol/skills`, SEP-2640 Final, Beta stage) lets an MCP server serve skills with SHA-256 manifests and approval binding. AGENTS.md (OpenAI, August 2025, an AAIF founding project) covers repo-level instructions for coding agents. MCP Apps absorbed the OpenAI Apps SDK and MCP-UI work.

### Cited Findings
- Anthropic donated Agent Skills to AAIF on **2026-10-22**: the name, logo, GitHub org and the agentskills.io domain. The page reports **70+ agent platforms**, **~1M skills published** and **~280M installs**, and names ChatGPT, Cursor, GitHub Copilot and VS Code, with community loaders for Codex, Cursor and OpenCode. A skill is "a folder built around a SKILL.md file" plus optional scripts and references. Lead maintainers are from Anthropic, with maintainers from Anthropic, Google and OpenAI acting as individuals. Security guidance for skill writers and installers is on the proposed roadmap, not yet published. — [Anthropic: donating Agent Skills to AAIF](https://www.anthropic.com/news/donating-agent-skills-to-the-agentic-ai-foundation)
- [BG] Anthropic first published Agent Skills as an open standard on 2025-12-18/19. — [Simon Willison, 2025-12-19](https://simonwillison.net/2025/Dec/19/agent-skills); spec at [agentskills.io](https://agentskills.io/specification) / [GitHub agentskills](https://github.com/agentskills/agentskills)
- Skills over MCP (`io.modelcontextprotocol/skills`, SEP-2640 Final, extension stage Beta). Servers declare the `resources` capability plus the extension and implement `skills/list` and `skills/get`. Files are served via `resources/read` (`skill://name/SKILL.md`). Each listing has a **complete manifest with a SHA-256 digest and size per file**, and limits are SHOULD NOT exceed 512 files or 16 MiB per skill. — [MCP Skills extension](https://modelcontextprotocol.io/extensions/skills/overview)
- Skills over MCP host obligations — [MCP Skills extension](https://modelcontextprotocol.io/extensions/skills/overview):
  - Hosts **MUST** verify digests and frontmatter, restrict reads to the manifest, and not prefetch files.
  - Persisted approval binds to the full set of URIs and digests, and any change revokes approval. This is a direct defence against skill "rug pulls".
  - Hosts treat skill content as untrusted. They require per-skill user approval for code execution or `allowed-tools` grants, and prevent same-name skills from silently replacing each other.
  - SDK and host support is "still being implemented".
- [2°] A March 2026 count put Agent Skills support at 16+ tools. That conflicts with Anthropic's "70+" from October 2026, which is likely just a later count. — [DEV Community guide](https://dev.to/serenitiesai/ai-agent-skills-guide-2026-build-skills-for-16-ai-tools-1jea)
- [2°] Reports of 341 malicious skills discovered by early 2026; I did not trace this to a primary source. — (search summary of [Medium/Strapi-type articles](https://strapi.io/blog/what-are-agent-skills-and-how-to-use-them); unverified)
- AGENTS.md was released by OpenAI in August 2025 and is a founding AAIF project (2025-12-09). — [LF AAIF formation press](https://linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- AAIF describes AGENTS.md as communicating "expectations, conventions, and operating instructions to AI agents". — [AAIF blog](https://aaif.io/blog/a2a-joins-aaif)
- [2°] A claim of 60k+ projects adopting AGENTS.md is unverified. — [DEV Community](https://dev.to/digitalapplied/agentic-ai-foundation-open-source-agent-standards-gl8)
- MCP Apps launched as an official extension on **2026-01-26**, "consolidating work from MCP-UI and OpenAI" (the Apps SDK). Claude web and desktop supported it on day one, VS Code was first among editors, and ChatGPT followed (secondary sources say February 2026). Launch partners included Asana, Box, Canva, Figma, Slack and Salesforce. — [MCP blog: MCP Apps](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/); [VS Code blog](https://code.visualstudio.com/blogs/2026/01/26/mcp-apps-support); [Google Developers: A2UI + MCP Apps](https://developers.googleblog.com/en/a2ui-and-mcp-apps/)
- [BG] The OpenAI Apps SDK (2025-10-06) was built on MCP. — [OpenAI: Introducing apps in ChatGPT](https://openai.com/index/introducing-apps-in-chatgpt/)
- [BG] Claude Code plugins and marketplaces (2025-10) bundle skills, slash commands, subagents, hooks and MCP server configs. — [Anthropic: Claude Code plugins](https://www.anthropic.com/news/claude-code-plugins)
- Supabase itself ships agent skills (`npx skills add supabase/agent-skills`) as development and security guidance. This shows vendors packaging procedural knowledge as Skills alongside their MCP servers (observed in this session's Supabase connector instructions; see [Supabase AI skills docs](https://supabase.com/docs/guides/getting-started/ai-skills.md)).

### Inferences
Proposed packaging for Jair OS's 81 workflows and 72 agent contracts:
- **One skill per *capability family*, not per workflow.** Examples: `classroom-publicacao`, `correcao-avaliacoes`, `material-didatico-fisica`, `whatsapp-pais`, `rotinas-escola-desktop`, `conteudo-editorial`. Each `SKILL.md` contains:
  - frontmatter `name` and a sharp `description` that triggers selection;
  - when to use the skill;
  - step order;
  - which jos-claude tools to call and with which handles;
  - the risk tier and approval rules;
  - links to `references/` (editorial standards, rubrics, contract JSON) and `scripts/` for deterministic steps.
  Progressive disclosure keeps context small: only frontmatter is loaded until the skill is chosen.
- **Agent contracts become machine-readable references inside skills.** Use a JSON or YAML schema modelled on A2A Agent Cards: id, version, inputs and outputs, tools allowed, risk level, approver, SLA and test cases. Keep the source of truth in the git repo and sync it to Supabase. The contract's `allowed-tools` should be enforced by the jos-claude server, not trusted from the skill text.
- **Distribution channels**, from cheapest to most portable:
  - (a) a git repo of skills with AGENTS.md at the root, for Claude Code and Codex working on the Jair OS code;
  - (b) a private Claude plugin or marketplace bundling the skills plus the jos-claude MCP connector config;
  - (c) serve the same skills from jos-claude via **Skills over MCP**. Digests make every change explicit and re-approval-gated, so the server becomes the single source for any MCP host. Do this once Claude.ai supports it, per the client matrix.
- Skills are just text and are not a security boundary. Server-side policy (risk tiers, approvals, allowlists) must remain in jos-claude and the orchestrator.

### Gaps
- I did not fetch the agentskills.io spec page for exact frontmatter fields beyond `name` and `description`. The MCP extension confirms these two are mandatory and that the directory name must equal `name`.
- I found no 2026 primary data on Claude plugin marketplace or OpenAI Apps directory changes.
- The "341 malicious skills" figure is unverified.

---

## 6. Agent-to-frontend protocols (AG-UI, A2UI, MCP Apps/MCP-UI) and payments (AP2, ACP), briefly

### Takeaway
**MCP Apps** (Stable) is the way to put interactive UI inside Claude, ChatGPT or VS Code chats: sandboxed HTML served as `ui://` resources. **A2UI 1.0** (Google) is a declarative JSON blueprint rendered with native components, and its renderers can run inside MCP Apps. **AG-UI** (CopilotKit-originated) is an optional event-stream transport for a custom frontend. For Jair OS, MCP Apps fits approval and preview cards inside Claude. AG-UI or A2UI matter only if the student/parent portal gets an embedded agent. Payments protocols are not relevant now.

### Cited Findings
- MCP Apps (SEP-1865) lets servers ship sandboxed HTML UIs. Tools declare UI templates so hosts can prefetch and review them — [RC blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/). The extension is Stable, for "charts, forms, video players" inline — [Extensions overview](https://modelcontextprotocol.io/docs/extensions/overview). Negotiation uses the `io.modelcontextprotocol/ui` extension with mimeType `text/html;profile=mcp-app` — [Extensions overview](https://modelcontextprotocol.io/docs/extensions/overview).
- Graceful degradation: a server offering UI-enhanced tools "should still return meaningful text content for clients that don't support the UI extension". — [Extensions overview](https://modelcontextprotocol.io/docs/extensions/overview)
- A2UI 1.0 lets an agent describe each view declaratively, with renderers for web, Android, iOS and Flutter. Its web and Flutter renderers run inside MCP Apps, so A2UI screens can appear in Claude and Gemini. — [Google Developers: A2UI 1.0](https://developers.googleblog.com/en/a2ui-1-0-generative-ui); [Google Developers: A2UI + MCP Apps (June 2026)](https://developers.googleblog.com/en/a2ui-and-mcp-apps/)
- AG-UI is an open protocol and library standardizing rich UI ↔ agent backend communication (event and state streaming). Thoughtworks notes its necessity is being questioned as UI is served alongside tools. — [Thoughtworks Radar](https://www.thoughtworks.com/en-in/radar/platforms/ag-ui-protocol); [InfoWorld](https://www.infoworld.com/article/4248550/getting-started-with-ag-ui-the-agent-user-interaction-protocol.html)
- [2°] The Oracle reference stack treats AG-UI as an optional event transport, not something required to use A2UI or MCP Apps. — [Oracle developers blog](https://blogs.oracle.com/developers/develop-a2ui-and-mcp-apps-with-oracle-ai-database-and-the-java-mcp-toolkit-running-in-google-gemini-enterprise-app-chatgpt-and-claude)
- [BG] Agent Payments Protocol (AP2, Google, 2025-09) — [Google Cloud blog](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol). Agentic Commerce Protocol (OpenAI and Stripe, 2025-09) — [OpenAI](https://openai.com/index/buy-it-in-chatgpt/).

### Inferences
- High-value MCP Apps for jos-claude, each degrading to text:
  - (1) a **Classroom post preview and approve card** that shows the class, text and attachments, with Approve and Edit buttons;
  - (2) a **WhatsApp outbound message review card**;
  - (3) a **daily operations and reliability panel** with n8n, desktop agents and OAuth health;
  - (4) a student progress card, showing minimal data only.
- An MCP Apps button click still goes back through a tool call. The server must verify that approval came from the human UI path, for example a one-time nonce bound to the preview. It must not accept a model-supplied `confirmar=true` alone (see §7).
- Skip AG-UI and A2UI unless the student/parent portal gets a conversational agent. Even then, A2UI's "native components from an approved catalog" model is safer than generated HTML for a portal used by minors.
- AP2 and ACP have no current relevance (no agent-initiated payments). If tutoring payments are ever automated, revisit.

### Gaps
- I did not verify 2026 status or versions of AP2, ACP or AG-UI.
- I did not fetch the full MCP Apps spec (CSP, sandbox rules, tool-visibility rules for app-only tools).

---

## 7. Security model: risks and defences (prompt injection, tool poisoning, rug pulls, confused deputy, token passthrough, lethal trifecta, CaMeL and dual-LLM, scanners, OWASP)

### Takeaway
Prompt injection remains unsolved at the model level. The defences that work are architectural:
- avoid the **lethal trifecta** (private data + untrusted content + external communication) in any single agent context, or apply Meta's "Rule of Two";
- enforce capabilities and data flow outside the LLM (CaMeL, dual-LLM);
- require least agency with out-of-band human approval for consequential actions;
- pin and verify tool and skill definitions to stop rug pulls;
- never pass tokens through.

The OWASP Top 10 for Agentic Applications 2026 (published 2025-12-09) is the reference taxonomy. The MCP spec hardened OAuth in 2026-07-28 and is working on agent identity (DPoP, ID-JAG, token exchange).

### Cited Findings
**Frameworks and taxonomies**
- OWASP Top 10 for Agentic Applications 2026, published 2025-12-09 with input from 100+ experts — [OWASP GenAI](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/); list and examples from [OWASP GenAI blog](https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/):
  - **ASI01** Agent Goal Hijack (e.g., EchoLeak)
  - **ASI02** Tool Misuse
  - **ASI03** Identity & Privilege Abuse
  - **ASI04** Agentic Supply Chain Vulnerabilities (dynamic MCP/A2A components; e.g., the GitHub MCP exploit)
  - **ASI05** Unexpected Code Execution
  - **ASI06** Memory & Context Poisoning (e.g., the Gemini memory attack)
  - **ASI07** Insecure Inter-Agent Communication
  - **ASI08** Cascading Failures
  - **ASI09** Human-Agent Trust Exploitation ("confident, polished explanations lead human operators to approve harmful actions")
  - **ASI10** Rogue Agents (e.g., the Replit incident)
- [2°] Palo Alto's mitigations — [Palo Alto Networks](https://www.paloaltonetworks.com/blog/cloud-security/owasp-agentic-ai-security/):
  - For ASI02: least-privilege tool permissions, validation and authorization of high-impact actions, anomaly monitoring, and full tool-call audit trails.
  - For ASI04: a component inventory, integrity validation, blocking untrusted sources, and scanning tool schemas.
  - For ASI06: validating data before it enters memory or RAG.
- [BG, 2025-06-16] Simon Willison's **lethal trifecta**: access to private data, exposure to untrusted content, and the ability to communicate externally. The only reliable defence is to avoid combining all three. — [Simon Willison](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- He continued posting on the topic through 2026; his tag feed shows entries dated 2026-05-26, 06-05, 07-15 and 08-08, which I did not read. — [lethal-trifecta tag feed](https://feeds.simonwillison.net/tags/lethal-trifecta/)
- A CSA note from June 2026 evaluated 100 agents against the trifecta. — [CSA research note](https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-agent-lethal-trifecta-capability-securi)
- [BG] The **dual-LLM pattern** (2023): a privileged LLM never sees untrusted text, and a quarantined LLM processes untrusted text and returns symbolic references. — [Simon Willison](https://simonwillison.net/2023/Apr/25/dual-llm-pattern/)
- [BG] **CaMeL** (Google DeepMind et al., March 2025) extends dual-LLM. A privileged LLM writes a plan as code from the trusted user query only. A custom interpreter tracks data provenance and capabilities and enforces security policies on each tool call, so untrusted data cannot change control flow or reach disallowed sinks. — [arXiv 2503.18813](https://arxiv.org/abs/2503.18813)
- [BG, 2025-10] Meta's **"Agents Rule of Two"**: within a session an agent should satisfy at most two of (A) processing untrustworthy inputs, (B) accessing sensitive systems or private data, and (C) changing state or communicating externally. Otherwise it needs human-in-the-loop supervision. — [Meta AI blog](https://ai.meta.com/blog/practical-ai-agent-security/)

**MCP-specific threat classes**
- **Tool poisoning and rug pulls.**
  - Malicious instructions hidden in tool descriptions or metadata, or definitions changed after approval. Example: in the WhatsApp MCP case (April 2025), a malicious server's poisoned tool caused exfiltration of message history through a legitimate WhatsApp server. — [AuthZed timeline](https://authzed.com/blog/timeline-mcp-breaches)
  - In 2026 the "Deadbugz" campaign used **runtime-gated metadata poisoning**: payloads stay dormant during review and activate after trust is established. — [CSA research note, 2026-09-02](https://labs.cloudsecurityalliance.org/research/csa-research-note-deadbugz-mcp-metadata-poisoning-20260902-c/)
  - The Skills-over-MCP extension's digest-bound approval directly counters rug pulls for skills. — [MCP Skills extension](https://modelcontextprotocol.io/extensions/skills/overview)
- **Over-privileged tokens plus prompt injection.** In the GitHub MCP case (May 2025), a malicious public issue induced the agent to leak private repo contents into a public PR. — [AuthZed timeline](https://authzed.com/blog/timeline-mcp-breaches)
- **STDIO configuration → command execution ("by design").**
  - OX Security, reported 2026-04-20: across the official SDKs (Python, TypeScript, Java, Rust), the STDIO server config is a command line. Any path that lets untrusted input write MCP config yields RCE. More than 7,000 public servers and packages and more than 150M downloads are affected, with 10+ CVEs (LiteLLM, LangFlow, Flowise, Windsurf, etc.).
  - Anthropic declined to change the architecture, calling it "expected behavior".
  - Recommended mitigations: block public IP access to sensitive services, monitor tool invocations, sandbox MCP-enabled services, treat external MCP config input as untrusted, and install only verified servers.
  - Sources: [The Hacker News, 2026-04-20](https://thehackernews.com/2026/04/anthropic-mcp-design-vulnerability.html); [OX Security advisory](https://www.ox.security/blog/mcp-supply-chain-advisory-rce-vulnerabilities-across-the-ai-ecosystem/)
- **Authorization and confused deputy.**
  - 2026-07-28 requires `iss` validation (RFC 9207) and issuer-bound client credentials, deprecates DCR in favour of CIMD, and moved Sampling (a path for servers to drive the client's LLM) to deprecated. — [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
  - [BG] Since 2025-06-18 the MCP security best practices forbid **token passthrough**: servers must not accept tokens not issued for them, or forward client tokens to upstream APIs. They also address **confused deputy** attacks in proxy servers that use static client IDs with third-party authorization servers, requiring per-client consent. — [MCP Security Best Practices](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)
  - The roadmap (2026-08-22) names DPoP, Workload Identity Federation, ID-JAG and RFC 8693 token exchange as the path away from "pasted API keys and long-lived refresh tokens", plus possible **human-presence attestation**. — [MCP roadmap](https://modelcontextprotocol.io/development/roadmap.md)
- **Exposed servers.** [2°] Trend Micro reportedly found 492 MCP servers exposed to the internet without authentication. — [search summary via Practical DevSecOps](https://www.practical-devsecops.com/mcp-security-statistics-2026-report/) (unverified)
- **Scanners and tools.**
  - [BG] Invariant Labs' `mcp-scan` checks tool descriptions for poisoning and pins tool hashes to detect rug pulls. — [GitHub invariantlabs-ai/mcp-scan](https://github.com/invariantlabs-ai/mcp-scan)
  - The MCP experimental extensions include "interceptors" (validating and transforming tool calls) and "tool annotations for action metadata and trust", the likely future home for standardized policy hooks. — [Extensions overview](https://modelcontextprotocol.io/docs/extensions/overview)
- **Academic.** 2026 papers on detecting malicious MCP servers — [arXiv 2604.01905](https://arxiv.org/pdf/2604.01905); [arXiv 2510.16558](https://arxiv.org/html/2510.16558v1).

### Inferences
Concrete mitigations for Jair OS, which acts on school systems and sends messages to students and parents:

1. **Jair OS has the full lethal trifecta.**
   - Private data: student records, grades and minors' data.
   - Untrusted content: Gmail, WhatsApp inbound, Classroom comments, web, student submissions and Drive files.
   - External communication: WhatsApp, Gmail, Classroom posts, desktop UI automation on school systems.
   - Apply the Rule of Two per execution context:
     - Agents that **read untrusted content** (inbox triage, submission grading, WhatsApp inbound) run **without send or publish tools** and output structured data only (dual-LLM or quarantined style).
     - Agents that **send or publish** receive only trusted inputs: Jair's instruction plus structured fields. Free text derived from untrusted sources is shown to the human verbatim before sending.
2. **Approval must be out-of-band and server-enforced.**
   - Today the Classroom publish tool takes `confirmar=true` after Jair approves in chat. A prompt-injected model can set that flag.
   - Fix: a high-risk tool call first returns a *pending action* with a hash of the exact payload. Execution then requires a one-time approval token minted by a human channel the LLM cannot write to: an MCP Apps approve button bound to a nonce, a WhatsApp or portal approval link, or MCP URL-mode elicitation via MRTR. Compare payload hashes at execution time.
   - This also counters ASI09 (polished explanations): the approval card shows the raw payload, recipients and class, not the model's summary.
3. **Recipient and target allowlists plus rate limits, enforced server-side.**
   - WhatsApp and Gmail recipients are restricted to known contacts in Supabase.
   - Classroom posts go only to classes linked in the DB.
   - Cap the number of messages per hour.
   - Block any URL or attachment not produced by Jair OS. This breaks the exfiltration channel even if injection succeeds.
4. **Desktop agents (macOS/Windows over Tailscale) carry the highest blast radius.**
   - Use Tailscale ACLs so only the Supabase dispatcher or worker can reach them.
   - Run an allowlist of named job types with parameter schemas; never accept free-form shell or PowerShell from the LLM.
   - Never let any workflow write MCP client config (the STDIO RCE class).
   - Run desktop automation under a non-admin OS account.
   - Take a screenshot before submitting anything on school systems.
5. **Tokens.**
   - The MCP OAuth token for jos-claude must never be forwarded to Google or WhatsApp.
   - Google refresh tokens stay server-side, encrypted and scoped per integration. Request minimal Google scopes, because broad scopes increase blast radius and Google's re-consent churn.
   - Validate `iss` and audience on every request.
   - Log and alert on OAuth failures as part of the self-healing loop.
6. **Supply chain.**
   - Pin the versions and hashes of third-party MCP servers and skills.
   - Never accept PRs that add MCP servers to config (the Deadbugz vector).
   - Run `mcp-scan`-style checks in CI.
   - Prefer first-party remote connectors (Google, Supabase, GitHub) over community packages.
7. **Memory and RAG poisoning (ASI06).**
   - Tag pgvector chunks with provenance (trusted, authored by Jair, versus untrusted, from external sources).
   - Do not let untrusted-provenance chunks be retrieved into send-capable agent contexts.
   - Require human confirmation before writing to long-term memory from untrusted inputs.
8. **Audit.** Propagate OpenTelemetry `traceparent` through every hop: Claude, jos-claude, the Supabase function, n8n or the desktop agent, and Google or WhatsApp. Make audit records append-only.

### Gaps
- I did not read Simon Willison's 2026 posts; their content is unknown.
- I did not fetch the full OWASP mitigation text (it is a download); per-item mitigations come partly from a vendor blog.
- I did not verify whether Claude.ai exposes URL-mode elicitation or MRTR to custom connectors.
- I found no independent evaluation of 2026 MCP security scanners (Snyk/Invariant, Cisco, others).

---

## 8. Notable incidents involving MCP or agent tools, 2025–2026

### Takeaway
Incidents moved from proof-of-concept tool poisoning in 2025 (WhatsApp MCP, GitHub MCP) to systemic RCE classes, active supply-chain campaigns and exploited CVEs in 2026:
- the STDIO-by-design RCE affecting 150M+ downloads (April 2026);
- the nginx-ui "MCPwn" auth bypass, CVSS 9.8, exploited (March 2026);
- the trojanized Oura MCP delivering the StealC infostealer (February 2026);
- the Deadbugz runtime-gated poisoning campaign (August 2026).

### Cited Findings
Unless marked otherwise, these come from the [AuthZed MCP breach timeline](https://authzed.com/blog/timeline-mcp-breaches):
- **2025-04 [BG]:** WhatsApp MCP plus a malicious server; tool poisoning exfiltrated message history.
- **2025-05 [BG]:** Official GitHub MCP server; prompt injection via a public issue plus an over-privileged token leaked private repo data.
- **2025-06 [BG]:** Asana MCP; cross-tenant data exposure.
- **2025-06 [BG]:** MCP Inspector CVE-2025-49596; unauthenticated RCE on developer machines.
- **2025-07 [BG]:** mcp-remote CVE-2025-6514; client-side RCE from a malicious server endpoint (437k+ downloads).
- **2025-08 [BG]:** Anthropic Filesystem MCP server CVE-2025-53109/53110; sandbox escape and path traversal.
- **2025-09 [BG]:** Malicious "Postmark MCP" npm package BCC'd all emails to the attacker.
- **2025-09 [BG]:** Flowise CVE-2025-59528.
- **2025-10 [BG]:** Smithery hosting path traversal exposed a Fly.io token controlling 3,000+ apps.
- **2025-10 [BG]:** Framelink Figma MCP CVE-2025-53967.
- **2026-01:** Unofficial gemini-mcp-tool CVE-2026-0755 (CVSS 9.8), unauthenticated command injection, unpatched at advisory time.
- **2026-02:** SmartLoader campaign; a trojanized Oura Ring MCP clone distributed via registries delivered the StealC infostealer. — also [The Hacker News](https://thehackernews.com/2026/02/smartloader-attack-uses-trojanized-oura.html)
- **2026-03:** nginx-ui MCP CVE-2026-33032 ("MCPwn", CVSS 9.8), auth bypass leading to full nginx takeover, ~2,600 exposed instances, patched 2026-03-15; reported actively exploited [2°: Pillar/saaro summaries].
- **2026-04-20:** OX Security disclosed STDIO-by-design RCE across the official SDKs: 7,000+ servers and packages, 150M+ downloads, 10+ CVEs. Anthropic called it "expected". — also [The Hacker News](https://thehackernews.com/2026/04/anthropic-mcp-design-vulnerability.html)
- **2026-08-10:** "Deadbugz" campaign. 23 unsolicited GitHub PRs within 74 minutes added a malicious "productivity-suite" MCP server to project configs, with runtime-gated metadata poisoning. — [Pillar Security](https://www.pillar.security/blog/deadbugz-currently-active-mcp-supply-chain-campaign); [CSA note, 2026-08-30](https://labs.cloudsecurityalliance.org/research/csa-research-note-deadbugz-mcp-supply-chain-20260830-csa-sty/); [CSA note, 2026-09-02](https://labs.cloudsecurityalliance.org/research/csa-research-note-deadbugz-mcp-metadata-poisoning-20260902-c/)
- **2026 (unverified, single secondary sources):**
  - the official MCP Registry used in August 2026 to distribute a Shai-Hulud payload via a linked GitHub repo — related: [OX: Shai-Hulud evolves into MCP](https://www.ox.security/blog/shai-hulud-outbreak-debrief-the-worm-evolves-into-mcp/);
  - an MCP-specific vulnerability added to CISA KEV in September 2026;
  - GlassWorm "Wave 5" malicious MCP servers and extensions — [Palo Alto](https://www.paloaltonetworks.com/blog/?p=372170).

### Inferences
- Most 2026 incidents are **supply chain** (malicious or cloned servers, PR-injected config) or **local-execution** (STDIO) issues, not flaws in a remote server's own logic. Jair OS's own risk concentrates on two things:
  - (a) third-party MCP servers or skills installed on the Macs and Windows machines that run desktop agents;
  - (b) prompt injection through Gmail, WhatsApp and Classroom content reaching tools that can send.
- The GitHub MCP case is the closest analogue to Jair OS: one agent with a broad token reading attacker-controlled text and writing to a public channel. It is exactly the trifecta pattern in §7.

### Gaps
- I could not verify the CISA KEV listing, the Shai-Hulud-via-MCP-Registry claim, or the "MCPwn actively exploited" claim against primary sources (NVD, CISA, registry maintainers).
- I found no incidents specific to education, Google Classroom or WhatsApp Business APIs in 2026.

---

## 9. Concrete recommendations for evolving jos-claude (MCP server) and the agent catalog

### Takeaway
Three tiers. P0 (reliability and safety now): adopt the stateless spec, server-enforced approvals and allowlists, and tracing. P1 (certification and scale): package workflows and contracts as versioned Agent Skills with machine-readable contracts and conformance tests. Later: Tasks, Skills-over-MCP and MCP Apps once host support is confirmed. A2A stays design inspiration only.

### Cited Findings
The supporting facts are cited in §§1–8:
- stateless 2026-07-28 spec and migration steps — [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog), [RC blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/);
- Tasks (Beta, to Core), MCP Apps (Stable), Skills (Beta) and Enterprise-Managed Auth (Stable) — [Extensions overview](https://modelcontextprotocol.io/docs/extensions/overview);
- Supabase Edge MCP auth pattern — [Supabase UI docs](https://supabase.com/ui/docs/headless/mcp);
- Skills digest-bound approval — [MCP Skills extension](https://modelcontextprotocol.io/extensions/skills/overview);
- A2A task lifecycle and signed cards — [A2A spec](https://a2a-protocol.org/latest/specification/);
- lethal trifecta, Rule of Two and CaMeL — [Willison](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/), [Meta](https://ai.meta.com/blog/practical-ai-agent-security/), [arXiv](https://arxiv.org/abs/2503.18813);
- OWASP ASI list — [OWASP](https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/).

### Inferences
**P0: end-to-end reliability and safety**
1. **Spec migration (jos-claude v1.1 → v2).**
   - Support both 2025-11-25 (initialize-based) and 2026-07-28 (stateless) during the 12-month deprecation window.
   - Implement `server/discover`, `_meta`-based version and capabilities, the `Mcp-Method`/`Mcp-Name` headers, `resultType`, `ttlMs` and `cacheScope`, deterministic tool order, and error codes -32602 and -32020 to -32022.
   - Use an SDK or framework that tracks the spec (mcp-lite on Supabase Edge, or the official TypeScript SDK) instead of hand-rolled JSON-RPC, so conformance comes "for free".
2. **Auth.**
   - Publish RFC 9728 protected-resource metadata; use OAuth 2.1 with PKCE, `iss` validation and audience-bound tokens.
   - Prefer CIMD-compatible authorization over DCR.
   - Run RLS-scoped DB clients per request.
   - No token passthrough to Google or WhatsApp.
   - Separate the Google OAuth health check from tool calls, so recurring Google token errors surface as a typed `auth_required`-style status (borrowing A2A's state) instead of generic failures.
3. **Risk-tiered tools with server-enforced approval.**
   - Annotate every tool: read-only, internal-write, external-send, school-system-UI.
   - For external-send and UI tiers, use the two-phase "prepare → approve (human channel, nonce plus payload hash) → commit" pattern, replacing model-settable `confirmar=true`.
   - Add recipient and class allowlists and rate limits.
4. **Trifecta split in the agent catalog.**
   - Classify each of the 72 contracts by which of {untrusted input, private data, external action} it touches.
   - Any contract with all three must be split or require human approval, per the Rule of Two.
5. **Observability.**
   - Accept and propagate W3C `traceparent` from `_meta` through Supabase, n8n, the desktop agents and the Mac worker.
   - Standardize execution states on A2A's lifecycle (submitted/working/input-required/auth-required/completed/failed/canceled/rejected) to feed self-healing.
6. **Long-running work.**
   - Keep the existing handle pattern (`desktop` → `desktop_resultado`), which is exactly what the stateless spec prescribes.
   - Adopt the Tasks extension (`tasks/get`, `tasks/update`, `tasks/cancel`) only when Claude's client supports it; it is Beta.
   - Make n8n jobs return handles too, so flaky n8n failures are visible and retryable.

**P1: certification and scalability**
7. **Skills packaging.**
   - Group the 81 workflows into ~10–20 capability-family skills (`SKILL.md` plus `references/` plus `scripts/`), with the contract YAML/JSON as references. Version them in git with AGENTS.md at the repo root.
   - Ship a private Claude plugin bundling the skills plus the connector config.
   - Later, serve them through Skills-over-MCP (digest manifests provide change control and re-approval).
8. **Empirical agent certification.** For each contract, keep a test suite of golden inputs, expected tool-call traces and adversarial prompt-injection cases (OWASP ASI01/02/06/09). Run it with:
   - the MCP conformance suite against the server;
   - scripted MCP Inspector or MCPJam sessions on patched versions;
   - an LLM-in-the-loop evaluation harness.
   Record a "certified version" per contract, conceptually like A2A signed Agent Cards. Only certified versions are routable.
9. **Catalog surface.**
   - Keep ~20 stable verb tools.
   - Expose the 81 workflows and 72 agents via the existing discovery tools (`listar_workflows`, `buscar_agentes`, `ler_agente`) rather than as separate MCP tools.
   - Write descriptions as usage contracts, and return `structuredContent` plus a short text summary.
10. **MCP Apps.** Once P0 is stable, add approve/preview cards (Classroom, WhatsApp) and an operations-health panel, with text fallback.

**Do not do (for now)**
- A2A internally.
- Publishing to the public MCP Registry.
- A heavyweight enterprise MCP gateway.
- Using Sampling or Roots (deprecated).
- Installing community MCP servers or skills on the desktop-agent machines without pinning and review.

### Gaps
- I did not verify which of these extensions (Tasks, Skills, URL elicitation or MRTR, MCP Apps) Claude.ai supports today for custom connectors. Check the [client matrix](https://modelcontextprotocol.io/extensions/client-matrix.md) before committing to the timeline.
- No source evaluates these patterns specifically for education or K-12 data-protection contexts (e.g., Brazil's LGPD for minors). That analysis is out of this researcher's scope.
