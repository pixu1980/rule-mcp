# docs-engineer audit

- **Role**: docs-engineer v1
- **Date**: 2026-09-05

Evidence only: the commands this run executed with their measured values, the files it read,
the sources it consulted. No opinions - those belong in the review.

## Evidence

| What was measured | How | Result |
| --- | --- | --- |
| F1 — Paths documented in the env handbook vs resolved at runtime | `grep -n \.rule-mcp docs/06-env-variables.md` (rows 76-80, 24) vs `src/cli/paths.js:61` | Handbook documents `~/.rule-mcp/projects/<project>/{telemetry.jsonl, telemetry-rollup.json, usage.json, project-id, exports/*.flight}`; runtime resolves stateDir to `~/.local/state/rule-mcp` (override `RULE_MCP_STATE_DIR`) |
| F2 — Handbook dead links | Node link-walk over `docs/*.md` | 2 broken: `docs/README.md -> ./adr/README.md`, `docs/README.md -> ./adr/DECISIONS.md`; `docs/adr/` contains `ADR.md` (60 files), no README.md/DECISIONS.md; handbook table lists 01-06, no 07-census.md |
| F3 — ADR numbering collisions | `ls docs/adr/*.md | grep -oE "/[0-9]{3}-" | sort | uniq -c | awk '$1>1'` | Duplicates: 001-006 ×2, 007-009 ×2-3, 010-012 ×2 (upstream-ported series + native series overlap); `docs/adr/ADR.md` lists a subset |
| F4 — Duplicate agent instructions | `ls docs/*.md` + `diff docs/agent-instructions.md docs/05-agent-instructions.md` | `docs/agent-instructions.md` (unnumbered) and `docs/05-agent-instructions.md` both exist; content diverges (old tool names, no gateway in unnumbered file) |
| F5 — ADR front-matter drift | `grep -L "^- \*\*Date" docs/adr/*.md` + `grep -L "Author" docs/adr/*.md` + status-casing sweep | 30+ legacy files lack the modern front-matter block; 16 lack `Author`; mixed casing `**Status**: Accepted` vs `accepted`; ADR 018 edited to `superseded` but not reflected in `ADR.md` index |
| F6 — Prompt-recording claim | `grep -n "\.rule-mcp" docs/06-env-variables.md` row 24 | Row 24 says prompt text is recorded into "the project's own `.rule-mcp/`" — contradicts the runtime stateDir (same root cause as F1) |
| Baseline (guardrails that already pass) | `node test/docs-accuracy.test.mjs`, `node test/docs-scan.mjs` | docs-accuracy 5/5 vs 61-prompts surface; docs-scan ALL CLEAN (0 stale `pix_` references in live docs) |
