# Handoff 03: hardening executed, personas shipped, the command surface grown

- **Branch**: `feat/evolution`
- **Covers**: `ebedcb2..HEAD` (this session) on top of handoff 02
- **Date**: 2026-09-04
- **Nothing pushed.** All commits are local.
- **CI**: `pnpm run ci` green at head (exit 0), including the new self-guardrail gate.

## What this session did

Picked up both approved plans and executed them, plus the command-surface work
that came out of the conversation.

### Security, privacy and AI hardening (`docs/plans/2026-09-03-security-privacy-ai-hardening.md`)

Phases 0, 1 and 2 are complete; 3 and 4 are complete except the four steps the
plan's own status table lists as open. Highlights:

- **ReDoS closed end to end**: 256 KiB input cap, the catastrophic patterns
  rewritten (**67 s reproducer now 22 ms**), a corpus test with a hard time
  budget in ci, and server-side checks running in a killable worker.
- **Dependencies**: 10 production vulnerabilities to 0, overrides pinned
  exactly, a parsing audit gate blocking in ci, lifecycle scripts blocked.
- **Auto-update is notify-only** (ADR 071). `RULE_MCP_AUTO_UPDATE=merge`
  restores the old forced fast-forward.
- **Privacy**: `telemetry export --redact`, retention for `exports/`,
  `docs/privacy.md`, ADR 046 marked superseded in part.
- **The repo passes its own guardrails** (ADR-worthy in itself): 79 of 79
  failing files to 0, ten rule bugs fixed with paired tests, and
  `test/self-guardrails.test.mjs` blocking in ci.

### Review personas (`docs/plans/2026-09-03-review-personas.md`)

Phase A and most of B are in: a 14-role registry (7 active), overlays
(project > user > embedded), one template, the `pix_plan` tool, one prompt
per active role, and the agent commands the generator derives from them.
ADR 072 records the design and the naming deviation.

### Command surface

23 commands to 35: five operations that only had a CLI
(`/rule-adr`, `/rule-check`, `/rule-flight`, `/rule-init`,
`/rule-update`) plus seven `/rule-plan-<role>` personas.

### The numbering doctor

`rule-mcp handoff doctor` repairs ADR and handoff numbers after parallel
branches merge - the problem raised mid-session. It orders documents by the
commit that created them, keeps the earliest holder of each number, and moves
the rest including every reference. Reports and exits non-zero by default so it
works as a merge gate; `--fix` applies.

## New defaults a reader must know

| Default                             | Was                             | Now                                        | Escape hatch                       |
| ----------------------------------- | ------------------------------- | ------------------------------------------ | ---------------------------------- |
| Auto-update                         | forced fast-forward within 60 s | notify-only, merge on request              | `RULE_MCP_AUTO_UPDATE=merge` |
| Dependencies policy in the reminder | not stated                      | exact pins at the latest release (ADR 070) | `RULE_MCP_LOOSE_DEPS=1`      |
| `pix_check` input               | unbounded                       | refused above 256 KiB                      | none - split the input             |
| Guardrail checks on a server        | inline                          | worker thread with a timeout               | CLI stays inline                   |
| Failed auth on SSE/HTTP             | 401, unlogged                   | rate-limited, 429, one audit line each     | none                               |

## Traps for the next session

- **`git checkout -- src/` wiped uncommitted rule fixes once.** Commit before
  running any revert; the guardrail work is easy to lose and expensive to redo.
- **Structural JS guardrails now read masked source** (string and template
  contents blanked). A rule that legitimately needs string contents must be in
  `MASK_LITERALS_EXEMPT` with its reason.
- **`test/self-guardrails.test.mjs` blocks ci**: any new file under `src/` has
  to pass the guardrails. The five excluded files are catalogs of
  counterexamples, each with its reason in the test.
- **Tool results pass through caveman compression**, which drops articles: an
  assertion on returned text must match the substance, not the filler.
- **The three surface assertions still move together** when a tool is added:
  `minimal-tools` count, `skill-surface-embedded-only` ACTION set,
  `tool-surface-budget`.
- **The audit gate is `scripts/audit-gate.mjs`, not `pnpm audit` directly**: the
  raw command exits non-zero for a network error as well as for a finding, so
  the gate parses the report - findings fail, an unreachable endpoint warns and
  passes. A warning line is not a clean result.

## Next, in order of leverage

1. **Hardening 4.2 (reminder diet)** then 4.3 (caveman efficacy): the flight
   recorder measures ~0 saved against ~460 tokens/session of reminder. That
   contradiction is now documented and still unresolved.
2. **Personas C.2** (`pix_plan_docs`) so the audit/review/plan trio is kept
   by a deterministic helper rather than by model discipline, then C.3 gates.
3. **Personas B.5** (`roles` CLI) and **D.1** (project-overlay acceptance).
4. **Hardening 4.5**: guardrail precision/recall corpus, now that the rules
   have been through ten fixes and deserve a regression net.
5. **The router command rename** (`/rule-mcp` to `/rule`) and the
   `tdd`/`write-tests` overlap: proposed in conversation, not executed, needs an
   ADR that updates 029.

## Conventions

Conventional commits **with a mandatory scope**; `pnpm run ci` (never
`pnpm ci`); English everywhere; exact pins at the latest release; an ADR for
every default change.
