# 25 - Merge of three skills into rule-mcp-process-ai

- **Branch**: `feat/guardrails-evolution`
- **Date**: 2026-10-21
- **Commit range**: `6b540b66..HEAD`
- **Plans**: `docs/plans/skills/DEPENDENCIES.md`, `docs/plans/skills/process/rule-mcp-process-ai.md`

## What this session did

Three skills folded into `rule-mcp-process-ai`, with their nine guardrails, their plans
and their index rows collapsing into one, and a dependency graph that puts that
skill first. Before that, twelve red gates were closed: the tracked governance
hooks were restored, `site-dist` stopped being tracked, and a machine-wide
`core.hooksPath` can no longer be adopted by the installer. One gate remains
red, the 150-line ratchet over five pre-existing files.

The decision-models audit, review, plan and probe harness moved to
`feat/decision-models` so this branch keeps the guardrails and skill-plan track.

### What the merge cost

Moving a body into `references/` removes it from the text the ranker indexes. The
routing corpus fell from 77 to 71 exact and a scope prompt lost its top route
until the scope contract and the house language were restated in `SKILL.md`. The
corpus is back to 76 exact and 89 top-or-alternative, above its floors.

### Commits (merge thread)

- `605f6f15` docs(plans): add the rule-mcp-process-tdd implementation plan
- `bca072ab` chore(docs): stop tracking the generated site
- `2956e5c3` fix(commit): never adopt a machine-wide core.hooksPath
- `e05fb191` fix(hooks): restore the tracked governance hooks
- `d1c34b8f` feat(skills): merge simplicity, English and fingerprint into rule-mcp-process-ai
- `7ad3a593` test(skills): guard that every area router lists its children
- `e9d4c945` docs(plans): one plan for rule-mcp-process-ai and the next two skills
- `71a3d906` docs(adr): record the merge into rule-mcp-process-ai

### Open, recorded in the plans

- `rule-mcp-process-ai` Phase 1-4: the eight guardrails the absorbed plans promised and
  never built (`ai-bidi-controls` blocking, seven advisory), the `-ogue` stem fix,
  the spelling-map gaps, and the reduction signal still undocumented.
- `rule-mcp-process-npm-release`: eight rules planned, none written, and the cooldown
  handed to `rule-mcp-toolchain-pnpm` beside `pkg-*`.
- `rule-mcp-process-code-review`: four rules planned, and three of them overlap what
  `validateTrio` already checks in this repository.
- Eight router rows are missing and recorded in `scripts/data/router-gaps.data.mjs`;
  the ratchet only shrinks.
- Decision-models workstreams: resume on `feat/decision-models`.

### Resume Prompt

This document: `docs/handoff/24-merge-into-rule-mcp-process-ai.md`.

```prompt
Resume work on rule-mcp from `docs/handoff/24-merge-into-rule-mcp-process-ai.md`. Run `rule_tool_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The ADR log and the context snapshot capture what has been decided; do not re-ask answered questions. ADR 148 records the merge, and ADR 147 the hooks boundary.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message, and `pnpm hooks:check` says whether the hooks are installed.
The merged skill is `rule-mcp-process-ai` with nine `ai-*` guardrails and the tool `rule_tool_process_ai`; the three skills it absorbed no longer exist, and a running server needs a restart before it serves the new catalog.
Decision-models (audit, plan, harness) live on `feat/decision-models`.
First step: run `pnpm test:all` and confirm the only red gate is the 150-line ratchet over five pre-existing files, then start `rule-mcp-process-changelog` (#31 in `docs/plans/skills/README.md`) unless the developer prefers closing that ratchet first.
```
