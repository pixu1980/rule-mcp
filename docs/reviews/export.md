# export review

- **Role**: export v1
- **Focus**: architect review of export design
- **Date**: 2026-10-21
- **Audit**: [export audit](../audits/export.md)

## Findings

| ID    | Severity | Status | Source            | Finding                                                                                                                                                       |
| ----- | -------- | ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-01 | high     | open   | audit             | Cleanup deletes host agent session files. Must be confirm-gated, keep-set = newest N ∪ current, never silent, never touch unsupported agents                  |
| EX-02 | high     | open   | audit             | "Current session" identity differs per agent (open JSONL, MCP session id, opencode sessionID, codex rollout path). Ambiguity => refuse delete of unclear rows |
| EX-03 | high     | open   | audit             | Telemetry merge must be idempotent (content/window digests). Re-running `/rule-mcp-export` must not inflate `rule_tool_stats`                                 |
| EX-04 | high     | open   | audit + DM-07     | Decision-cache schema is owned by export but consumed by decision-models. `schemaVersion` + fingerprint contract required before DM short-circuit             |
| EX-05 | medium   | open   | handoff 13        | Restoring `/rule-mcp-adr` reopens a surface deliberately removed as duplicate; justify via ADR+keep coupling                                                  |
| EX-06 | medium   | open   | registry          | Unsupported agents must appear in the export report as skipped-with-reason; no partial delete                                                                 |
| EX-07 | medium   | open   | flight/_export.js | Default `exportFlight` drains MCP events. Export pipeline must choose `keep` vs drain explicitly and document interaction with agent-session cleanup          |
| EX-08 | medium   | open   | interview 6.A+B   | Heuristic interview can write `confirmed` entries that DM later rejects; status machine needs `pending`/`confirmed`/`rejected` and DM revalidation            |
| EX-09 | low      | open   | tool-cache        | Promoting transcript tool results into tool-cache is easy to get wrong (non-idempotent tools). Restrict to existing promotable rules                          |
| EX-10 | low      | open   | privacy docs      | Session delete and flight redact policies must stay aligned with `docs/06-privacy.md`                                                                         |

## Severity summary

- high: 4 (EX-01..EX-04)
- medium: 4 (EX-05..EX-08)
- low: 2 (EX-09..EX-10)

## Non-goals (v1)

- Transcript usage or cleanup for cursor/copilot/windsurf/vibe
- Hook short-circuit from decision-cache (blocked on `feat/decision-models`)
- Soft-delete / trash / undo for sessions (hard delete after confirm only)
