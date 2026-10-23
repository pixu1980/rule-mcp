# rule-frontend-svelte - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#51`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: frontend, framework leaf. Sibling plans: `rule-frontend-vue` (same shape,
same series), `rule-frontend-workers`, the remaining framework leaves, and
`rule-frontend` (the area router).

## Scope decisions (owner)

Inherited from the platform, meta and workers interviews, 2026-10-21:

| Question            | Decision                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Scope of this pass  | **Plan only**                                                                                                          |
| Identity            | Thin body plus served references: the Svelte 5 patterns stay, the shared rules become pointers, the playbook moves out |
| Existing guardrails | **Extend, do not replace**: the skill owns `svelte-no-class-directive`, the plan adds five rules around it             |
| Aux files           | The 10 files under `checklists/`, `knowledge/`, `prompts/` and `templates/` move into `references/` and get served     |
| Scaffold block      | Fixed here and in the six other affected skills, one catalog-level item                                                |
| Shared owners       | `rule-styleguide-*` own markup, CSS, a11y; `rule-platform-web` owns budgets; `rule-frontend` owns the framework choice    |
| Rule set            | Six rules including the existing one, all Tier B (advisory)                                                            |
| Detection           | Both: section and table parsing, plus injected `fileList`                                                              |
| Fixtures            | Shared corpus pairs plus skill trees on disk                                                                           |
| Flow                | Failing test first                                                                                                     |
| Gates               | Skill suite, corpora, catalog clean, census, lint and typecheck, plus the scaffold check                               |
| Commits             | One per phase                                                                                                          |
| ADR                 | Two for the whole area: the frontend family shape, the rule design                                                     |
| Done                | The invented rule ids are gone, the aux files are served, the rules pass                                               |

## Evidence base (measured 2026-10-21)

`skills/rule-frontend-svelte/SKILL.md` is **509 lines**, with a `guardrails/`
folder that exports exactly one rule, and 10 auxiliary files.

| Folder        | Files | Lines |
| ------------- | ----- | ----- |
| `checklists/` | 2     | 69    |
| `knowledge/`  | 1     | 304   |
| `prompts/`    | 4     | 103   |
| `templates/`  | 3     | 87    |

### The Guardrails section names eleven rules that do not exist

The section at line 171 is a checklist of `guardrail-*` ids:

```
guardrail-no-css-classes, guardrail-no-inline-styles, guardrail-semantic-html,
guardrail-external-css, guardrail-barrel-file, guardrail-data-part,
guardrail-no-framework-css, guardrail-svelte-specific, guardrail-jsdoc-required,
guardrail-css-comments-required, guardrail-a11y-test-required
```

The engine exports **70 rule ids and not one of them starts with `guardrail-`**.
The real names are `no-css-classes`, `external-css`, `data-part-naming`,
`jsdoc-required`, `css-comments-required`, and so on. The whole list is
invented: a reader who tries to run one of those ids finds nothing, and
`svelte-specific` is not a rule at all - it is a paragraph.

The same section also points at `rule-styleguide -> comments.md`, `-> css.md` and
`-> a11y.md`, which do not exist: `skills/rule-styleguide/` contains only
`SKILL.md`, and those three subjects are separate skills.

### The scaffold block returns 325 lines

`## Guardrails (Testable Assertions)` prefix-matches the parser's end marker
`## Guardrails` at line 171, before `## Project Scaffolding` at line 185, so the
slice runs to the end of the file. Measured: **325 lines returned**. One of the
seven skills sharing this bug (see `rule-frontend-vue` for the full table).

### Core Rules

Six lines: five shared with every framework leaf, plus one that is genuinely
Svelte's own (`<style>` is scoped by the compiler, so it is the primary
mechanism). Verified against the engine:

```
scoped <style> in a .svelte file -> FAIL: css-comments-required only, not external-css
class="x"                        -> FAIL: data-part-naming
```

So `external-css` explicitly allows `<style>` for Svelte, which makes the
sixth rule real and the other five copies.

### A house rule with an undocumented exception

`rule-platform-web` says "Zero inline styles - all styling in external `.css`
files via `<link>` or `adoptedStyleSheets`", and the repository's own global
instruction block repeats it. Svelte's compiler-scoped `<style>` is the
exception, and the engine encodes it while the umbrella does not say so. Not
fixed here; recorded so the umbrella plan can name it.

### Reach

| Door                       | State                                                  |
| -------------------------- | ------------------------------------------------------ |
| `rule-frontend` area router | listed                                                 |
| `rule` dispatcher           | listed                                                 |
| Inbound links              | 3 skills: `rule-frontend`, `rule-platform-web`, `rule-ui` |

## Target shape

The body keeps: the component pattern, the store-to-runes mapping, lists and
conditionals, state management, the barrel pattern, the ten Svelte 5 patterns,
and the forms section. Around 250 lines.

`references/` receives the file tree, the CSS loading detail, the performance
playbook, and the four folders moved as-is.

## The six rules

| id                               | Rejects                                                                                | Reads                       | Tier | Today                     |
| -------------------------------- | -------------------------------------------------------------------------------------- | --------------------------- | ---- | ------------------------- |
| `svelte-no-class-directive`      | `class:name` directives (the plain `class=` attribute is caught by `data-part-naming`) | `code`                      | B    | existing, keep            |
| `svelte-guardrail-ids-real`      | A rule id named in the body that no guardrails folder exports                          | `code` + `context.ruleIds`  | B    | **red**: 11 invented ids  |
| `svelte-scaffold-terminated`     | A `## Project Scaffolding` block the parser cannot close                               | `code`                      | B    | **red**: 325 lines        |
| `svelte-aux-served`              | A companion file no surface reaches and the body does not declare                      | `context.fileList`          | B    | **red**: 10 files         |
| `svelte-no-stale-file-ref`       | A reference to a file that does not exist                                              | `code` + `context.fileList` | B    | **red**: three references |
| `svelte-no-duplicate-core-rules` | A restatement of the shared markup and CSS rules                                       | `code`                      | B    | **red**: five lines       |

## Phase 0 - Decisions

- [ ] ADR (area): the frontend family shape, shared with the other leaves, and
      the Svelte `<style>` exception stated once.
- [ ] ADR (area): the rule design, Tier B, dual detection, and the
      rule-id-exists rule this leaf motivated.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/frontend-svelte/`: `clean/`, `invented-rule-ids/`,
      `unterminated-scaffold/`, `unserved-aux/`, `stale-file-ref/`,
      `core-rules-restated/`, each with a one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-frontend-svelte`, including the existing
      class-directive pair if it is missing.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] Add the five new rules beside `_svelte-no-class-directive.js`.
- [ ] `guardrails:` frontmatter gains the new ids, equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Fix the Guardrails section

- [ ] Replace the 11 invented ids with the real ones, or delete the checklist
      and point at `rule-styleguide-css`, `-html`, `-a11y` and `-comments`.
- [ ] The three dangling `rule-styleguide -> *.md` references become links to
      the skills that own them.
- [ ] Fix the scaffold block, together with the six other affected skills.

## Phase 4 - Split and serve

- [ ] Move the file tree, CSS loading and performance sections into
      `references/`; move the four folders under `references/` too.
- [ ] Core Rules collapse to the one Svelte-specific line plus a pointer.
- [ ] Consume the served-references surface from `rule-platform-desktop`.

## Phase 5 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-svelte/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Scaffold extraction check across all seven affected skills.
- [ ] Rule-id check across the catalog: no skill names a rule that does not
      exist.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                 | Class       | Model                     | Why                            |
| ------------------------------------ | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions                  | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red)       | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules                  | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Fix the Guardrails section | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 4 - Split and serve            | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 5 - Verification               | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-frontend-svelte/guardrails/
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

- The invented-id checklist is the most misleading thing found in this series
  after the scaffold bug: eleven names that look runnable and are not. A reader
  following the section would try `guardrail-external-css` and get nothing.
  `svelte-guardrail-ids-real` is worth adding catalog-wide, like
  `router-dead-link` was.
- The `<style>` exception is real and the engine already encodes it. The gap is
  documentation: `rule-platform-web` claims a blanket rule that Svelte cannot
  follow, and the umbrella plan should name the exception rather than repeat
  the absolute.
- `knowledge/svelte-performance-playbook.md` (304 lines) is the third playbook
  of its kind, after Astro's and Vue's. Three copies of a review methodology is
  a candidate for one owned reference, not three, and that decision belongs to
  the area, not to this leaf.
