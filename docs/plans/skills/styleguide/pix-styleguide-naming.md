# rule-styleguide-naming - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide, confirmed. Naming stays where it is.

## Evidence base

Read in this session:

- `skills/rule-styleguide-naming/SKILL.md` (231 lines): naming tokens, file
  naming, file suffixes, the project tree, the barrel pattern, import
  conventions and a quick reference.
- `skills/rule-styleguide-naming/guardrails/_file-naming.js`: the only rule,
  component files must be `_PascalCase.ext`.
- `skills/rule-styleguide-file-tree/SKILL.md` and its five guardrails
  (`barrel-exports-match-files`, `barrel-file-tree`, `component-export-check`,
  `component-file-prefix`, `component-folder-barrel`).
- `skills/rule-toolchain-eslint/SKILL.md`, which enables the unicorn
  `filename-case` rule.

Public sources verified in this session:

- Google TypeScript Style Guide, https://google.github.io/styleguide/tsguide.html
- Google HTML and CSS Style Guide, https://google.github.io/styleguide/htmlcssguide.html
- Airbnb JavaScript Style Guide, https://github.com/airbnb/javascript
- MDN lexical grammar, identifiers, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar
- React, rules of hooks, https://react.dev/reference/rules/rules-of-hooks
- Vue style guide, https://vuejs.org/style-guide/
- unicorn `filename-case`, https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/filename-case.md

Problems found:

| Problem                                  | Detail                                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Italian prose in the tree                | "UNICO index.html", "barrel principale", "Componenti UI", "NO prefisso", "Sibling di...", against the English-only rule |
| the tree duplicates file-tree            | 30+ lines of structure that `rule-styleguide-file-tree` owns, with five guardrails behind it                             |
| boundary with `filename-case` is unnamed | both the guardrail and the unicorn rule judge file names                                                                |
| missing conventions                      | hooks, boolean prefixes, acronyms, plurals, abbreviations, type names                                                   |

Local articles: no dedicated naming piece exists in
the local article corpus. The plan anchors to the external style
guides above.

## Decisions

| Question        | Decision                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------- |
| Area            | `styleguide`, confirmed                                                                     |
| English fix     | The tree comments are translated or removed with the section                                |
| Tree            | The tree diagram moves to `rule-styleguide-file-tree`; naming keeps small examples and links |
| Boundary        | `file-naming` owns component names; unicorn `filename-case` owns the rest                   |
| New conventions | Hooks, boolean prefixes, acronyms, plurals, no abbreviations, type names                    |
| Quick reference | Stays; it is naming content, not a general cheat sheet                                      |
| Imports         | Confirmed, aligned with the linter where the linter can order them                          |
| Guardrails      | Constants, boolean names, file suffixes, type prefixes                                      |
| Severity        | Advisory first, then blocking after the corpus gate                                         |
| Standards       | One external style guide cited where the convention comes from                              |
| Delivery        | Plan only now                                                                               |

### Boundary conflict, resolved

Two answers crossed: one said naming also owns the unicorn `filename-case`
rule, the next said the component guardrail owns component files and unicorn
owns the rest. The second is the concrete one and wins: `file-naming` keeps the
`_PascalCase` rule for component files, `filename-case` covers everything else,
and the skill documents the split so neither side hides the other.

## Workstream A - Language

Every comment in the tree diagram is translated. The section is then reduced,
so most of the Italian disappears with the duplication rather than through a
translation pass.

## Workstream B - The tree moves to file-tree

1. The tree diagram and the seven structural rules move to
   `rule-styleguide-file-tree`, the owner of barrels, prefixes and folder
   layout.
2. Naming keeps three or four illustrative lines and a link, enough to show
   where a name lives without restating the structure.
3. The mover updates the file-tree plan when its turn comes; this plan records
   the decision.

## Workstream C - Tokens and missing conventions

The token table keeps its seven rows and gains a section per convention:

1. **Hooks and reactive functions** use the `use` prefix (React rules of hooks,
   and the framework skills for Vue and Svelte).
2. **Booleans** read as a question: `is`, `has`, `should`, `can`.
3. **Acronyms** keep a single casing: `UserId`, `HttpClient`, `userId`, never
   `ID` in one place and `Id` in another.
4. **Plurals**: a collection is plural, its element singular.
5. **No abbreviations** unless the abbreviation is the domain word.
6. **Types and interfaces** carry no `I` or `T` prefix.

Each rule cites the style guide it comes from where one exists.

## Workstream D - File naming and suffixes

The file naming table and the suffix table stay. The suffix table gains the
rule that a new suffix is added to the list before it is used, so
`_TodoItem.v2.js` never becomes a convention by accident.

## Workstream E - Imports

The five import groups and the alias guidance stay, with one line that the
linter can order the groups automatically and the skill states the order the
linter enforces.

## Workstream F - Quick reference

The ASCII box stays: it is the naming token summary, the one thing the removed
`rule-styleguide-patterns` did that belongs here.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                        | Rejects                                             | Tier | Source                |
| ------------------------------ | --------------------------------------------------- | ---- | --------------------- |
| `naming-constants-upper-snake` | an assigned constant in camelCase                   | A    | Google TS style guide |
| `naming-no-type-prefix`        | an interface or type named `IUser` or `TUser`       | A    | Google TS style guide |
| `naming-file-suffix`           | a component file with a suffix outside the list     | B    | This skill            |
| `naming-boolean-prefix`        | a boolean-looking binding with no `is`/`has` prefix | B    | This skill            |

The existing `file-naming` stays; it is the component-file rule. The unicorn
`filename-case` remains in the ESLint config for everything else.

## Verification

1. A `good` and a `bad` snippet per guardrail in the corpus.
2. A fixture tree with a component folder, a helper folder and a test folder,
   checked name by name.
3. A check that the skill carries no Italian prose, so the defect found here
   cannot return.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the guardrail and the file-tree boundary.
- [x] Verify the external style guides.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Move the tree and the structural rules to `rule-styleguide-file-tree`.
- [ ] Keep small examples here and link the owner.
- [ ] Add the six missing conventions with their sources.
- [ ] Keep the suffix table and add the new-suffix rule.
- [ ] Confirm the import groups.
- [ ] Keep the quick reference.

### Phase 2 - Guardrails

- [ ] Add the four rules with fixtures and a unit test each.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the file-name boundary between the guardrail and
      unicorn, since it decides where a future naming rule goes.

### Phase 3 - Verification

- [ ] Run the fixture tree check.
- [ ] Confirm the skill carries no Italian prose.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The tree move is a dependency for the `rule-styleguide-file-tree` plan; this
  plan states the decision, and that plan performs the reception.
- No local article is cited; the external style guides and the repository's own
  conventions are the sources.
