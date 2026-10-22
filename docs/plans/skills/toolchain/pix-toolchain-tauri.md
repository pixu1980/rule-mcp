# rule-toolchain-tauri - plan

Status: `planned`
Notes:`planned`

Notes: new skill, created by `rule-platform-desktop` phase 4 (ADR 152's ghost plugins). Index row `#87`, planned.

Area: toolchain, leaf. It takes the Tauri material that today sits inside
`rule-platform-desktop` as a second framework under an Electron-shaped umbrella.
Siblings: `rule-toolchain-electron`, the eight build tool leaves, `rule-toolchain`.

## Evidence base (measured 2026-10-21)

`rule-platform-desktop` documents Tauri in four places, all of them reachable only
by reading 808 lines:

| Section | Content |
| ------- | ------- |
| Tauri Patterns | IPC with Rust commands, frontend invocation, `tauri.conf.json` |
| Auto-Update | the built-in updater and its plugin config |
| Code Signing | the signing path shared with the desktop build |
| Protocol Handling | deep links in `tauri.conf.json` |

The same file advertises `rule-platform-desktop/tauri` as a skill plugin, and no
such plugin, skill or directory exists. This plan is that plugin, named in the
area the owner chose.

## The four rules

| id | Rejects | Tier | Today |
| -- | ------- | ---- | ----- |
| `tauri-command-allowlisted` | A Rust command reachable without an explicit allowlist entry | B | n/a |
| `tauri-csp-configured` | A `tauri.conf.json` with no CSP | B | n/a |
| `tauri-update-signed` | An updater configured without signature verification | B | n/a |
| `tauri-owner-named` | A section delegating packaging, signing or CI without naming the owner | B | n/a |

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-toolchain` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions

- [ ] ADR: the desktop family shape, shared with `rule-toolchain-electron`: one
      leaf per runtime, the umbrella keeps the choice.

### Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/toolchain-tauri/`: `clean/`, `open-command/`,
      `no-csp/`, `unsigned-update/`, each with a one-line `README.md`.
- [ ] Four `CORPUS` pairs bound to `rule-toolchain-tauri`.
- [ ] Suites written and watched to fail with "rule not found".

### Phase 2 - The rules

- [ ] `skills/rule-toolchain-tauri/guardrails/`: four rule files plus `index.js`.
- [ ] `guardrails:` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

### Phase 3 - The skill

- [ ] `skills/rule-toolchain-tauri/SKILL.md`: Rust commands, config, updater,
      deep links, plus the migration note from Electron.
- [ ] `rule-platform-desktop` phase 4 drops the moved sections and links here.

### Phase 4 - Wire it in

- [ ] `rule-toolchain` router row.
- [ ] `src/core/detector/_rules.data.js`: `tauri` maps here.
- [ ] `rule-platform-desktop` roadmap line for Neutralinojs keeps no path.

### Phase 5 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-toolchain-tauri/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Fixtures first (red) | `T4-tests` | `deepseek-v4.1-flash` | test writing at the cheap end |
| Phase 2 - The rules | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 3 - The skill | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 4 - Wire it in | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 5 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Open notes

- Tauri has one measured mention in the whole catalogue today, all of it inside
  `rule-platform-desktop`. That is the honest demand signal: this leaf exists so
  the umbrella can stop pretending to be two runtimes at once.
- If the Tauri material does not survive the move, the alternative is to delete
  it and let the umbrella say "Electron only" (see the plan's own note on the
  ghost plugins). This plan assumes it survives.
