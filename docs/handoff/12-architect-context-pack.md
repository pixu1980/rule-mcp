# Handoff — `feat/architect-context-pack` (rule-architect consolidation)

_Generated 2026-07-30 with `pix_process_handoff`, augmented with the session narrative._

## Status at handoff

- **Branch:** `feat/architect-context-pack` → pushed to `origin`, upstream set. **Not merged.**
- **Ahead of `main`:** 52 commits (the entire P1–P8 consolidation — the branch was never merged, so all architect work lives here).
- **Open an MR:** https://gitlab.palmabit.cloud/rule/rule-mcp/rule-mcp/-/merge_requests/new?merge_request%5Bsource_branch%5D=feat%2Farchitect-context-pack
- **Tests:** full architect suite **87 pass / 0 fail**. Working tree clean.
- **Merge is a human decision** — see "Open items" for the two pre-existing CI reds that predate this branch.

## What the branch delivers

`rule-architect` turns a wizard interview into a `.context/` documentation pack. The consolidation (roadmap in `docs/superpowers/plans/…architect-plan{1,2,4,5,6,7,8}…`) took it from three divergent generator copies + a prototype-overfit output to one engine producing framework-neutral, cross-harness packs.

| Phase | Outcome |
|---|---|
| P1 | Unified 3 `.context/` generator copies → 1 (`skills/rule-architect/generator.mjs`). |
| P2 | Unified the wizard spec (`wizard-spec.json`) + the two `interview.js`; `detect.mjs` extracted; context-server serves the canonical UI **by path** (symlinks broke `pnpm pack`). |
| P4 | Placeholder fill 27% → 100% via `field-map.mjs` + `normalize.mjs` (RENAMES/COMPOSITION/DERIVED). |
| P5 | Lean + conditional output (`emitWhen`, empty-section policy, `raw` templates). |
| P6 | Canonical `AGENTS.md` fanned out to CLAUDE/GEMINI/.clinerules/Copilot/Cursor/Windsurf. |
| P7 | Live Summary/Files UI panel. |
| P8 | Framework-neutral pack prose (this session). |

## This session (2026-07-30)

Started from "review the architect work"; ended having closed the last two follow-ups, run a hardening sweep, and completed a new phase (P8). Newest commits first:

```
fc6b9a7 docs(architect): record P8 outcome
547fa97 feat(architect): P8 T2-T4 — framework-neutral pack prose
7e052fd feat(architect): P8 T1 — wizard fields for framework-neutral pack prose
624ee71 docs(architect): phase-8 plan — framework-neutral templates
20b3534 fix(architect): unwrap inline-code TODO markers (cosmetic)
90e64bd fix(architect-web): escape error/summary/target sinks (XSS)
769fcbb fix(architect): cap interview-server request bodies (413)
823ed06 fix(architect): detect or stay silent — stop fabricating prefill values
4be5a79 fix(architect): substitute answer values literally, not as $-patterns
43fbfee fix(architect): harden interview servers — traversal, bind, CORS (F7)
dbdb999 feat(architect): guard root entry files from silent overwrite (F10)
```

### F10 — root-file overwrite guard (`dbdb999`)
`generateContext` wrote 7 root entry files into the project root, clobbering a hand-authored `CLAUDE.md`/`AGENTS.md`. Now: existing root file → **skip + report**; overwrite only on `--force` (CLI) / `force:true` (web). `.context/` stays architect-owned (always regenerated). Guarded per-file. **User decisions locked.**

### F7 — interview-server hardening (`43fbfee`)
Both servers (`rule-architect-web/server.mjs` + the MCP-spawned `assets/context-server.mjs`): path-traversal containment (`static-file.mjs` `containWithin`), bind `127.0.0.1` (`BIND_HOST`, was all-interfaces), dropped wildcard CORS. Main-guarded auto-listen + exported `createServer`/`BIND_HOST` for tests. Verified via real spawn (loopback serves, LAN unreachable, no leak).

### Hardening sweep (high-confidence, full branch diff) — 5 fixes
1. **`$`-substitution corruption** (`4be5a79`): `replaceAll(ph, str)` interpreted `$&`/`$$`/`` $` ``/`$'` in answers → function replacement.
2. **detector fabrication** (`823ed06`): `detectProjectValues` returned 27 fixed TTRPG/Electron values for *any* project (even empty). Rewrote to detect-or-stay-silent (PROJECT_NAME + lockfile-based pkg manager only).
3. **unbounded POST body** (`769fcbb`): `collectBody` caps at 2 MiB → 413.
4. **4 residual XSS sinks** (`90e64bd`): error/summary/target → innerHTML now `esc()`-wrapped.
5. **backtick cosmetic** (`20b3534`): `` `[KEY]` `` unfilled no longer renders literal marker underscores.

### P8 — framework-neutral pack prose (`624ee71`, `7e052fd`, `547fa97`, `fc6b9a7`)
The pack no longer asserts the prototype's vanilla-JS/Custom-Elements/Parcel stack as fact (a React project's README used to say "pure vanilla JavaScript only"). Grounding showed most content was already collected; only **3 new single-subfield repeatables** added (`ARCHITECTURE_PRINCIPLES`, `TECH_CONSTRAINTS`, `GUIDANCE_LINKS`). 7 templates de-overfit to answer-driven placeholders (`[BROWSER_SUPPORT]`, `[BUILD_COMMAND]`, `[STACK_CSS_APPROACH]`, `[ARCH_PRINCIPLE_*]`, working `[GUIDANCE_LINK_*]` refs replacing dead skill links). New CI gate `architect-framework-neutral.test.mjs`. Fill-coverage 100% (143/143), golden regenerated. **User decisions locked** (framework-neutral, answer-driven, new fields).

## Locked design decisions (do NOT reopen)

- F10: guard **root files only**; `.context/` always regenerated; skip-if-exists + `--force`.
- F7: full hardening (containment guard + loopback bind + no wildcard CORS).
- P5: `emitWhen` gate on `PROJECT_TYPE` (weak-proxy trade-off accepted).
- P8: framework-neutral = neutral across *frameworks*; the rule **methodology** (zero CSS classes, semantic HTML, external CSS, pnpm exact, `./src`, English) stays as correct defaults.

## Open items / next

1. **Merge decision** — the branch is ready but unmerged; that's a human call.
2. **Project-structure overfit (out of P8 scope):** some templates still carry `./src/scripts/services/…`-style *structure* assumptions in non-gated prose. Stack-neutral is done; structure-neutral would be a separate follow-up.
3. **Pre-existing CI reds, NOT from this work** (reproduce identically on `main`): `rule-styleguide-a11y: missing See also` aborts full `node --run ci`; `docs-architect` "≤6 root docs, found 8". These predate the branch.
4. **`architect-ui.test.mjs`** needs the Playwright runner + a live server (`ARCHITECT_WEB_URL`); it fails under `node --test` (wrong runner) and is **not in `ci`** by design.
5. **`pix_check` on the architect `.mjs`** files: a repo-wide block-spacing style gap fails identically on untouched code, and `jsdoc-required` is a confirmed **false positive** (fires on functions that have full JSDoc). Not a per-change regression — don't churn style to chase it.

## How to verify / resume

```sh
# architect suite (excludes the Playwright UI test, which is not in ci)
node --test test/architect-*.test.mjs test/context-server-*.test.mjs
# render a pack to eyeball quality
node -e 'import("./skills/rule-architect/generator.mjs").then(async g=>{ \
  const fs=await import("node:fs"); \
  const spec=JSON.parse(fs.readFileSync("skills/rule-architect/wizard-spec.json")); \
  g.generateContext({PROJECT_NAME:"Demo",PROJECT_TYPE:"webapp",FRONTEND_FRAMEWORK:"react"}, spec, "/tmp/demo-pack"); })'
```

Golden snapshot is authoritative for output; regenerate intentionally with `UPDATE_ARCHITECT_SNAPSHOT=1 node --test test/architect-golden-snapshot.test.mjs` and review the manifest diff.

## Reference

- Roadmap/plans: `docs/superpowers/plans/2026-07-*-architect-plan{1,2,4,5,6,7,8}-*.md`
- Design spec: `docs/superpowers/specs/2026-07-29-architect-context-pack-and-ui-design.md`
- ADR log: `pix_process_adr` / `docs/adr` (33 ADRs; the architect work is captured in the plan docs above rather than ADRs).
