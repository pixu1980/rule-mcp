# rule-frontend-template-engine - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#50`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: frontend, leaf. Sibling plans: `rule-frontend-workers`,
`rule-frontend-vue` (same series), the remaining framework leaves, and
`rule-frontend` (the area router).

## Scope decisions (owner)

Inherited from the platform, meta and workers interviews, 2026-10-21:

| Question | Decision |
| -------- | -------- |
| Scope of this pass | **Plan only** |
| Identity | The one leaf in the area that ships runnable code: the procedure stays, the assets become served references, and the install step is checked |
| Assets | `assets/` and `REFERENCE.md` move under `references/` and get served; the 8 test files join the suite that runs skill-local tests |
| Shared owners | `rule-styleguide-html` owns markup rules; `rule-frontend-custom-element` is gone (ADR 152), so the engine is the only template path left |
| Reach | Fixed here: the last `ROUTER_GAPS` entry for the frontend area |
| Rule set | Six rules, all Tier B (advisory) |
| Detection | Both: section and table parsing, plus injected `fileList` |
| Fixtures | Shared corpus pairs plus skill trees on disk |
| Flow | Failing test first |
| Gates | Skill suite, corpora, catalog clean, census, lint and typecheck, plus the asset checks |
| Commits | One per phase |
| ADR | Two for the whole area: the frontend family shape, the rule design |
| Done | The gap entry is gone, the assets are served and checked, and the rules pass |

## Evidence base (measured 2026-10-21)

`skills/rule-frontend-template-engine/SKILL.md` is **193 lines**, with a
companion `REFERENCE.md` (136 lines), an `assets/` tree carrying a working
template engine (expression parser, filters, renderer, tagged runtime, four
example projects) and one installer script.

### The only frontend leaf with no door from its area

`scripts/data/router-gaps.data.mjs` still lists
`"rule-frontend": ["rule-frontend-template-engine"]`: it is the last entry for
that area. The `rule` dispatcher does list it, so the leaf is reachable from the
top and not from the area it belongs to.

### It is also the only leaf outside the measured routing universe

`src/tools/router/_skills.js` keeps `TARGET_ONLY_SKILLS = {template-engine,
platform-auth}`. With `RULE_MCP_SKILL_UNIVERSE=base` - the setting the
routing corpus uses - this skill is invisible to BM25, because its body would
dilute the pinned term frequencies. So its routing quality has never been
measured, by construction, and after ADR 152 it is the only exclusion left on
the frontend side.

### The shipped code is unchecked in the same way the workers examples were

| Check | State |
| ----- | ----- |
| Asset tests run in CI | **no**: the `skills` suite globs them, but that suite is not part of `all` (the same finding as `rule-frontend-workers`) |
| Linted | **no**: `pnpm lint` covers `bin/ src/ tests/` |
| Guardrails | **no**: the self-guardrails test scans `src/` |
| Served | **no**: `serveResource` reads `SKILL.md` only, so `REFERENCE.md`, the engine and the four examples are unreachable through the rule surface |
| Installer script verified | **no**: `scripts/install-template-engine.mjs` is named in the body and referenced by no test |

The eight asset test files do pass when run by hand (102 tests, verified while
retiring the custom-element skill), which is the point: they pass and nothing
runs them.

### Shape

This is the most procedural skill in the catalog: `Outcome`, `Inputs`,
`Resources`, `Decision flow`, `Procedure`, `Completion criteria`. It reads like
a runbook, and that is a feature: an agent can follow it. The plan does not
turn it into a knowledge document.

## Target shape

The body keeps: outcome, when to use, directives, inputs, decision flow,
procedure, tagged-literal usage, project layout, integration points, completion
criteria. Around 140 lines, with every asset behind a served reference.

`references/` receives:

| Reference | From today |
| --------- | ---------- |
| `REFERENCE.md` | moved as-is |
| `assets/template-engine/` | engine, filters, renderer and its 8 test files |
| `assets/tagged-runtime/` | the browser-safe runtime |
| `assets/examples/` | the four example projects |
| `scripts/install-template-engine.mjs` | the installer, byte for byte |

## The six rules

| id | Rejects | Reads | Tier | Today |
| -- | ------- | ----- | ---- | ----- |
| `engine-assets-served` | An asset no surface reaches and the body does not declare | `context.fileList` | B | **red**: `REFERENCE.md`, engine, examples |
| `engine-assets-tested` | A shipped engine asset with no test in the suite | `context.fileList` | B | **red**: the suite never runs in CI |
| `engine-listed-in-area` | A frontend leaf missing from the `rule-frontend` table | `code` | B | **red**: the last gap entry |
| `engine-installer-verified` | An installer script named in the body with no test or dry-run check | `code` + `context.fileList` | B | **red** |
| `engine-owner-named` | A delegated section naming no owner | `code` | B | partially red |
| `engine-no-stale-skill-id` | A `rule-...` id with no skill directory | `code` + `context.fileList` | B | clean |

## Phase 0 - Decisions

- [ ] ADR (area): the frontend family shape, shared with the other leaves; this
      leaf is the one that ships code, and the ADR says so.
- [ ] ADR (area): the rule design, Tier B, dual detection, and the asset rules
      this leaf motivated.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/frontend-template-engine/`: `clean/`, `unserved-assets/`,
      `untested-assets/`, `area-unlisted/`, `unverified-installer/`, each with
      a one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-frontend-template-engine`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-frontend-template-engine/guardrails/`: six rule files plus
      `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Check the shipped code

- [ ] Wire the `skills` suite into `all` (the same item as the workers plan),
      so the 8 asset tests run in CI.
- [ ] Add the installer script to a check that runs it against a temp directory
      and asserts the expected files land.
- [ ] Add `skills/**/assets/**/*.js` and `skills/**/scripts/*.mjs` to a lint
      scope, or to the example-lint script the workers plan introduces.
- [ ] Fix whatever the first run of those checks reports. Expect some: nothing
      has looked at this code.

## Phase 4 - Serve, then trim

- [ ] Move `assets/` and `REFERENCE.md` under `references/`; consume the
      served-references surface planned in `rule-platform-desktop`.
- [ ] Remove the `TARGET_ONLY_SKILLS` entry once the routing corpus has been
      re-measured with this body in the universe, or record why it stays.
- [ ] Body trimmed to the runbook plus pointers.

## Phase 5 - Open the door

- [ ] `rule-frontend` table row and Quick Selection line.
- [ ] Delete `"rule-frontend"` from `scripts/data/router-gaps.data.mjs`
      entirely: it is the last entry for the area.

## Phase 6 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-template-engine/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Asset checks: the 8 test files, the installer dry run, the lint scope.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-template-engine/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_router-child-coverage.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD), `rule-platform-desktop#3` (CONTRACT)

Feeds: `rule-frontend` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- This skill ships more code than most of `src/`: an expression parser, a
  filter set, a renderer, a tagged runtime and four example projects, none of
  it linted, guardrailed or run in CI. That is the same blind spot the workers
  plan found, and this leaf is where it matters most because the code is
  presented as installable.
- The `TARGET_ONLY_SKILLS` exclusion is defensible (pinned thresholds) and also
  a way to never measure a skill. If the corpus is re-measured, this is the
  first entry to revisit; if it is not, the exclusion should say why in one
  sentence instead of relying on a comment.
- After ADR 152 removed the custom-element skill, this is the only template
  path in the catalog. That raises the stakes on its tests, not lowers them.
