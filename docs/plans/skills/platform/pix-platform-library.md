# pix-platform-library - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#37`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: platform. Sibling plans: `pix-platform-web` (same thin-umbrella model),
`pix-process-adr`, `pix-process` (same guardrail shape).

## Scope decisions (owner, 2026-10-21)

| Question | Decision |
| -------- | -------- |
| Scope of this pass | **Plan only** |
| Identity | A thin umbrella that delegates: keep the package/API surface, hand the rest to its owner |
| Publishing | `pix-process-npm-release` owns it. The section here becomes one link |
| Changelog | `pix-process-changelog` owns it. The format block here becomes one link |
| Router row | Corrected here, in Phase 5: the platform router and the dispatcher both describe this skill as the publishing path |
| Rule set | Six rules, all Tier B (advisory) |
| Detection | Both: section parsing plus injected `fileList` |
| Fixtures | Shared corpus pairs plus skill trees on disk |
| Flow | Failing test first |
| Gates | Skill suite, corpora, catalog clean, owner coherence, census, lint and typecheck |
| Commits | One per phase |
| ADR | Two: the boundary, the rule design |
| Done | Contradictions resolved and rules green |

## Evidence base (measured 2026-10-21)

`skills/pix-platform-library/SKILL.md` is 258 lines, has no `guardrails/`, no
`references/`, no `guardrails:` frontmatter key, and **links none of the skills
whose content it restates**: `pix-process-npm-release`,
`pix-process-changelog`, `pix-styleguide-file-tree`, `pix-toolchain-pnpm`,
`pix-process-tdd` and `pix-styleguide-typescript` are each mentioned zero times.
The only two skill ids in the body are `pix` and `pix-platform`, both in See
also.

### What the body contains, and who owns each part

| Section | Owner today |
| ------- | ----------- |
| Core Rules (8 items) | `pix-styleguide-*`, `pix-toolchain-pnpm`, `pix-process-tdd` |
| Tree-Shaking and Bundle Size | **nobody else: keep** (library-specific) |
| File Tree Convention | `pix-styleguide-file-tree` |
| Package.json Structure, sub-path exports | **split**: the exports map is library-shaped, the pnpm fields are not |
| Monorepo Integration | `pix-toolchain-pnpm` (workspaces) with a library-specific consumer note |
| Public API Contract, barrel, deprecation | **nobody else: keep** |
| Build (dual ESM/CJS) | **nobody else: keep** |
| Testing | `pix-process-tdd` |
| Publishing | `pix-process-npm-release` |
| Changelog Format | `pix-process-changelog` |
| Quick Reference | derived from the above |

Kept content: the public API contract, dual ESM/CJS build, the exports map,
tree-shaking, and the monorepo consumer note. Everything else is a pointer.

### Two contradictions with the owners

1. **Publishing.** This skill ends its release flow with `pnpm publish` and the
   comment "Publish to pnpm" (four occurrences, one of them rendered inside the
   Quick Reference table). `pix-process-npm-release` says the opposite:
   publish with `npm` unless the package relies on `workspace:` or a
   `beforePacking` hook, use trusted publishing from CI, and reach for
   `pnpm stage publish` only in that case. "Publish to pnpm" is also factually
   wrong: pnpm publishes to the npm registry.
2. **Changelog.** This skill teaches writing `CHANGELOG.md` by hand ("Update
   CHANGELOG.md", then bump and publish). `pix-process-changelog` says the file
   is generated at the release tag from the commits, never formatted by hand,
   and belongs in the formatter's ignore list. The two cannot both be true.

### Reach

Three places point here and two of them route the wrong question:

| Where | Says |
| ----- | ---- |
| `pix-platform` table | "npm package" |
| `pix-platform` Quick Selection | "Need to publish an npm package? → `pix-platform-library`" |
| `pix` dispatcher | "Reusable library/package development ... pnpm package structure, public API design" |
| `pix-process-npm-release` See also | "Package structure and public API design for the thing being published" |

The last line is the correct boundary, and the neighbour already states it.

## The six rules

| id | Rejects | Reads | Tier | Today |
| -- | ------- | ----- | ---- | ----- |
| `library-no-local-publish` | A local publish step in a skill whose release is owned elsewhere | `code` | B | red: four `pnpm publish` lines |
| `library-changelog-generated` | Instructions to hand-write or hand-format `CHANGELOG.md` | `code` | B | red: the format block |
| `library-owner-named` | A delegated section that names no owner | `code` | B | red: 0 of 6 owners mentioned |
| `library-no-stale-skill-id` | A `pix-...` id in prose with no skill directory | `code` + `context.fileList` | B | clean: 2 of 2 resolve |
| `library-no-duplicate-file-tree` | A second copy of the one-barrel-per-folder convention | `code` | B | red: the File Tree Convention section |
| `library-semver-language` | Semver or deprecation vocabulary that disagrees with the release owner | `code` | B | clean today; the risk is the trim introducing a synonym |

## Phase 0 - Decisions

- [ ] ADR: the boundary. Release and changelog move out; the API contract,
      dual build, exports map and tree-shaking stay.
- [ ] ADR: the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/platform-library/`: `clean/`, `local-publish/`,
      `hand-written-changelog/`, `unnamed-owner/`, `duplicate-file-tree/`, each
      with a one-line `README.md` stating what it proves.
- [ ] Six `CORPUS` pairs in `tests/fixtures/guardrail-corpus.mjs` bound to
      `pix-platform-library`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/pix-platform-library/guardrails/`: six rule files plus
      `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Resolve the contradictions

- [ ] Delete the Publishing section; one line points at
      `pix-process-npm-release`.
- [ ] Delete the Changelog Format block; one line points at
      `pix-process-changelog`. The rule keeps the hand-written form from coming
      back.
- [ ] Delete the File Tree Convention section; one line points at
      `pix-styleguide-file-tree`, which already explains the underscore.
- [ ] Testing section points at `pix-process-tdd`; JSDoc requirements point at
      `pix-styleguide-typescript`.
- [ ] Core Rules collapse to what this skill actually owns, with the rest named
      by owner.

## Phase 4 - Keep the library-specific core

- [ ] Public API contract: deliberate exports, deprecation policy, breaking
      change rules.
- [ ] Dual ESM/CJS build: the real config, not a sketch.
- [ ] `exports` map and sub-path exports, with the condition order that makes
      them work.
- [ ] Tree-shaking: `sideEffects: false`, the barrel trade-off above ~50
      exports.
- [ ] Monorepo consumption note, pointing at `pix-toolchain-pnpm` for
      workspaces.
- [ ] Target: ~90 lines of kept content plus pointers.

## Phase 5 - Router and reach

- [ ] `pix-platform` row becomes "npm package structure, public API, dual
      ESM/CJS".
- [ ] `pix-platform` Quick Selection: publishing routes to
      `pix-process-npm-release`, package shape routes here.
- [ ] Dispatcher row regenerated from the new description.
- [ ] `pix-process-npm-release` See also keeps its line and gains the reverse
      link here.

## Phase 6 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/pix-platform-library/guardrails/`
- [ ] `_corpus` and `_routing-corpus` suites.
- [ ] Catalog scan with the six rules: only the documented duplication remains.
- [ ] Owner coherence: every owner named here says the thing it is cited for.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/pix-platform-library/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `pix-process-ai` (HARD)

Feeds: `pix-platform` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- The publishing contradiction is the one item here with a security
  consequence: a library skill that teaches `pnpm publish --access public` from
  a laptop routes around trusted publishing. Even at Tier B the rule earns its
  place, and the trim removes the instruction rather than rewording it.
- Rule `library-no-local-publish` will also fire on other skills that mention
  publishing. The catalog scan in Phase 6 reports them; fixing them is not this
  plan's scope, so the rule ships with the same grandfathering option the ADR
  plan uses if the hits are real.
- The Public API Contract section is the reason this skill survives the trim:
  nothing else in the catalog owns what the exported surface promises over
  time.
- Two contradictions removed, one neighbour corrected, six rules added, and the
  skill ends shorter than it started. That is the pattern the last two plans
  settled on; repeating it is the point.
