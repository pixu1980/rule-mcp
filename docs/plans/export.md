# export plan

Status: `planned`

- **Role**: export v1
- **Date**: 2026-10-21
- **Execution branch**: `feat/export` from `main`
- **Depends (doc)**: `feat/decision-models` consumes decision-cache; no merge required for export v1 ship

Steps re-derived from [the review](../reviews/export.md). Mark `[x]` when done.

## Goal

Ship a unified distill pipeline and commands:

1. `/rule-export` — session map → merge MCP telemetry → emit `.flight` → mine
   caches (decision + tool) with heuristic interview for dubious decisions
2. `/rule-export cleanup` — same + hard-delete sessions outside
   `(newest N ∪ {current})` after confirm
3. `/rule-keep` — write one `confirmed` decision into decision-cache
4. `/rule-adr` — `rule_tool_process_adr` + offer/run `/rule-keep`

Runtime hook short-circuit from decision-cache is **out of scope** until
decision-models lands.

## Dependency graph

Branch: feat/export
Path: docs/plans/export.md
Depends on: -
Feeds: `decision-models` (ORDER): it consumes the decision-cache this plan defines; export v1 ships without the runtime hook
Shared files: `docs/handoff/HANDOFF.md`, `tests/fixtures/census.json`, `docs/02-architecture.md`, `docs/16-surface-map.md`

The lines above are this plan's node in the cross-branch graph, verified from
`docs/plans/plan-of-plans.md` on `feat/evolution`. The workstreams below are the
order of the export work itself.

```
WS-0  session map adapters (list/sort/identify current)     EX-02
  |
  +--> WS-1  idempotent telemetry merge + stats parity      EX-03
  |       |
  |       +--> WS-2  flight emit policy (keep vs drain)     EX-07
  |
  +--> WS-3  decision-cache store + schemaVersion           EX-04, EX-08
  |       |
  |       +--> WS-4  /rule-keep + export interview           EX-08
  |       |
  |       +--> WS-5  /rule-adr restore (+ product ADR)       EX-05
  |
  +--> WS-6  cleanup hard-delete + env keep-N               EX-01, EX-06
  |
  +--> WS-7  tool-cache promote (promotable only)           EX-09
  |
  +--> WS-8  surface map, env docs, privacy, census         EX-10
```

## Env

| Variable                              | Default | Meaning                                                                             |
| ------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `RULE_MCP_EXPORT_KEEP_SESSIONS` | `5`     | Newest sessions retained on cleanup (current always retained even if outside top N) |

Honor `RULE_MCP_NO_CACHE` for cache writes like other caches.

## Decision-cache contract (export-owned)

Path: under `~/.rule-mcp/projects/<slug>/` (exact filename in WS-3;
not in the consumer git tree).

Minimum record:

- `schemaVersion`
- `fingerprint` (alignable with DM-07: model id + questions + state + shortlist)
- `choice` / payload
- `status`: `pending` | `confirmed` | `rejected`
- `source`: `rule-keep` | `rule-export-interview` | `rule-adr`
- `agent`, `project`, timestamps

DM-07 later: read + invalidate on model/shortlist change; may move
`confirmed` → `rejected` after revalidation.

## Agent policy v1

Supported end-to-end: **pi, claude, codex, opencode**.

All other `AGENT_TRANSCRIPTS` entries: report `skipped` + existing `reason`;
never delete.

## Steps

- [ ] **Step 0 - EX-02 (high)**: Session map API per supported agent
  - [ ] 0.1 Failing tests: list sessions for a fixture project, oldest→newest
  - [ ] 0.2 `current` detection per agent; if ambiguous, flag `currentUnknown`
  - [ ] 0.3 Gate: unit tests green; no deletes yet
- [ ] **Step 1 - EX-03 (high)**: Idempotent telemetry merge
  - [ ] 1.1 Failing tests: two exports → stats unchanged on second run
  - [ ] 1.2 Merge transcript-derived fields into MCP telemetry store with digests
  - [ ] 1.3 `/rule-stats` / `rule_tool_stats` read the merged truth
  - [ ] 1.4 Gate: stats suites + new merge suite
- [ ] **Step 2 - EX-07 (medium)**: Flight emit in the pipeline
  - [ ] 2.1 Document and test `keep` vs drain when invoked from `/rule-export`
  - [ ] 2.2 Recommendation: default `keep: true` for distill-only; optional drain flag later
  - [ ] 2.3 Gate: flight export suites still green; no accidental drain in default path
- [ ] **Step 3 - EX-04, EX-08 (high/medium)**: Decision-cache store
  - [ ] 3.1 Schema + persistence + `schemaVersion`
  - [ ] 3.2 Status transitions pending↔confirmed↔rejected
  - [ ] 3.3 Gate: store suite; `NO_CACHE` honored
- [ ] **Step 4 - interview + `/rule-keep`**
  - [ ] 4.1 Heuristics: ADR writes, `rule_tool_process_adr`, conflicting choices, explicit markers
  - [ ] 4.2 `/rule-export` interviews dubious → write pending/confirmed/discard
  - [ ] 4.3 `/rule-keep` writes confirmed directly
  - [ ] 4.4 Gate: prompt defs + tool/handler tests; no hook short-circuit
- [ ] **Step 5 - EX-05 (medium)**: Restore `/rule-adr`
  - [ ] 5.1 Product ADR: returns because it binds ADR + decision-cache keep
  - [ ] 5.2 Prompt def: drive `rule_tool_process_adr`, then `/rule-keep`
  - [ ] 5.3 Update contract/census/surface-map counts
  - [ ] 5.4 Gate: prompt contract tests, docs-accuracy
- [ ] **Step 6 - EX-01, EX-06 (high)**: Cleanup
  - [ ] 6.1 Keep-set = newest `N` ∪ `{current}`; `N` from env
  - [ ] 6.2 Confirm gate; refuse if `currentUnknown`
  - [ ] 6.3 Hard delete only outside keep-set; unsupported agents untouched
  - [ ] 6.4 Gate: temp HOME fixtures per agent; never touch real home in CI
- [ ] **Step 7 - EX-09 (low)**: Tool-cache promote
  - [ ] 7.1 Only existing promotable entries / rules
  - [ ] 7.2 Gate: tool-cache suites unchanged floors
- [ ] **Step 8 - EX-10 (low)**: Docs / privacy / census
  - [ ] 8.1 `docs/05-env-variables.md`, `docs/16-surface-map.md`, privacy note on session delete
  - [ ] 8.2 Point DM plan/review at export decision-cache as source of truth for durable choices
  - [ ] 8.3 Gate: `pnpm census:check`, docs-accuracy, full foundations

## Kill criteria

- If current-session detection cannot be made safe for an agent, that agent's
  **cleanup** stays disabled (usage/merge may still ship).
- If merge cannot be proven idempotent in tests, `/rule-export` ships
  report-only (no store write) until fixed.
- If decision-cache fingerprint cannot be aligned with DM-07 draft, ship store
  with `schemaVersion: 1` and an explicit adapter note — do not invent a second
  incompatible cache on the DM branch.

## Command UX (agent-facing)

```
/rule-export              # distill + interview; no session delete
/rule-export cleanup      # distill + confirm + hard delete outside keep-set
/rule-keep                # confirm one decision into decision-cache
/rule-adr                 # ADR via rule_tool_process_adr, then keep offer
/rule-stats               # unchanged reader; must reflect merged telemetry
```

## Out of scope

- Hook short-circuit (decision-models)
- Soft delete / undo
- Unsupported agent adapters
- Merging `feat/guardrails-evolution` or `feat/decision-models` into this branch

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step           | Class      | Model            | Why                                       |
| -------------- | ---------- | ---------------- | ----------------------------------------- |
| the whole plan | `T3-rules` | `kimi-k2.7-code` | the export path is code and configuration |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.
