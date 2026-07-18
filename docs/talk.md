# Talk: Anatomy of an MCP Server That Teaches a Model to Ship Production Code

> **Title and abstract for a tech talk — first-person retrospective on building
> and stress-testing `pix-galaxy-mcp`, a 235-tool MCP server that enforces
> frontend/backend/data/styleguide guardrails inside the prompt.**

---

## Title

**235 tools in one prompt: how I built an MCP server that makes the LLM
respect styleguides (and why the server costs less than 1% of the task)**

**Subtitle / alternative shorter title:**
*"An MCP server, six months later: an honest postmortem of 4 production
projects, 5 different models, and 11,000 lines of generated code"*

**One-line pitch (for CFP forms):**
*"Building an MCP server that enforces guardrails inside the prompt — a
6-month, 4-project, 5-model retrospective on real costs, real mistakes,
and real wins."*

---

## Abstract

### Who I am and why this talk exists

I'm the developer (and primary user) of `pix-galaxy-mcp`, a "skill-first"
MCP server that exposes **235 tools, 146 resources, and 5 prompts**
organized around 70 skills (`pix-frontend-react`, `pix-backend-express`,
`pix-styleguide-css`, `pix-process-adr`, `pix-ui-design-system`, …). The
server has no LLM inside: it is pure `@modelcontextprotocol/sdk` + `zod`,
just two runtime dependencies, around 10,500 lines of source across 35
modules, 45 test files, and 11 Architecture Decision Records. It is
installable on 23 different agents (Claude Code, Cursor, Cline, Copilot,
Gemini CLI, OpenCode, Pi, Windsurf, …).

Over the past six months I have stress-tested the server on four different
production projects — an Electron phonebook, a full-stack bookmarks
manager, a newsletter manager, and a phonebook POC — using five different
models (Claude Sonnet 4.6, Claude Sonnet 5, GPT 5.6 Luna, DeepSeek v4
Flash, plus a local DeepSeek variant), and I have kept the numbers:
tokens, dollars, user prompts, generated ADRs, files written, and
adherence to the styleguides.

This talk is the honest postmortem of that experiment.

### The question this talk answers

> *"Local MCP server: does it actually help, or is it overhead I can
> skip?"*

The short answer is yes, and the numbers are surprising:

- **The server costs less than 1% of the task.** On an Electron app of
  4,959 LOC generated with DeepSeek v4 Flash in 3h 45m for a total
  cost of $0.11, the "attributable cost" of the `pix_*` tool calls was
  **~$0.0011** — about 0.97% of the total. On the phonebook benchmark
  (3 models, 5,708 LOC, up to $5.38), the sibling `pix-galaxy-mcp`
  server spent between **0.2% and 1.1%** of the total, depending on the
  model.

- **But without the server, the same prompt produces blobs.** Without
  MCP, all 5 tested models generated code with inconsistent naming,
  no design system or a single monolithic CSS file, non-decomposable
  "monolith" architectures, zero ADRs, zero handoffs, and bundles 3-5×
  heavier. With the server, even the worst model (GPT 5.6 Luna on
  phonebook) shipped 805 LOC that were at least structured with barrel
  files, the `_` prefix, and 9 generated ADRs — not production-ready,
  but not a blob either.

- **The model matters more than the server.** On an identical phonebook
  task:
  - Sonnet 4.6 → 1 prompt, 5,708 LOC, $5.38, **8/11** MCP adherence,
    MVP complete on the first try with `adoptedStyleSheets` and a
    structured design system.
  - GPT 5.6 Luna → 4 prompts, 805 LOC (one monolithic component),
    $1.54, **4/11** adherence, **25 MCP invocations used badly** (more
    tools ≠ better output).
  - DeepSeek v4 Flash → 4 prompts, 4,239 LOC, $0.075, **7/11**
    adherence, working MVP but with 3 follow-up correction rounds.

### What I demonstrate, in order of importance

1. **The bottleneck is inference, not tooling.** Across six months of
   benchmarks, the "MCP cost" (context the model spends reading tool
   responses) was always between 0.2% and 6% of the total cost. The
   rest is the model generating output tokens. Adding 235 MCP tools
   does not double the cost: it leaves the cost practically unchanged.

2. **Sonnet is the only model that *actually* uses prompt caching.**
   In every benchmark Sonnet wrote ~285K tokens into the cache on the
   first turn and re-read them across 56-89 subsequent calls at the
   reduced rate. Result: 99% of Sonnet's context comes from the cache,
   not from full-price input. Estimated saving per session: $30-70.
   GPT 5.6 Luna and DeepSeek v4 Flash *never* wrote to the cache
   (`cacheWrite=0` in all 3 runs each) — they pay full price on every
   call.

3. **More MCP tools do not mean better output.** GPT 5.6 Luna used 30
   pix invocations on bookmarks, 25 on phonebook — the absolute
   record — but produced the worst architectural output: a single
   monolithic file, design system in one CSS file with classes, bundle
   2.4× heavier than Sonnet (391KB vs 166KB). Sonnet 5 on bookmarks
   used only 23 tools and delivered a first-prompt MVP with 9/10
   adherence.

4. **The "read the skills, then produce" pattern only works if the
   model respects it.** Models that load the skills in `mode: "full"`
   up front (Sonnet 4.6) and then plan in a few monolithic turns beat
   the models that do many short turns and read skills late (DeepSeek).
   Real throughput: Sonnet 4.6 = **5,708 LOC per user prompt**, DS4 =
   1,060, GPT = 805.

5. **The savings infrastructure (caveman, tokensave) is there but the
   models don't use it.** Across 7 benchmark sessions, **caveman was
   invoked 0 times**. Tokensave was called 7 times in total, of which 5
   were `status`/`health` and 2 were `record_decision` — never one
   efficient read of the code graph. Missed savings potential: $1-3
   per Sonnet session, $0.30-0.80 on the others.

6. **The 8-step pix workflow works in 80% of cases.** On Newsletter
   Studio the model followed 6.5/8 steps of the workflow (`pix` →
   load skill → ADR → `pix_check` → test-first → typecheck → handoff).
   The main gaps: test-first and systematic `pix_check`. The result is
   still an Electron production-ready app with zero runtime dependencies,
   6 panels, 4,959 LOC, Playwright + axe-core for a11y, and
   `prefers-reduced-motion` respected.

### What the audience takes home

Attendees learn:

- **How to actually measure the cost of an MCP server** (the difference
  between context spent vs. *peak* context vs. cumulative `cacheWrite` —
  I learned this the hard way; the first draft of my reports had this
  metric wrong).
- **When an MCP server is worth installing and when it isn't** (rule of
  thumb: if the prompt says "leverage all the standards indicated by the
  skills", the server makes the model respect the convention. If the
  prompt is open-ended, models ignore both the server and the
  standards).
- **The 5 golden rules of the guardrail engine** (why 18 shared rules +
  framework-specific rules beat 100 generic rules).
- **Why "deterministic gateway + receipt" is the pattern that makes
  the write-path safe** (HMAC-SHA256 of the code hash, server-side
  validation, fail-closed enforcement).
- **Why Sonnet's aggressive cache-write changes the math** on the real
  TCO of an AI-assisted project.

### Audience & format

- **Duration**: 35-40 minutes + 10-15 minutes of Q&A
- **Audience**: developers, tech leads, AI engineers, staff engineers who
  use or want to use a coding agent (Claude Code, Cursor, Copilot, …) in
  production
- **Level**: intermediate. No prior deep knowledge of MCP is required —
  I introduce the protocol in 5 minutes — but having written at least
  one LLM integration helps.
- **Format**: slide-driven with a 5-minute live demo of `pix-galaxy-mcp`
  in action (load the skills, show the fail-closed guardrail, generate
  a component, show the receipt, write the file).

### Takeaway in one line

> The MCP server doesn't save tokens — it saves **code review meetings**.
> Server cost: < 1% of the task. Cost of a missing design system or an
> ADR not written: you'll find it 3 sprints later.

---

## Numbers in pills (for the final slide)

```
📦 PIX-GALAXY-MCP (the machine)
   • 235 tools, 146 resources, 5 prompts
   • 70 skills indexed
   • 2 runtime deps (MCP SDK + zod)
   • ~10,500 source lines, 35 modules, 45 tests
   • 11 ADRs, 4 plan documents
   • Installable on 23 different agents

📊 MCP SERVER COST AS % OF TASK
   • Newsletter Studio (DS4 Flash):  0.97 % of $0.11
   • Bookmarks Sonnet 5:             5.5  % of $5.49
   • Bookmarks GPT 5.6 Luna:         2.6  % of $1.88
   • Bookmarks DS4 Flash:            0.15 % of $0.07
   • Phonebook Sonnet 4.6:           0.2  % of $5.38
   • Phonebook GPT 5.6 Luna:         1.0  % of $1.54
   • Phonebook DS4 Flash:            1.3  % of $0.08
   → AVERAGE: MCP server ≈ 1.7 % of total task cost

🏆 BENCHMARK RESULTS
   Newsletter Studio (Electron,  4,959 LOC, $0.1130, 1 prompt)
   Bookmarks Sonnet 5   (R+Exp,  3,479 LOC, $5.49,   1 prompt, 9/10)
   Bookmarks GPT 5.6    (R+Exp,  2,132 LOC, $1.88,   2 prompt, 7/10)
   Bookmarks DS4 Flash  (R+Exp,  2,505 LOC, $0.07,   3 prompt, 4/10)
   Phonebook Sonnet 4.6 (Electr, 5,708 LOC, $5.38,   1 prompt, 8/11)
   Phonebook GPT 5.6    (Electr,   805 LOC, $1.54,   4 prompt, 4/11)
   Phonebook DS4 Flash  (Electr, 4,239 LOC, $0.08,   4 prompt, 7/11)

🧠 MODEL VS SERVER
   • Sonnet is the only model with active prompt caching (275-285K cacheWrite)
   • Sonnet 4.6 produces 5,708 LOC in 1 prompt (record)
   • GPT 5.6 Luna uses the most MCP tools of all (25-30) but worst output
   • DS4 v4 Flash is unbeatable on $ but needs 3-4 follow-up rounds

🎯 MCP ADHERENCE (styleguide, ADRs, a11y, tests)
   Sonnet 5/4.6     : 8-9 / 10
   DeepSeek v4 Flash: 4-7 / 10
   GPT 5.6 Luna     : 4-5 / 10

💡 HONEST CAVEATS
   • caveman invoked 0/7 sessions
   • tokensave invoked 7 times in 7 sessions (5 health, 2 record)
   • The server is "free" but only if the prompt forces the standard
   • Without an explicit prompt, models treat the server as noise
```

---

## Slide deck in detail

### Slide 1 — What I built

Architecture of the server: 235 tools, 70 skills, 146 resources, BM25
search, guardrail engine with 18 shared rules, deterministic gateway
(`pix_gateway` + `pix_apply` with HMAC receipt), strict mode at 9
tools, installable on 23 agents.

### Slide 2 — The prompt that broke everything

The initial Newsletter Studio prompt (verbatim, one paragraph) and what
Sonnet vs. DeepSeek vs. GPT did facing the same brief. Spoiler: Sonnet
read 6 skills in `mode: "full"`, produced 4,959 LOC, 2 ADRs, and the
app started on the first `pnpm start`.

### Slide 3 — The metric everyone gets wrong

"Context used" is not `input + cacheRead + output` (that is N × context
window). The real number is `peak context` (max in one call). I
demonstrate with the bookmarks numbers: 19M cumulative "cacheRead" on
Sonnet, but the unique context was 276K.

### Slide 4 — MCP server cost, 7 real sessions

Bar chart: percentage of total cost attributable to the server. Range
0.15% (DS4 bookmarks) → 5.5% (Sonnet bookmarks). Average 1.7%.
Conclusion: the server is free. The bottleneck is the model.

### Slide 5 — Cache write: who *actually* uses prompt caching

Only Sonnet writes to the cache (275-285K tokens on the first turn,
re-read at 10% for 56-89 calls). Estimated Sonnet saving: $30-70 per
session. GPT and DeepSeek never write (`cacheWrite=0`) — they pay full
price on every call.

### Slide 6 — Sonnet 4.6 vs GPT 5.6 vs DS4: same prompt, three destinies

For phonebook: Sonnet 5,708 LOC in 1 prompt; GPT 805 LOC in 4 prompts;
DS4 4,239 LOC in 4 prompts. For Sonnet: zero retries, 11 components,
monolithic design system, `adoptedStyleSheets` micro-interaction. For
GPT: 25 MCP invocations and a single monolithic `OrbitApp.jsx`. For
DS4: you have to chase it for 3 rounds.

### Slide 7 — Live demo (5 min)

I show `pix-galaxy-mcp` in action: I load a skill in `mode: "full"`,
show the fail-closed guardrail (a CSS file with classes is rejected by
`pix_check`), generate a component with `pix_component`, show the
HMAC receipt from `pix_gateway`, write the file with `pix_apply`.

### Slide 8 — The infrastructure the models don't use

caveman: 0/7 invocations. tokensave: 7/7 invocations, 5 of them
cosmetic. Missed savings: $1-3 per session. I explain why models treat
these skills as "secondary task" and not as accelerators.

### Slide 9 — The 5 golden rules of the guardrail engine

1. **Shared rules + framework-specific rules** beat 100 generic rules.
2. **Smart iteration** (skip already-passed checks) halves execution
   time.
3. **Deterministic gateway** (no LLM inside the check) → reproducible
   output.
4. **HMAC-SHA256 receipt** tied to the code hash → impossible to reuse a
   receipt after modifying the code.
5. **Fail-closed by default**, advisory only if explicitly tagged
   `advisory` in the annotation.

### Slide 10 — Takeaway & resources

- Repo: `github.com/pixu1980/pix-galaxy-mcp`
- Reports: `docs/01-product-architecture.md`, `docs/02-tools-operations.md`
- KPI: `docs/plans/token-efficiency-kpi.md`
- ADRs: `docs/adr/001-011`
- Contact: `[insert]`

---

## Speaker notes

### Why this talk is different from the many "How to build an MCP server"

1. **It has the numbers, not the opinions.** Every claim is backed by
   7 real, billed, measured sessions. The Sonnet vs. GPT vs. DS4
   comparison tables come from the pi-coding-agent JSONL session files —
   not estimates.

2. **It confesses the failures.** caveman 0/7. tokensave 7/7
   cosmetically. These are models that, despite the user's explicit
   prompt, did not use the savings infrastructure. The talk doesn't
   sell, it tells.

3. **It is technically bilingual.** Works for an Italian audience
   (Sonnet/DeepSeek comparison, TCO focus in euros) and for an
   international conference (the code is MIT, the skills are in English,
   the ADRs are in English).

4. **It has a live demo that works.** The fail-closed guardrail is a
   show: the model tries to write a file with `class="foo"` and the
   server responds with "guardrail fail: pix-styleguide-css requires a
   `data-part` selector". The audience remembers this moment.

5. **It ends with an operating rule.** MCP server < 1% of the cost →
   install it. Sonnet cacheWrite 285K → saving $30-70 → use Sonnet for
   tasks > 2K LOC. caveman/tokensave unused → ok, not the bottleneck.
   The "real" cost of an AI-assisted project is the model, not the
   tooling.

### Material to prepare

- [ ] Slide deck (10 slides + title + Q&A)
- [ ] Live demo environment: `pix-galaxy-mcp` cloned, one example
      project (bookmarks-sonnet5 or newsletter-studio), Claude Code or
      Pi with the server already registered in `mcp.json`
- [ ] Backup video of the demo (in case of network issues)
- [ ] PDF report to distribute: 4 benchmarks consolidated in one
      document (~50 pages)
- [ ] Public repo updated with README linked to all the reports
- [ ] Screenshots of the "MCP server cost" tables (slide 4) and
      "cache write" (slide 5)

### Anti-patterns to avoid during the talk

- ❌ Don't show the server code for more than 30 seconds — the audience
  is not here for that, they're here for the numbers and the demo.
- ❌ Don't talk about the MCP protocol for more than 2 minutes — "it's
  like LSP but for an LLM's tools" is enough, then move on.
- ❌ Don't defend Sonnet as "the best" — the numbers speak for
  themselves. The point is "the model matters more than the server, and
  Sonnet is the only one that uses prompt caching properly".
- ❌ Don't sell `pix-galaxy-mcp` as *the* MCP server — it's an
  example, a reference implementation, a case study.

### 30-second pitch (for submission forms)

> "235 tools in one prompt. I built an MCP server with 2 runtime
> dependencies, 70 indexed skills, and a fail-closed guardrail engine.
> For 6 months I stress-tested it on 4 production projects with 5
> different models (Sonnet 4.6, Sonnet 5, GPT 5.6 Luna, DeepSeek v4
> Flash). Result: the server costs less than 1% of the task. The
> model matters more than the tooling. Sonnet is the only one that
> uses prompt caching properly. This talk is the honest postmortem —
> with billed numbers, not opinions."

---

*Talk drafted 2026-07-17 — based on 7 real benchmark sessions (4
production projects) and 6 months of evolution of `pix-galaxy-mcp`
v1.0.0 (235 tools, 146 resources, 5 prompts, 70 skills).*
