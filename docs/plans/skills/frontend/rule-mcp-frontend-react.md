# rule-frontend-react - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#53`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: frontend, framework leaf, and the largest one. Sibling plans:
`rule-frontend-vue`, `rule-frontend-svelte`, `rule-frontend-solidjs` (same shape),
`rule-frontend-workers`, `rule-frontend-template-engine`, `rule-frontend-angular`,
and `rule-frontend` (the area router).

## Scope decisions (owner)

Inherited from the platform, meta and workers interviews, 2026-10-21:

| Question               | Decision                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of this pass     | **Plan only**                                                                                                                          |
| Identity               | Thin body plus served references: the React patterns and the reducer/store mapping stay, the review material and the playbook move out |
| Existing guardrails    | **Extend, do not replace**: the skill owns `react-hooks-rules` and `react-no-classname`; the plan adds rules around them               |
| Contradiction          | The CSS Modules question is **decided**, not left standing: one answer in the body, the Guardrails section and the engine              |
| Aux files and examples | 10 auxiliary files plus `examples/performance/` (10 files) move under `references/` and get served and checked                         |
| Scaffold block         | Fixed here and in the six other affected skills, one catalog-level item                                                                |
| Shared owners          | `rule-styleguide-*` own markup, CSS, a11y; `rule-platform-web` owns budgets; `rule-frontend` owns the framework choice                 |
| Rule set               | Seven rules including the two existing ones, all Tier B (advisory)                                                                     |
| Detection              | Both: section and table parsing, plus injected `fileList`                                                                              |
| Fixtures               | Shared corpus pairs plus skill trees on disk                                                                                           |
| Flow                   | Failing test first                                                                                                                     |
| Gates                  | Skill suite, corpora, catalog clean, census, lint and typecheck, plus the scaffold, rule-id and example checks                         |
| Commits                | One per phase                                                                                                                          |
| ADR                    | Two for the whole area: the frontend family shape, the rule design                                                                     |
| Done                   | The contradiction is decided, the aux tree is served, the rules pass                                                                   |

## Evidence base (measured 2026-10-21)

`skills/rule-frontend-react/SKILL.md` is **701 lines**: the largest framework
leaf and the largest file in the frontend area. It carries 24 files in total.

| Folder                  | Files | Lines   |
| ----------------------- | ----- | ------- |
| `checklists/`           | 2     | 99      |
| `knowledge/`            | 1     | 326     |
| `prompts/`              | 4     | 130     |
| `templates/`            | 3     | 118     |
| `examples/performance/` | 10    | 474     |
| `guardrails/`           | 3     | 2 rules |

So 1,147 lines of companion material beside a 701-line body, none of it served,
none of it linted, and the examples run by no suite.

### The skill contradicts itself and the engine about CSS Modules

Core Rule 6 says "No CSS-in-JS, **no CSS Modules**, no Tailwind". The Guardrails
section, twelve lines of the same file, says "**external-css** (CSS Modules or
adoptedStyleSheets)". The engine settles it the way the Guardrails section does:

```
import styles from "./a.module.css";      -> PASS
document.adoptedStyleSheets = [sheet];    -> PASS
<div className="x">                       -> FAIL: data-part-naming, react-no-classname
```

So a rule the body calls forbidden is a rule the checker accepts, and the same
file states both positions. This is the only place in the catalog where a skill
and its own guardrail section disagree about what the guardrail says.

### 210 lines of a worked review inside the body

`## React performance review` (line 491) runs to the end of the file: a full
sample response with "Main finding", "Issues found", "Suggested priority",
"Rule of thumb", "Refusal and uncertainty handling", and a resource table. It
duplicates `templates/audit-report-template.md`,
`templates/pr-comment-template.md`, `prompts/code-review-prompt.md` and
`checklists/react-performance-pr-checklist.md`, all four of which ship beside
it. A body that contains its own templates cannot be kept in sync with them.

### Two of the eleven rule ids are near-misses

`barrel-file` (real: `barrel-file-tree`) and `data-part` (real:
`data-part-naming`). The other nine resolve. Same defect as `rule-frontend-solidjs`,
same rule would catch it.

### The scaffold block returns 466 lines

`## Guardrails` at 224, `## Project Scaffolding` at 236: the end marker is
searched after the start, is not found, and the slice runs to the end of the
file. **466 lines returned**, the largest of the seven skills with this bug (the
full table is in `rule-frontend-vue`).

### Reach

| Door                        | State                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| `rule-frontend` area router | listed, first row                                                |
| `rule-mcp` dispatcher       | listed                                                           |
| Inbound links               | the most linked framework leaf: frontend, meta, platform, ui, ai |

Reach is healthy. What the leaf lacks is a body small enough to be read and
companion files anyone can open.

## Target shape

The body keeps: the component pattern, the store-to-context mapping, CSS
loading, state management, lists and conditionals, the barrel pattern, the ten
React patterns, the decision matrix. Around 300 lines, down from 701.

`references/` receives:

| Reference                               | From today                                                       |
| --------------------------------------- | ---------------------------------------------------------------- |
| `examples/performance/`                 | the 10 worked examples, moved as-is                              |
| `review.md`                             | the worked review appended to the body, plus the PR review style |
| `performance-playbook.md`               | `knowledge/` (326 lines)                                         |
| `checklists/`, `prompts/`, `templates/` | moved as-is                                                      |

## The seven rules

| id                              | Rejects                                                                      | Reads                      | Tier | Today                               |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------- | ---- | ----------------------------------- |
| `react-hooks-rules`             | Hooks called outside the top level                                           | `code`                     | B    | existing, keep                      |
| `react-no-classname`            | `className` instead of `data-part`                                           | `code`                     | B    | existing, keep                      |
| `react-guardrail-ids-real`      | A rule id named in the body that no guardrails folder exports                | `code` + `context.ruleIds` | B    | **red**: 2 of 11                    |
| `react-css-modules-consistent`  | A body and a Guardrails section that disagree about CSS Modules              | `code`                     | B    | **red**: both positions in one file |
| `react-scaffold-terminated`     | A `## Project Scaffolding` block the parser cannot close                     | `code`                     | B    | **red**: 466 lines                  |
| `react-aux-served`              | A companion file or example no surface reaches and the body does not declare | `context.fileList`         | B    | **red**: 24 files                   |
| `react-no-duplicate-core-rules` | A restatement of the shared markup and CSS rules                             | `code`                     | B    | **red**: six lines                  |

Seven rather than six because this leaf carries both defect classes the other
leaves carry one of: a self-contradiction about a rule, and a body that contains
its own templates.

## Phase 0 - Decisions

- [ ] ADR (area): the frontend family shape, shared with the other leaves.
- [ ] ADR (area): the rule design, Tier B, dual detection, the rule-id rule, and
      **the CSS Modules verdict**: forbid them in the engine too, or allow them
      in the body. The plan recommends allowing them, because the engine
      already does and because a CSS module is an external `.css` file, which is
      what the house rule actually protects.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/frontend-react/`: `clean/`, `near-miss-rule-ids/`,
      `css-modules-contradiction/`, `unterminated-scaffold/`, `unserved-aux/`,
      `core-rules-restated/`, each with a one-line `README.md`.
- [ ] Seven `CORPUS` pairs bound to `rule-frontend-react`, including the two
      existing rules if their pairs are missing.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] Add the five new rules beside the two existing files.
- [ ] `guardrails:` frontmatter gains the new ids, equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Settle the contradiction

- [ ] Apply the ADR verdict in the body, in the Guardrails section and, if the
      verdict is "forbid", in `rule-styleguide-css` too.
- [ ] Fix `barrel-file` and `data-part` to the real ids.
- [ ] The three `rule-styleguide -> *.md` references become links to
      `rule-styleguide-comments`, `-css` and `-a11y`.

## Phase 4 - Move the review material out

- [ ] The 210-line worked review and the PR review style move to
      `references/review.md`.
- [ ] `examples/performance/` and the four folders move under `references/`.
- [ ] Fix the scaffold block with the other six affected skills.
- [ ] Core Rules collapse to one pointer line.

## Phase 5 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-react/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Rule-id and scaffold checks across the catalog; the example lint from the
      workers plan covers these 10 files.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                   | Class       | Model                     | Why                            |
| -------------------------------------- | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions                    | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red)         | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules                    | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Settle the contradiction     | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 4 - Move the review material out | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 5 - Verification                 | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-react/guardrails/
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

- The CSS Modules contradiction is the most consequential finding here: a
  framework leaf that tells a reader one thing and its checker another. Every
  other defect in this series is a missing reference or a stale name; this one
  is a rule that punishes the reader for following the furniture.
- 701 lines is not a skill, it is a book with the appendix glued on. The trim
  moves 1,147 companion lines behind pointers, and the body still carries 300.
- `examples/performance/` is the only worked-example tree in the frontend area
  and the only one with a valid resource table pointing at it. It is worth
  keeping, serving and checking rather than deleting, which is why this plan
  does not treat it like the `assets/` tree in `rule-frontend-workers`.
