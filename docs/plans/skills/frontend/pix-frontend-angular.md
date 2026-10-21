# rule-frontend-angular - plan

Status: plan only, 2026-10-21. Index row `#55`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: frontend, framework leaf and the last leaf before the area router.
Sibling plans: `rule-frontend-vue`, `rule-frontend-svelte`,
`rule-frontend-solidjs`, `rule-frontend-react` (same shape),
`rule-frontend-workers`, `rule-frontend-template-engine`, and `rule-frontend`.

## Scope decisions (owner)

Inherited from the platform, meta and workers interviews, 2026-10-21:

| Question | Decision |
| -------- | -------- |
| Scope of this pass | **Plan only** |
| Identity | Thin body plus served references: the Angular patterns and the signal mapping stay, the playbook and the forms material move out |
| Existing guardrails | **Extend, do not replace**: the skill owns `angular-no-ngclass`; the plan adds rules around it, including one for a core rule that nothing enforces |
| Contradiction | The CSS Modules question is decided for the whole area, in the React plan's ADR line, and applied here too |
| Aux files | The 10 files under `checklists/`, `knowledge/`, `prompts/` and `templates/` move into `references/` and get served |
| Scaffold block | Fixed here and in the six other affected skills, one catalog-level item |
| Shared owners | `rule-styleguide-*` own markup, CSS, a11y; `rule-platform-web` owns budgets; `rule-frontend` owns the framework choice |
| Rule set | Seven rules including the existing one, all Tier B (advisory) |
| Detection | Both: section and table parsing, plus injected `fileList` |
| Fixtures | Shared corpus pairs plus skill trees on disk |
| Flow | Failing test first |
| Gates | Skill suite, corpora, catalog clean, census, lint and typecheck, plus the scaffold and rule-id checks |
| Commits | One per phase |
| ADR | Two for the whole area: the frontend family shape, the rule design |
| Done | The invented ids are gone, the unenforced core rule has a rule, and the set passes |

## Evidence base (measured 2026-10-21)

`skills/rule-frontend-angular/SKILL.md` is **496 lines**, with a `guardrails/`
folder exporting exactly one rule, and 10 auxiliary files.

| Folder | Files | Lines |
| ------ | ----- | ----- |
| `checklists/` | 2 | 70 |
| `knowledge/` | 1 | 249 |
| `prompts/` | 4 | 111 |
| `templates/` | 3 | 113 |

### Eleven invented rule ids, all prefixed

The `## Guardrails (Testable Assertions)` checklist names eleven ids, every one
of them `guardrail-*`:

```
guardrail-no-css-classes, guardrail-no-inline-styles, guardrail-semantic-html,
guardrail-external-css, guardrail-barrel-file, guardrail-data-part,
guardrail-no-framework-css, guardrail-angular-specific,
guardrail-jsdoc-required, guardrail-css-comments-required,
guardrail-a11y-test-required
```

The engine exports 70 ids and none starts with `guardrail-`. This is the same
defect as `rule-frontend-svelte`, in the same words, in a different skill:
whoever wrote one checklist copied it to the other.

### A core rule nothing enforces

Core Rule 7 is "Standalone components - no NgModules, `standalone: true`". No
rule anywhere in the catalog mentions `NgModule`: grepping the guardrail
folders returns nothing. The skill's second-strongest claim about how Angular
should be written is unenforced, while its weakest claims have rules.

### The CSS Modules contradiction, again

This skill's `guardrail-no-framework-css` line says "no CSS Modules". The
engine allows them, and its own rule description says so:

```
external-css rule text: "... or framework-native imports (Angular styleUrls,
Svelte <style>, CSS Modules or plain import for React/Solid)."

import styles from "./a.module.css";   -> PASS
@Component({ styleUrls: ["./a.css"] }) -> PASS
<div [ngClass]="x">                    -> FAIL: data-part-naming, angular-no-ngclass
```

So the skill forbids what the checker documents as allowed. The React leaf has
the same contradiction; the area ADR decides it once for both.

### The scaffold block returns 327 lines

`## Guardrails (Testable Assertions)` prefix-matches the parser's end marker at
line 156, before `## Project Scaffolding` at 170, so the slice runs to the end
of the file: **327 lines returned**. One of the seven skills with this bug.

### Core Rules

Seven lines: five shared with every framework leaf, plus two that are
Angular's own (`styleUrls` as the CSS mechanism, standalone components). The
duplication is the five; the two are the reason this leaf exists.

### Reach

| Door | State |
| ---- | ----- |
| `rule-frontend` area router | listed |
| `rule` dispatcher | listed |
| Inbound links | the area router and the ui skills |

## Target shape

The body keeps: the component pattern, the signal mapping, CSS loading,
`@`-syntax lists and conditionals, the barrel pattern, the ten Angular patterns,
and the forms section. Around 250 lines.

`references/` receives the file tree, the CSS loading detail, the performance
playbook, the forms detail, and the four folders moved as-is.

## The seven rules

| id | Rejects | Reads | Tier | Today |
| -- | ------- | ----- | ---- | ----- |
| `angular-no-ngclass` | `[ngClass]` instead of `[attr.data-part]` | `code` | B | existing, keep |
| `angular-no-ngmodule` | An `@NgModule` in a standalone-components codebase | `code` | B | n/a: no rule exists |
| `angular-guardrail-ids-real` | A rule id named in the body that no guardrails folder exports | `code` + `context.ruleIds` | B | **red**: 11 of 11 |
| `angular-css-modules-consistent` | A body that forbids what the engine's rule documents as allowed | `code` | B | **red** |
| `angular-scaffold-terminated` | A `## Project Scaffolding` block the parser cannot close | `code` | B | **red**: 327 lines |
| `angular-aux-served` | A companion file no surface reaches and the body does not declare | `context.fileList` | B | **red**: 10 files |
| `angular-no-duplicate-core-rules` | A restatement of the shared markup and CSS rules | `code` | B | **red**: five lines |

## Phase 0 - Decisions

- [ ] ADR (area): the frontend family shape, shared with the other leaves.
- [ ] ADR (area): the rule design, Tier B, dual detection, the rule-id rule, the
      CSS Modules verdict, and a rule per framework's signature mistake.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/frontend-angular/`: `clean/`, `ngmodule/`,
      `invented-rule-ids/`, `css-modules-contradiction/`,
      `unterminated-scaffold/`, `unserved-aux/`, each with a one-line
      `README.md`.
- [ ] Seven `CORPUS` pairs bound to `rule-frontend-angular`, including the
      existing `angular-no-ngclass` pair if it is missing.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] Add the six new rules beside `_angular-no-ngclass.js`.
- [ ] `guardrails:` frontmatter gains the new ids, equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Fix the checklist and the contradiction

- [ ] The eleven `guardrail-*` ids become real ids, or the checklist goes and
      the section points at `rule-styleguide-css`, `-html`, `-a11y`, `-comments`.
- [ ] The three `rule-styleguide -> *.md` references become links to the skills.
- [ ] Apply the CSS Modules verdict from the area ADR here and in the React leaf.
- [ ] Fix the scaffold block with the other six affected skills.

## Phase 4 - Split and serve

- [ ] Move the file tree, CSS loading, performance and forms detail into
      `references/`; move the four folders under `references/` too.
- [ ] Core Rules keep the two Angular lines and point at the owners for the rest.
- [ ] Consume the served-references surface from `rule-platform-desktop`.

## Phase 5 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-angular/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Rule-id and scaffold checks across the catalog.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-angular/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- The copied checklist is the clearest evidence in this series that the
  invented-id defect is not a typo: two skills carry the same eleven names,
  which means it was copied from a template instead of written against the
  engine. The rule that checks ids against the exports is the fix, and it is
  worth more than the eleven corrections.
- `angular-no-ngmodule` is the same kind of rule as
  `solidjs-no-props-destructuring`: the framework's signature mistake, in the
  body, with no rule behind it. The area ADR should make that a pattern: every
  framework leaf owns at least one rule for the mistake its own framework
  punishes.
- With this leaf planned, the frontend area has one plan left: the router.
