# export audit

- **Role**: export v1
- **Focus**: session distill / decision-cache
- **Date**: 2026-10-21
- **Branch target**: `feat/export` (from `main`)
- **Related**: `feat/decision-models` (consumer of decision-cache, WS-5 / DM-07)

## Scope

Design-only audit for `/rule-mcp-export`, `/rule-mcp-export cleanup`, `/rule-mcp-keep`, and
the restored `/rule-mcp-adr` (ADR + keep). No implementation in this pass.

## What exists today

### Agent transcripts (usage only)

`src/core/agents/transcripts/_registry.js`, `AGENT_TRANSCRIPTS`:

| Agent                           | Usage read | Session roots (project-scoped)                                                               |
| ------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| pi                              | yes        | `~/.pi/agent/sessions/<pi-slug>/` (JSONL per session)                                        |
| claude                          | yes        | `~/.claude/projects/<claude-slug>/` (JSONL per session)                                      |
| codex                           | yes        | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` (filter `session_meta.cwd`)                   |
| opencode                        | yes        | `~/.local/share/opencode/storage/message/` (JSON per message; project via `path.root`/`cwd`) |
| copilot, cursor, windsurf, vibe | no         | documented `reason`; no usage schema                                                         |

Helpers: `filesUnder`, `readJsonl`, `slugsFor`, windowing in `_window.js`.
Readers aggregate **usage tallies**; they do **not** yet expose a first-class
session list/map, nor delete APIs.

### MCP telemetry + flight

- Store/recorder/KPI under `src/core/telemetry/`
- `exportFlight` (`flight/_export.js`): builds `.flight` from **MCP events**,
  writes `~/.rule-mcp/projects/<slug>/exports/*.flight`, then **drains**
  the event log unless `keep: true`
- Flight already pulls agent usage into the envelope (usage suites for
  pi/claude/codex/opencode)
- `/rule-stats` -> `rule_tool_stats` (KPI: calls, cache hits, tokens, latency)
- `/rule-usage` -> sidecar when no transcript

### Caches

- **Tool-cache**: `src/core/cache/tool-cache/` (+ CLI `src/cli/cache/`)
- **BM25 cache**, catalog cache, separate concerns
- **Decision-cache**: absent on `main`. Planned on `feat/decision-models` as
  DM-07 deterministic cache (model id + questions + state + shortlist digest)

### Commands / ADR surface

- `/rule-mcp-adr` **removed** from MCP prompt registry (handoff 13): duplicated
  `rule-mcp-process-adr` / `rule_tool_process_adr`
- `rule_tool_process_adr` remains the ADR engine
- No `/rule-mcp-export`, `/rule-mcp-keep`

### Installer agent set

Wizard/installers cover many hosts; transcript **usage** coverage is the four
above. Installed-manifest at
`~/.local/share/rule/installed.md` is the install truth; export v1
still gates on transcript capability, not merely "MCP installed".

## Gaps (for the plan)

1. No session map (list -> sort -> id/mtime/path) per agent
2. No merge path that **idempotently** folds transcript-derived telemetry into
   the MCP store before/while flight emit
3. No decision-candidate mining or interview UX
4. No decision-cache store owned by export
5. No session hard-delete / keep-N / protect-current
6. `/rule-mcp-adr` restore needs a product ADR (why it returns, how it differs from
   bare `rule_tool_process_adr`: it carries `/rule-mcp-keep`)
7. `exportFlight` drain semantics vs "export may run often", re-export must
   not double-count; cleanup of **agent** sessions != drain of MCP events

## Locked product decisions (interview)

| #                 | Decision                                                          |
| ----------------- | ----------------------------------------------------------------- |
| Pipeline          | scan -> merge telemetry -> emit `.flight` -> optional cleanup     |
| Cache             | new decision-cache (export-owned) + tool-cache promote where safe |
| Agents v1         | pi/claude/codex/opencode only; others deferred with reason        |
| Cleanup           | hard delete after confirm; keep newest N **∪** current session    |
| Dubious decisions | heuristic triage + interview now; hook short-circuit waits for DM |
| Env               | `RULE_MCP_EXPORT_KEEP_SESSIONS` default `5`                       |
| Base              | `main`                                                            |
