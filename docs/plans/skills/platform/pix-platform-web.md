# rule-platform-web - plan

Status: plan only, 2026-10-21. Index row `#36`, `pending` until this file
existed, now `planned`. Implementation waits for the owner.

Area: platform. The router `rule-platform` is planned last in the area. Sibling
plans: `rule-process-adr` and `rule-process` (same guardrail shape).

## Scope decisions (owner, 2026-10-21)

| Question | Decision |
| -------- | -------- |
| Scope of this pass | **Plan only** |
| Identity | A thin umbrella that delegates: the skill drops to roughly 80 lines, keeps only what nobody else owns, and points at the owner for the rest |
| Framework chooser | `rule-frontend` owns the choice; `rule-platform-web` links it and stops keeping a second copy |
| Scaffold block | Moves into the template catalog; the skill stops carrying a project template in prose |
| Rule set | Six rules, all Tier B (advisory) |
| Detection | Both: section and table parsing, plus injected `fileList` |
| Fixtures | Shared corpus pairs plus skill trees on disk |
| Flow | Failing test first |
| Gates | Skill suite, corpora, whole catalog clean, census, lint and typecheck, neighbour links |
| Commits | One per phase |
| ADR | Two: the umbrella boundary, the rule design |
| Done | The identity is decided and the rules pass |

## Evidence base (measured 2026-10-21)

`skills/rule-platform-web/SKILL.md` is 281 lines, has no `guardrails/`, no
`references/`, no `guardrails:` frontmatter key, and one scaffold block at the
end.

### What the body actually contains, and who owns each part

| Section | Lines | Real owner today |
| ------- | ----- | ---------------- |
| Core Rules (9 rules) | 9 | `rule-styleguide-css`, `rule-styleguide-html`, `rule-styleguide-file-tree` |
| Framework Selection (6 rows) | ~9 | `rule-frontend` |
| File Tree Convention | ~25 | `rule-styleguide-file-tree` |
| Progressive Enhancement and PWA | ~7 | **nobody else: keep** |
| Code Splitting | ~7 | `rule-toolchain-vite` |
| Environment Configuration | ~8 | `rule-styleguide-configuration` |
| Error Handling | ~6 | `rule-backend` (response shape) and `rule-devops-observability` |
| Performance Budgets | ~10 | **nobody else: keep** |
| Security (CSP, headers) | ~6 | `rule-frontend-*` security sections, `rule-devops-docker` |
| SEO and Social | ~7 | **nobody else: keep** |
| Build and Deploy | ~7 | `rule-devops`, `rule-toolchain-*` |
| Accessibility | ~11 | `rule-styleguide-a11y` |
| Internationalization | ~9 | `rule-styleguide-i18n` |
| Browser APIs instead of a dependency | ~65 | `rule-styleguide-baseline` links here as the owner |
| Design System and CSS | ~15 | `rule-ui-design-system`, `rule-styleguide-css` |
| Quick Reference | ~20 | derived from the sections above |
| Scaffold block | 28 | the template catalog |

Two sections are genuinely unique to this skill: the performance budgets table
and the PWA/offline rules. The browser-API catalog is the third, and
`rule-styleguide-baseline` already defers to it.

### The framework chooser exists twice

`rule-platform-web` (lines 38-46) and `rule-frontend` (lines 24-29) both hold a
six-row "choose one framework" table, plus `rule-frontend` a six-line Quick
Selection for the same decision. Same six skills, different wording. One of the
two is redundant, and the owner picked `rule-frontend` as the survivor.

### The scaffold block is not consumed

`src/core/scaffold/_parser.js` extracts the block that starts at
`## Project Scaffolding`. The heading here is `# Scaffolding: Frontend Project
Structure`, and `rule-frontend-react` does the same with `# Scaffolding: React
Project Setup`, so neither block reaches the parser. The template catalog
(`src/core/scaffold/templates/`) exposes `listTemplateCategories()` and
`getTemplate(component, framework)`: it is component-shaped, so a project
skeleton has no place in it yet. Moving this block is a small new concept, not
a move between two folders.

### Duplication wider than this skill

`Zero CSS classes` appears in ten skills and `Flex first` in ten, so the Core
Rules are not a local copy of one owner: the whole frontend area restates them.
A rule that forbids the duplication here is red on arrival for eight other
skills. The plan scopes it to this skill, and records the rest as a follow-up.

### Reach

Eight skills link here: `rule-devops-observability`, `rule-frontend-workers`,
`rule-meta`, `rule-platform-desktop`, `rule-styleguide-baseline`, `rule-platform`
(the router), the dispatcher, and `rule-ui`'s table. The router row describes it
as "PWA, service workers, offline, performance budgets", which is closer to the
intended identity than the skill's own 281 lines are.

## Target shape

The skill keeps, and owns:

1. Performance budgets (LCP, INP, CLS, TBT, initial bundle, TTI) with the tool
   that measures each one.
2. PWA and offline: service worker strategy, manifest, app shell, lazy
   registration.
3. Browser APIs that replace a dependency (already the house catalog).
4. SEO and social metadata, which nothing else claims.

Everything else becomes one line with the owner's link. The nine Core Rules
collapse to a pointer at `rule-styleguide-css` and `rule-styleguide-html`; the
framework table becomes a pointer at `rule-frontend`.

## The six rules

| id | Rejects | Reads | Tier | Today |
| -- | ------- | ----- | ---- | ----- |
| `platform-no-second-chooser` | A framework-selection table outside `rule-frontend` | `code` (tables) | B | red: this skill holds one |
| `platform-scaffold-heading` | A scaffold block whose heading the parser cannot read | `code` (headings) | B | red here and in `rule-frontend-react` |
| `platform-no-stale-skill-id` | An `rule-...` id in prose that matches no skill directory | `code` + `context.fileList` | B | clean: 7 of 7 ids resolve |
| `platform-owner-named` | A delegating section that names no owner | `code` | B | red: the 281 lines name owners in five places and nowhere else |
| `platform-budget-single-source` | The performance numbers restated outside the budget table | `code` | B | clean today; the duplication risk arrives with the trim |
| `platform-no-duplicate-core-rules` | A restatement of the zero-classes, zero-inline, flex-first or semantic-HTML rules | `code` | B | red: ten skills carry the same four lines |

## Phase 0 - Decisions

- [ ] ADR: the umbrella boundary. `rule-frontend` owns the framework choice,
      `rule-styleguide-*` own the markup and CSS rules, the umbrella owns the
      three web-platform topics.
- [ ] ADR: the rule design, Tier B, dual detection.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/platform-web/`: `clean/`, `second-chooser/`,
      `bad-scaffold-heading/`, `stale-skill-id/`, `unnamed-owner/`, each with a
      one-line `README.md` stating what it proves.
- [ ] Six `CORPUS` pairs in `tests/fixtures/guardrail-corpus.mjs` bound to
      `rule-platform-web`.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-platform-web/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites; the catalog scan reports only the known
      duplication in the other eight skills.

## Phase 3 - Trim to the umbrella

- [ ] Delete the framework table and link `rule-frontend`.
- [ ] Collapse Core Rules to one pointer line naming
      `rule-styleguide-css` and `rule-styleguide-html`.
- [ ] Replace the sections in the ownership table with one line each, owner
      named.
- [ ] Keep and sharpen: budgets, PWA and offline, browser APIs, SEO.
- [ ] Remove the scaffold block (Phase 4 gives it a home first).
- [ ] Target: ~80 lines. Anything longer needs a reason in the diff.

## Phase 4 - Give the scaffold block a home

- [ ] A project-skeleton template in `src/core/scaffold/templates/` beside the
      component lookup, consumed by the init flow.
- [ ] `rule-frontend-react` moves its `# Scaffolding:` block the same way, or
      the heading rule keeps flagging it.
- [ ] `platform-scaffold-heading` passes on the catalog.

## Phase 5 - Neighbours

- [ ] `rule-frontend` gains the sentence that it owns the choice, and the
      umbrella stops advertising it.
- [ ] The eight linking skills keep a valid target: check each link and each
      sentence describing this skill.
- [ ] `rule-platform` router row matches the new identity (it already describes
      the shorter skill better than the body does).

## Phase 6 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-platform-web/guardrails/`
- [ ] `_corpus` and `_routing-corpus` suites.
- [ ] Catalog scan with the six rules: only the documented duplication remains.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-platform-web/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- Trimming 281 lines to 80 is the one item in this plan that can lose
  information. Each deleted section must leave a pointer, and the pointer must
  name a skill that already says the thing: the ownership table above is the
  checklist, not a suggestion.
- `platform-no-duplicate-core-rules` is red for eight other skills. Either the
  frontend area runs the same trim later, or the rule ships with a legacy list
  like `adr-legacy`. The plan prefers the second for now and says so.
- The browser-API catalog is the longest kept section (~65 lines) and the only
  one another skill explicitly defers to. It stays even though the umbrella is
  supposed to be thin.
- Weakening the umbrella has a routing cost: prompts like "PWA" or "performance
  budget" currently reach a large document. After the trim they reach a short
  one that answers directly, which should raise, not lower, the hit rate.
