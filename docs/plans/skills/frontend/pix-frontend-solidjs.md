# rule-frontend-solidjs - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#52`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: frontend, framework leaf. Sibling plans: `rule-frontend-vue` and
`rule-frontend-svelte` (same shape, same series), `rule-frontend-workers`,
`rule-frontend-template-engine`, the remaining leaves, and `rule-frontend`.

## Scope decisions (owner)

Inherited from the platform, meta and workers interviews, 2026-10-21:

| Question           | Decision                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of this pass | **Plan only**                                                                                                                             |
| Identity           | Thin body plus served references: the SolidJS patterns stay, the shared rules become pointers, the playbook moves out                     |
| Rule set           | **Create**: this leaf owns no guardrail and declares no `guardrails:` key, so the plan builds a set with one framework rule at its centre |
| Aux files          | The 10 files under `checklists/`, `knowledge/`, `prompts/` and `templates/` move into `references/` and get served                        |
| Scaffold block     | Fixed here and in the six other affected skills, one catalog-level item                                                                   |
| Shared owners      | `rule-styleguide-*` own markup, CSS, a11y; `rule-platform-web` owns budgets; `rule-frontend` owns the framework choice                       |
| Detection          | Both: section and table parsing, plus injected `fileList`                                                                                 |
| Fixtures           | Shared corpus pairs plus skill trees on disk                                                                                              |
| Flow               | Failing test first                                                                                                                        |
| Gates              | Skill suite, corpora, catalog clean, census, lint and typecheck, plus the scaffold and rule-id checks                                     |
| Commits            | One per phase                                                                                                                             |
| ADR                | Two for the whole area: the frontend family shape, the rule design                                                                        |
| Done               | The framework rule exists, the near-miss ids are fixed, the rules pass                                                                    |

## Evidence base (measured 2026-10-21)

`skills/rule-frontend-solidjs/SKILL.md` is **519 lines**, with **no
`guardrails/` folder and no `guardrails:` frontmatter key**: it is the only
frontend framework leaf with zero rules.

| Folder        | Files | Lines |
| ------------- | ----- | ----- |
| `checklists/` | 2     | 72    |
| `knowledge/`  | 1     | 224   |
| `prompts/`    | 4     | 109   |
| `templates/`  | 3     | 96    |

### Two of the seven rule ids it names do not exist

The Guardrails section lists seven ids. Checked one by one against the exported
sets:

| Named in the body       | Exists | Real id            |
| ----------------------- | ------ | ------------------ |
| `no-css-classes`        | yes    | -                  |
| `no-inline-styles`      | yes    | -                  |
| `semantic-html`         | yes    | -                  |
| `external-css`          | yes    | -                  |
| `jsdoc-required`        | yes    | -                  |
| `css-comments-required` | yes    | -                  |
| `a11y-test-required`    | yes    | -                  |
| `barrel-file`           | **no** | `barrel-file-tree` |
| `data-part`             | **no** | `data-part-naming` |

Nine names, two of them truncated near-misses. A reader who tries to run
`barrel-file` or `data-part` finds no rule, and nothing in the suite notices.
This is the same defect class as Svelte's invented `guardrail-*` prefix, in a
more subtle form: the near-miss is harder to spot than the wrong prefix.

The same section also points at `rule-styleguide -> comments.md`, `-> css.md` and
`-> a11y.md`, which do not exist: `skills/rule-styleguide/` contains only
`SKILL.md`.

### The scaffold block returns 335 lines

`## Guardrails` sits at line 175 and `## Project Scaffolding` at 185, so the
parser's end marker is searched after the start and the slice runs to the end of
the file: **335 lines returned**. One of the seven skills sharing this bug (the
full table is in `rule-frontend-vue`).

### Core Rules are copied

Six lines restate the shared markup and CSS rules. Nothing here is
Solid-specific: Solid's own rules are in the performance section, as patterns.

### The framework rule this leaf should own

The first of its ten patterns is "Never destructure props - use `props.X`
directly", because destructuring breaks Solid's reactivity. It is the same kind
of mistake as Vue's `:class` and Svelte's `class:`, and the only one of the
three that no rule checks. `solidjs-no-props-destructuring` is the rule this
leaf exists to own.

### Reach

| Door                       | State                                    |
| -------------------------- | ---------------------------------------- |
| `rule-frontend` area router | listed                                   |
| `rule` dispatcher           | listed                                   |
| Inbound links              | 2 in the area router, plus the templates |

## Target shape

The body keeps: the component pattern, the store-to-signals mapping, CSS
loading, state management, lists and conditionals, the barrel pattern, the ten
SolidJS patterns, and the forms section. Around 250 lines.

`references/` receives the file tree, the CSS loading detail, the performance
playbook, and the four folders moved as-is.

## The six rules

| id                                | Rejects                                                           | Reads                       | Tier | Today                     |
| --------------------------------- | ----------------------------------------------------------------- | --------------------------- | ---- | ------------------------- |
| `solidjs-no-props-destructuring`  | `function C({ a, b })` or `const { a } = props` in a component    | `code`                      | B    | n/a: no rules exist       |
| `solidjs-guardrail-ids-real`      | A rule id named in the body that no guardrails folder exports     | `code` + `context.ruleIds`  | B    | **red**: 2 of 9           |
| `solidjs-scaffold-terminated`     | A `## Project Scaffolding` block the parser cannot close          | `code`                      | B    | **red**: 335 lines        |
| `solidjs-aux-served`              | A companion file no surface reaches and the body does not declare | `context.fileList`          | B    | **red**: 10 files         |
| `solidjs-no-stale-file-ref`       | A reference to a file that does not exist                         | `code` + `context.fileList` | B    | **red**: three references |
| `solidjs-no-duplicate-core-rules` | A restatement of the shared markup and CSS rules                  | `code`                      | B    | **red**: six lines        |

## Phase 0 - Decisions

- [ ] ADR (area): the frontend family shape, shared with the other leaves.
- [ ] ADR (area): the rule design, Tier B, dual detection, and the
      rule-id-exists rule this leaf and Svelte both motivated.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/frontend-solidjs/`: `clean/`, `props-destructured/`,
      `near-miss-rule-ids/`, `unterminated-scaffold/`, `unserved-aux/`,
      `stale-file-ref/`, each with a one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-frontend-solidjs`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-frontend-solidjs/guardrails/`: six rule files plus
      `index.js`, the first rules this leaf has ever had.
- [ ] `guardrails:` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Fix the body's rule ids and links

- [ ] `barrel-file` becomes `barrel-file-tree`, `data-part` becomes
      `data-part-naming`.
- [ ] The three dangling references point at `rule-styleguide-comments`,
      `rule-styleguide-css` and `rule-styleguide-a11y`.
- [ ] Fix the scaffold block with the other six affected skills.

## Phase 4 - Split and serve

- [ ] Move the file tree, CSS loading and performance sections into
      `references/`; move the four folders under `references/` too.
- [ ] Core Rules collapse to one pointer line.
- [ ] Consume the served-references surface from `rule-platform-desktop`.

## Phase 5 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-solidjs/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Rule-id check across the catalog, and the scaffold check across all seven.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                        | Class       | Model                     | Why                            |
| ------------------------------------------- | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions                         | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red)              | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules                         | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Fix the body's rule ids and links | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 4 - Split and serve                   | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 5 - Verification                      | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-solidjs/guardrails/
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

- This leaf has zero rules while teaching a reactivity model that breaks
  silently when a prop is destructured. That is the strongest case in the area
  for a framework rule, and it is the only one of the three frameworks whose
  signature mistake has no rule at all.
- `solidjs-guardrail-ids-real` and `svelte-guardrail-ids-real` are the same
  shared rule with a per-skill id. If the area ADR decides shared rules live
  once, it becomes `guardrail-ids-real` and both leaves register it; the plans
  are written so either choice works.
- The near-miss ids matter more than the invented ones: `barrel-file` looks
  correct and is not. That kind of mistake survives every review that does not
  compare against the exports.
