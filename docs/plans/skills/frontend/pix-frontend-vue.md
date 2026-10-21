# rule-frontend-vue - plan

Status: plan only, 2026-10-21. Index row `#48`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: frontend, framework leaf. Sibling plans: `rule-frontend-workers` (same
series), the other framework leaves, and `rule-frontend` (the area router).

## Scope decisions (owner)

Inherited from the platform, meta and workers interviews, 2026-10-21:

| Question | Decision |
| -------- | -------- |
| Scope of this pass | **Plan only** |
| Identity | Thin body plus served references: the Vue-specific patterns stay, the shared rules become pointers, the performance playbook moves out |
| Existing guardrails | **Extend, do not replace**: this skill already owns `vue-no-class-binding`, and the plan adds five rules around it |
| Aux files | The 10 files under `checklists/`, `knowledge/`, `prompts/` and `templates/` move into `references/` and get served |
| Scaffold block | Fixed here and in the six other affected skills, as one catalog-level item |
| Shared owners | `rule-styleguide-*` own markup, CSS, a11y; `rule-frontend` owns the framework choice; `rule-platform-web` owns budgets |
| Rule set | Six rules including the existing one, all Tier B (advisory) |
| Detection | Both: section and table parsing, plus injected `fileList` |
| Fixtures | Shared corpus pairs plus skill trees on disk |
| Flow | Failing test first |
| Gates | Skill suite, corpora, catalog clean, census, lint and typecheck, plus the scaffold check |
| Commits | One per phase |
| ADR | Two for the whole area: the frontend family shape, the rule design |
| Done | The scaffold block is terminated, the aux files are served, and the rules pass |

## Evidence base (measured 2026-10-21)

`skills/rule-frontend-vue/SKILL.md` is **508 lines**, with a `guardrails/` folder
that exports exactly one rule, and 10 auxiliary files under four folders.

| Folder | Files | Lines | Destination |
| ------ | ----- | ----- | ----------- |
| `checklists/` | 2 | 90 | `references/` |
| `knowledge/` | 1 | 245 | `references/` |
| `prompts/` | 4 | 113 | `references/` |
| `templates/` | 3 | 115 | `references/` |

### The scaffold block returns 315 lines

`src/core/scaffold/_parser.js` starts at `## Project Scaffolding` and stops at
`## Guardrails`. In this file `## Guardrails` is at line 183 and
`## Project Scaffolding` at line 194, so the end marker is searched after the
start, is never found, and the slice runs to the end of the file.

Measured across the catalog: **7 skills** have this shape, and the parser
returns between 231 and 466 lines for each:

| Skill | Lines returned |
| ----- | -------------: |
| `rule-frontend-vue` | 315 |
| `rule-frontend-react` | 466 |
| `rule-frontend-angular` | 327 |
| `rule-frontend-svelte` | 325 |
| `rule-frontend-solidjs` | 335 |
| `rule-meta-astro` | 347 |

This is one parser-contract bug with seven victims, not seven mistakes. The
fix belongs in a shared phase, and the rule below is what keeps it fixed.

### Core Rules are copied

Seven lines restate rules the inherited sets already own. Two of them are
already enforced by inherited rules, verified by running the check engine:

```
scoped <style> in a .vue file -> FAIL: external-css (covered by rule-styleguide-css)
:class binding             -> FAIL: vue-no-class-binding, data-part-naming
```

So rule 6 ("no scoped `<style>` blocks") and the CSS rules are enforced
elsewhere; the copy adds no coverage, only a second place to edit.

### The auxiliary files are unserved

Same finding as `rule-platform-desktop` and `rule-frontend-workers`:
`src/resources/_read.js` serves `SKILL.md` and nothing else, and `readSkill()`
reads one file. 10 files, 563 lines, unreachable through the rule surface.

### Reach

| Door | State |
| ---- | ----- |
| `rule-frontend` area router | listed |
| `rule` dispatcher | listed |
| Inbound links | 9 links from other skills |

Reach is fine here: this leaf has doors. What it lacks is a consumer for its
companion files.

## Target shape

The body keeps: the SFC pattern with external CSS, the store-to-reactive
mapping, lists and conditionals, state management, the barrel pattern, the ten
Vue patterns, and the forms section. Around 250 lines.

`references/` receives the file tree, the CSS loading detail, the performance
playbook, and the four folders moved as-is.

## The six rules

| id | Rejects | Reads | Tier | Today |
| -- | ------- | ----- | ---- | ----- |
| `vue-no-class-binding` | `:class` or `v-bind:class` | `code` | B | existing, keep |
| `vue-no-duplicate-core-rules` | A restatement of the markup and CSS rules | `code` | B | **red**: seven lines |
| `vue-scaffold-terminated` | A `## Project Scaffolding` block the parser cannot close | `code` | B | **red**: 315 lines returned |
| `vue-aux-served` | A companion file no surface reaches and the body does not declare | `context.fileList` | B | **red**: 10 files |
| `vue-owner-named` | A delegated section naming no owner | `code` | B | partially red |
| `vue-no-stale-skill-id` | A `rule-...` id with no skill directory | `code` + `context.fileList` | B | clean |

## Phase 0 - Decisions

- [ ] ADR (area): the frontend family shape. One framework leaf per framework,
      each owning its component model and its patterns; shared markup, CSS and
      a11y rules stay in `rule-styleguide-*`.
- [ ] ADR (area): the rule design, Tier B, dual detection, and the shared
      scaffold-termination item.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/frontend-vue/`: `clean/`, `core-rules-restated/`,
      `unterminated-scaffold/`, `unserved-aux/`, `unnamed-owner/`, each with a
      one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-frontend-vue`, including the existing
      `vue-no-class-binding` pair if it is missing.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] Add the five new rules beside `_vue-no-class-binding.js`.
- [ ] `guardrails:` frontmatter gains the new ids, equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Fix the scaffold contract, catalog-wide

- [ ] Move `## Project Scaffolding` above `## Guardrails` in the seven affected
      skills, or give the scaffold block an explicit end marker the parser
      reads.
- [ ] Assert in the suite that each extracted block is shorter than 60 lines
      and contains no See-also link.
- [ ] This is one commit touching seven skills, and it is the item this plan
      shares with the astro, react, angular, svelte, solidjs and
      solidjs plans.

## Phase 4 - Split and serve

- [ ] Move the file tree, CSS loading and performance sections into
      `references/`; move the four folders under `references/` too.
- [ ] Consume the served-references surface planned in `rule-platform-desktop`;
      if it is dropped, declare the files in the body instead.
- [ ] Core Rules collapse to one pointer line.

## Phase 5 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-vue/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Scaffold extraction check across all seven affected skills.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-vue/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- This is the first leaf in the series that already owns a guardrail, so the
  plan extends a set instead of creating one. The existing rule is good: it
  targets a Vue-only mistake (`:class`), which is exactly what a framework leaf
  should own.
- The scaffold bug is worth more than the trim. A tool that promises a scaffold
  block and returns 315 lines teaches the reader to distrust the output, and
  the same bug affects the most-used framework skills in the catalog.
- `knowledge/vue-performance-playbook.md` (245 lines) is the same shape as the
  Astro playbook: a performance review methodology that no surface serves and
  that overlaps `rule-platform-web`'s budget ownership. It stays, as a served
  reference, because the budget table is not the methodology.
