# Port complete — final evidence

**Migration:** `rule-mcp` (upstream) → `rule-mcp` (this repository), as a
rule-native additive union.

- **Upstream pinned commit:** `12d60a9e0eb312010314e5b800e31cf71663d926`
- **Bridge record:** ADR 041 (`docs/adr/041-port-the-complete-rule-evolution-as-a-rule-native-additive-union.md`)
- **Parity contract:** `test/porting-parity.test.mjs` + `test/fixtures/rule-porting-baseline.json`

## Verified surface (item 28)

| Surface | Committed | Verified at close |
|---------|-----------|-------------------|
| Skill directories | 94 | 94 (93 `rule-*` + hub `rule`) |
| Tools (`listTools()`) | 110 | 110 |
| Resources (`rule://`) | 194 | 194 |
| Prompts (`listPrompts()`) | 34 | 34 |
| Source runtime files | all 43 | 0 missing |
| Source scripts | all 9 | 0 missing |
| Source tests + fixtures | all 61 | 0 missing |
| Public namespace leakage (`rule` in tool/prompt/env names) | 0 | 0 |
| Foundations suite | — | **307/307 passing** |
| Lint errors | 0 | 0 |

Routing corpus: 80/99 exact, 99/99 top-or-alternative (source BM25 numbers
reproduced, ADR 048). docs-scan: 0 stale references, persona trio clean.

## Code-graph health (item 29)

- **Quality signal:** 7128 (`tokensave_health`)
- **Modularity:** 0.998 (573 components after hub removal)
- **Depth:** 1.0 (max chain 9/10)
- **Redundancy:** 0.965 (56 dead fns out of 1615 — registry/test helpers, no
  runtime reachable dead code)
- **Acyclicity:** 0.698 — one structural SCC centered on the router hub
  (`src/tools/router.js`) plus the target-only `rule-frontend-vanilla-reactive`
  examples mirror; the hub is the MCP server pattern, present before the port,
  not introduced by it.
- **Unsafe patterns:** 1 match, a `.expect()` inside a skill's doc example
  (`skills/rule-platform-desktop/SKILL.md`), not server code.
- Equality (god-file) signal is the pre-existing gini of the router/guardrail
  files; no new regressions attributable to the port.

## Accepted deviations

1. `rule_tool_gateway` is advertised as read-only (receipts are in-memory).
2. The four target-only skills (`custom-element`, `template-engine`,
   `vanilla-reactive`, `platform-auth`) are real routing targets; the
   routing-corpus thresholds are measured on the source-commensurate universe
   (`RULE_MCP_SKILL_UNIVERSE=base`, see `TARGET_ONLY_SKILLS` in
   `src/tools/router.js`).
3. Tool-surface budget raised with documented notes as the union grew
   (22,500 → 26,000).
4. CHANGELOG.md is generated from commits (`scripts/build-changelog.mjs`), not
   hand-maintained (documented inside the file).
5. `docs/adr/ADR.md` is the single generated index (README.md + DECISIONS.md
   merged into it); regenerate with `rule_tool_process_adr`.

## Atomic commit sequence (this port)

Run `git log --reverse <phase-start>..HEAD` — the sequence is
phase-scoped: foundations (1-2) → cache (3) → telemetry (4) → guardrails (5) →
CLI/transports/installer (6-8) → surface locks (9-13) → skills union (14-17) →
scripts/supply-chain (18-20) → test parity + evidence (21-23) → upstream
archival + docs (24-27) → verification + this report (28-30).

## Handoff

- Live dev server: `http://127.0.0.1:3003` (SSE, auth-gated, 401 = live).
- Restart: `PORT=3003 RULE_MCP_PORT=3003 node ./bin/rule-mcp.js serve --transport sse --port 3003`
- Companion repo `rule-mcp-architect` (standalone web app + SDK) is out of
  scope for this migration; its plan doc (`docs/plans/wizard-reborn-plan.md`)
  belongs to that repository's history and was preserved.
- Release/tagging intentionally left outside the migration.