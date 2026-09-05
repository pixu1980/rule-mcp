# Handoff 02: flight recorder v2, project-scoped state, two roadmap plans

- **Branch**: `feat/evolution`
- **Covers**: `57c6dda..3ce200b` (4 commits, this session) on top of `bc28218`
- **Date**: 2026-09-03
- **CI**: `pnpm run ci` green at head (842 checks; note `pnpm ci` is a clean install, always use `pnpm run ci`)

## What landed (committed, local only — nothing pushed)

| Commit                      | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `57c6dda` `feat(paths)`     | `~/.rule-mcp/{state,data,config}` replaces the three XDG dirs; `migrateLegacyHome()` one-shot on any CLI entry; `getProjectPaths()`/`findProjectRoot()` → per-project `./.rule-mcp/`                                                                                                                                                                                                                                                                                                                                |
| `2aa41b6` `feat(telemetry)` | Flight recorder v2 (ADR 069): per-call result/args bytes + token estimates, prompt verbatim (default ON, `RULE_MCP_NO_PROMPTS=1` reverts), guardrail failures per rule, core-vs-final pair (+`reminderOverhead`), project-scoped log drained by export. One `.flight` v2 = timeline + kpi + usage + project + prompts. Usage read from agent transcripts (pi/claude/codex/opencode, verified on real files, window-scoped, peak=max never sum); `pix_usage` declared fallback, transcript always wins. Tool count 106 |
| `8f0e13a` `feat(init)`      | `rule-mcp init` (recorder dir + gitignore rule + `tokensave init`); global git hooks (post-checkout/post-merge, marker `rule-mcp: keep-project-dir-ignored`, chained to repo hooks, beside tokensave's); CLI `telemetry export/show/prune`; uninstall strips blocks + purges legacy dirs                                                                                                                                                                                                                            |
| `3ce200b` `docs(project)`   | ADR 069 (supersedes 046's privacy clause), docs updated, **two plans in `docs/plans/`**                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## The two plans (deliverables, execution NOT started by decision)

1. **`docs/plans/2026-09-03-security-privacy-ai-hardening.md`** — 19 findings, 25 steps, 5 phases.
   Reds: ReDoS **67 s measured** (`checkCode` on 200 KB adversarial input, event loop blocked); **10 prod vulns** transitive via SDK 1.30.0 (fast-uri/hono/qs).
   Decisions locked: ReDoS full-depth (cap+rewrite+worker), auto-update → **notify-only default**, flight `--redact` share variant, execution only on explicit pickup. Phase 0 = one sitting (4 steps).
2. **`docs/plans/2026-09-03-review-personas.md`** — expert personas registry (template-driven).
   14 roles: core 7 active (architect, security, privacy, a11y, ai-engineer, performance, **docs-engineer** — added by addendum, absorbs tech-writer), 7 proposed. Naming: `/rule-prompts-<role>`, `/rule-plan-<role>`, skill `rule-review-<role>`, tool `pix_plan`. Overlays embedded < user < project (project layer needs trust gate, shared with hardening 4.4). One operation = audit→review→plan trio at stable paths `docs/{audits,reviews,plans}/<role>.md`, written/updated/deleted per invocation.

## Traps the next session must not rediscover

- Tests that fake the clock and call `callTool` MUST set `RULE_MCP_NO_TELEMETRY=1` — telemetry is project-scoped now, NOT covered by `RULE_MCP_STATE_DIR` (see `gateway-cache-receipt.test.mjs`).
- Agent transcript shapes (verified): pi nests under `message` and has a third role `toolResult`; Claude tool results are `type:"user"` rows with `tool_result` content blocks (196 vs 3 real prompts); codex `token_count` is CUMULATIVE (assign, never sum), model on `turn_context`; opencode user messages carry no `path` — attribute via session dir. Memory file: `flight-recorder-paths.md`.
- Guardrail false positives on the repo's own source are a known baseline (`jsdoc-required`, `js-single-line-method`, `js-blank-lines-blocks`) — fix is hardening step 4.1, don't chase them per-file.
- `process-hygiene.test.mjs` → "serve shuts down on a signal" is flaky ~1/3 (pre-existing; hardening step 4.6).
- Adding an action tool moves THREE committed assertions: `minimal-tools` count, `skill-surface-embedded-only` ACTION set, `tool-surface-budget`.

## Next steps (in order of leverage)

1. Hardening Phase 0 (0.1 input cap, 0.2 dep bumps + audit gate, 0.3 hook quoting, 0.4 notify-only auto-update) — all parallel, one sitting.
2. Then 1.1→1.2 (ReDoS closed) and 2.1 (`--redact`) in parallel.
3. Personas Phase A (registry) when wanted — A.1→A.3 unblocks all four surfaces.

## Conventions

- Conventional Commits **with mandatory scope** (`type(scope): subject`) — the `commit-msg` hook rejects scope-less.
- All docs/code in English; pnpm only; exact versions; `pnpm run ci` before claiming green.
- ADR via `pix_process_adr` for every default change (0.4, 2.1, 3.1, C.4 already scheduled in the plans).
