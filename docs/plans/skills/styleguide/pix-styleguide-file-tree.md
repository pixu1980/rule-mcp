# rule-styleguide-file-tree - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, twenty-second skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-file-tree/SKILL.md` (51 lines): the convention, the
  reason for the underscore, and the checking note.
- `skills/rule-styleguide-file-tree/guardrails/`: `barrel-exports-match-files`,
  `barrel-file-tree`, `component-export-check`, `component-file-prefix`,
  `component-folder-barrel`.
- `src/core/file-tree/`: the scan, the fix, the rename, the barrel
  regeneration and the generator.
- `docs/plans/skills/styleguide/rule-styleguide-naming.md`, which decided to move
  the tree diagram and the seven structural rules here.

Public sources verified in this session:

- Node packages, `exports`, https://nodejs.org/api/packages.html
- Node ESM, https://nodejs.org/api/esm.html
- TypeScript `paths`, https://www.typescriptlang.org/tsconfig/#paths
- MDN modules, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

Local articles: the architecture pieces mention folder structure in passing.
They stay context only; the convention is this repository's own.

Problems found:

| Problem                             | Detail                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------- |
| the prose is thinner than the rules | five guardrails and two tools behind 51 lines                              |
| the tree lives in the wrong skill   | naming still carries it, and the naming plan moves it here                 |
| the tools are one sentence          | the scan, the fix and their human boundary are not documented              |
| missing topics                      | tests versus fixtures, `public/`, `dist/`, monorepo layout, aliases        |
| standards are not cited             | `package.json#exports` and module resolution are the reasons barrels exist |

## Decisions

| Question       | Decision                                                                             |
| -------------- | ------------------------------------------------------------------------------------ |
| Scope          | The tree, the layouts, the special folders, the barrels, the tools and the standards |
| Boundary       | Naming owns the name; this skill owns where it lives and what it exports             |
| Diagram        | A rectangular ASCII box, so the fingerprint rule holds                               |
| Missing topics | Tests versus fixtures, generated files, `public/`, exports, aliases                  |
| Tools          | Documented: what the check reports, what the fix repairs, what stays human           |
| Standards      | Node `exports`, Node ESM, TypeScript `paths`, MDN modules                            |
| Guardrails     | Single HTML entry, test placement, depth, orphan stylesheet, untouched `dist/`       |
| Severity       | Advisory first; the five existing rules keep their behavior                          |
| Fix scope      | Rename and create barrels; an orphan stylesheet is reported, never deleted           |
| Verification   | An annotated tree fixture, idempotence, report completeness, the corpus              |
| Delivery       | Plan only now                                                                        |

## Workstream A - Receive the tree

The tree diagram and the seven structural rules arrive from
`rule-styleguide-naming`. The diagram is a rectangular ASCII box, because the
fingerprint pass fails a box whose right edge steps in and out. The rules keep
their numbering and their examples.

## Workstream B - Layouts

1. Flat layout: a small project, one level of folders.
2. Feature folders: one folder per domain, each with its own components,
   helpers and tests.
3. The signal that a layout stopped paying: a feature needs another feature's
   internals, or a folder becomes a bucket of unrelated files.

## Workstream C - Special folders

1. `src/` holds the code, `public/` holds the files served verbatim, and the
   distinction is stated once.
2. `__tests__/` holds tests, and fixtures live beside the test that uses them.
3. `dist/` and generated files are never edited by hand; the header says so.
4. The single `index.html` entry rule moves here from naming.

## Workstream D - Barrels and resolution

1. A barrel is the folder's public surface; `package.json#exports` is the same
   idea at the package boundary, and the skill links the Node documentation.
2. Aliases (`@/`) and relative imports are two answers to the same question;
   the alias is preferred where the tooling supports it, and the skill links the
   TypeScript `paths` reference.
3. The barrel must re-export exactly what the folder offers, which is what
   `barrel-exports-match-files` already checks.

## Workstream E - Monorepo layout

`apps/` and `packages/` are named, with a link to `rule-toolchain-pnpm` and
`rule-toolchain-turborepo`. This skill does not duplicate the workspace or task
configuration.

## Workstream F - The tools

1. `rule_tool_check` reports the drift: a missing barrel, an unprefixed component,
   an export that no longer matches, an orphan stylesheet, a depth that stands
   out.
2. The fix renames an unprefixed component and creates or fills a barrel. It
   never deletes a file and never guesses an orphan stylesheet, because both
   deletion and component creation are plausible repairs.
3. The generator and the scan are named with their entry points, so a reader can
   run them without reading the source.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall. The five existing
rules keep their behavior.

| Rule id                       | Rejects                                        | Tier | Source     |
| ----------------------------- | ---------------------------------------------- | ---- | ---------- |
| `file-tree-single-html-entry` | more than one `index.html` under `src/`        | A    | This skill |
| `file-tree-test-placement`    | a test file outside `__tests__/`               | A    | This skill |
| `file-tree-dist-untouched`    | a hand edit inside `dist/` or a generated file | A    | This skill |
| `file-tree-depth`             | a folder nested past the agreed depth          | B    | This skill |
| `file-tree-orphan-stylesheet` | a stylesheet with no component beside it       | B    | This skill |

The orphan stylesheet stays a report: the fix never deletes it.

## Verification

1. An annotated tree fixture with a component folder, a helper folder, tests and
   a barrel.
2. The fix run twice, asserting idempotence.
3. A report test that every kind of drift is named at least once.
4. A `good` and a `bad` snippet per new guardrail in the corpus.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the guardrails and the tools.
- [x] Verify the standards.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Receive the tree and the seven rules from the naming plan.
- [ ] Make the diagram a rectangular box.
- [ ] Add the layouts, the special folders, the barrels, the aliases and the
      monorepo layout.
- [ ] Document the scan and the fix, including the human boundary.
- [ ] Cite the standards behind the barrels and the resolution.

### Phase 2 - Guardrails

- [ ] Add the five rules with fixtures and a unit test each.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the fix boundary, since it decides how much an
      automated repair may do.

### Phase 3 - Verification

- [ ] Run the annotated tree fixture.
- [ ] Run the fix twice and confirm idempotence.
- [ ] Run the report completeness test.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test src/core/file-tree/__tests__/*.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The tree move depends on the naming plan; this plan performs the reception.
- The box must stay rectangular, because `fp-box-rectangular` runs on every tool
  result and would fail a diagram that drifts.
- No local article is cited; the convention is internal and the standards cover
  the resolution mechanics.
