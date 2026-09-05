# Handoff records

Session handoffs archived in this directory. Each numbered file is the paste-ready
record of one session; the newest number is the current one. Historical session
handoffs (07/08/10/11/13, dated 2026-07-15) documented remediation that is fully
implemented and recorded in the ADRs; they were retired so history lives in one
place — the ADR index (docs/adr/ADR.md) — instead of being repeated here.

## Current records

| # | File | Topic | Date |
| --- | --- | --- | --- |
| 09 | [09-census-and-handoff-autocommit.md](09-census-and-handoff-autocommit.md) | Census + handoff auto-commit | 2026-09-05 |

## Conventions

- **pnpm**, not npm; Node ≥20, ESM (`"type": "module"`).
- **Commit:** conventional commits with a mandatory scope (`type(scope): message`); the `commit-msg` hook rejects scope-less subjects.
- **Persistence rule:** a handoff exists as a file, not only in the chat — write
  `docs/handoff/<NN>-<slug>.md` (next free two-digit number) and commit it alone as
  `chore(handoff): add session handoff <NN>-<slug>`. Never push; commits stay local for review.

## Reference documents

- `docs/adr/ADR.md` — the living decision index (supersedes the retired reports/handoffs)
- `docs/reports/README.md` — audit history and the finding→ADR map
- `docs/07-census.md` — full MCP tool + slash-command census