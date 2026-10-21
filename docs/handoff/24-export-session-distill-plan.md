# 24 - Export session distill plan

- **Branch**: `feat/export`
- **Date**: 2026-10-21
- **Commit range**: `6967ac02..50f664cd` (3 commits before this handoff)
- **Audit / review / plan**: `docs/audits/export.md`, `docs/reviews/export.md`, `docs/plans/export.md`
- **Related branches**: `feat/decision-models` (decision-cache consumer), `feat/guardrails-evolution` (independent)

## What this session did

Architect interview for `/rule-export`, `/rule-export cleanup`, `/rule-keep`, and
restored `/rule-adr`. Design-only: no runtime code. Split earlier work left
decision-models on its own branch; this branch starts from `main` and owns the
export track.

### Commits (before this handoff file)

- `2be3d8b9` docs(plans): add export audit review and plan
- `11c2854b` chore(census): refresh architecture surface-counts digest
- `50f664cd` docs(handoff): include session 23 in the generated index

### Locked decisions

| Topic | Choice |
| ----- | ------ |
| Pipeline | scan sessions (CWD) → merge MCP telemetry → emit `.flight` → optional cleanup |
| Cache | export-owned **decision-cache** + tool-cache promote where safe |
| Agents v1 | pi / claude / codex / opencode only; others deferred with registry `reason` |
| Cleanup | hard delete after confirm; keep newest N ∪ current; env `RULE_MCP_EXPORT_KEEP_SESSIONS` default 5 |
| Dubious decisions | heuristic interview now writes pending/confirmed; hook short-circuit waits for decision-models |
| `/rule-adr` | restore as ADR via `rule_tool_process_adr` **plus** `/rule-keep` (product ADR required; undoes handoff 13 removal for this reason) |
| Base | `main` |

### Open review findings

EX-01..EX-04 high (cleanup safety, current-session identity, idempotent merge, schemaVersion vs DM-07).
EX-05..EX-08 medium. EX-09..EX-10 low. See `docs/reviews/export.md`.

## What not to undo

- Do not implement hook short-circuit on this branch before `feat/decision-models` consumes the decision-cache.
- Do not expand cleanup/usage to unsupported agents in v1.
- Do not soft-delete sessions; policy is hard delete after confirm.

## Next session first step

Start **Step 0** of `docs/plans/export.md`: session map API + current-session
detection tests for the four supported agents (no deletes yet).

### Resume Prompt

```prompt
Resume work on rule-mcp from `docs/handoff/24-export-session-distill-plan.md`.
Run `rule_tool_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The export audit/review/plan and the locked interview table record what was decided; do not re-ask answered questions.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.
First step: implement plan Step 0 on `feat/export` — session map list/sort and current-session detection for pi/claude/codex/opencode with failing tests first; no session deletes.
```
