# rule-meta-astro - plan

Status: `planned`
Notes:`planned` Notes: plan only, 2026-10-21. Index row `#45`, `pending` until this file existed, now `planned`. Implementation waits for the owner.

Area: meta, leaf, and the largest skill in the area. Sibling plans:
`rule-meta-remix`, `rule-meta-nuxt`, `rule-meta-next` (same rule set) and
`rule-meta` (the dispatcher).

## Scope decisions (owner)

Inherited from the platform interviews, 2026-10-21:

| Question           | Decision                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of this pass | **Plan only**                                                                                                                                                              |
| Identity           | Thin body plus served `references/`: the islands model stays in the body, the rest moves out                                                                               |
| Aux files          | The 10 files under `checklists/`, `knowledge/`, `prompts/` and `templates/` move into `references/` **and get served**, exactly as planned for `rule-platform-desktop`      |
| Shared owners      | `rule-frontend` and `rule-styleguide-*` own markup, CSS and components; `rule-platform-web` owns deployment and budgets; `rule-styleguide-a11y` owns the a11y test requirement |
| Reach              | Fixed here: the leaf links the dispatcher, the dispatcher lists the leaf                                                                                                   |
| Rule set           | Six rules, all Tier B (advisory)                                                                                                                                           |
| Detection          | Both: section and table parsing, plus injected `fileList`                                                                                                                  |
| Fixtures           | Shared corpus pairs plus skill trees on disk                                                                                                                               |
| Flow               | Failing test first                                                                                                                                                         |
| Gates              | Skill suite, corpora, catalog clean, census, lint and typecheck, plus the scaffold parser check below                                                                      |
| Commits            | One per phase                                                                                                                                                              |
| ADR                | Two for the whole area: the meta family shape, the rule design                                                                                                             |
| Done               | The leaf owns what it claims, the scaffold block is terminated, and the rules pass                                                                                         |

## Evidence base (measured 2026-10-21)

`skills/rule-meta-astro/SKILL.md` is **524 lines**, with 10 auxiliary files
(594 lines) under four folders and no `guardrails/`, no `references/`.

### Three measured defects

1. **The scaffold block is not terminated, and the parser returns 347 lines.**
   `src/core/scaffold/_parser.js` takes `## Project Scaffolding` as the start
   and `## Guardrails` as the end. In this file `## Guardrails` sits at line 167
   and `## Project Scaffolding` at line 178, so the end marker is searched
   _after_ the start, is not found, and the slice runs to the end of the file.
   Verified by running the parser: the "scaffold section" is 347 lines and ends
   on the See-also link. A tool asked for the scaffold hands back the entire
   performance playbook.
2. **Core Rules are copied, not inherited.** Six lines restate rules the other
   three meta leaves already point at with one sentence. Astro is the only leaf
   in the area that does this.
3. **Three dangling file references.** The Guardrails section says
   "see rule-styleguide -> comments.md", "-> css.md" and
   "-> a11y.md -> Automated Testing". `skills/rule-styleguide/` contains
   `SKILL.md` and nothing else: there is no `references/` folder and no such
   files. The three subjects are separate skills (`rule-styleguide-comments`,
   `rule-styleguide-css`, `rule-styleguide-a11y`).

### The auxiliary files

| Folder        | Files | Lines | Destination   |
| ------------- | ----- | ----- | ------------- |
| `checklists/` | 2     | 77    | `references/` |
| `knowledge/`  | 1     | 314   | `references/` |
| `prompts/`    | 4     | 107   | `references/` |
| `templates/`  | 3     | 96    | `references/` |

No tool reads them: `src/resources/_read.js` serves a skill by reading
`SKILL.md`, and `readSkill()` reads one file. That is the same finding as
`rule-platform-desktop`, where the plan introduces the surface that serves
`references/`; this plan consumes it.

### Reach

| Door                  | State                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| `rule` dispatcher      | listed                                                                       |
| `rule-meta` dispatcher | the leaf does not link it, and `rule-meta` is itself missing from `rule`       |
| See also              | `rule`, `rule-frontend`, `rule-styleguide`: no meta router, no deployment owner |

## Target shape

The body keeps: when to use, the islands model, the `.astro` component pattern,
the client-island directives, the store-and-signals mapping, and the pointers.
Around 160 lines.

`references/` receives:

| Reference        | From today's body                                                      |
| ---------------- | ---------------------------------------------------------------------- |
| `file-tree.md`   | the file tree convention                                               |
| `css.md`         | CSS in Astro, scoped `<style>`, external CSS                           |
| `barrel.md`      | the barrel pattern                                                     |
| `performance.md` | the performance section plus `knowledge/astro-performance-playbook.md` |
| `review.md`      | `checklists/`, `prompts/`, `templates/` moved as-is                    |

## The six rules

| id                             | Rejects                                                  | Reads                       | Tier | Today                                     |
| ------------------------------ | -------------------------------------------------------- | --------------------------- | ---- | ----------------------------------------- |
| `meta-no-duplicate-core-rules` | A restatement of the markup and CSS rules                | `code`                      | B    | **red**: six lines                        |
| `meta-router-linked`           | A meta leaf that does not link `rule-meta`                | `code`                      | B    | red: four leaves                          |
| `meta-owner-named`             | A delegated section naming no owner                      | `code`                      | B    | red: the file tree, CSS and a11y sections |
| `meta-no-stale-file-ref`       | A reference to a file that does not exist                | `code` + `context.fileList` | B    | **red**: three references                 |
| `meta-no-stale-skill-id`       | A `rule-...` id with no skill directory                   | `code` + `context.fileList` | B    | clean                                     |
| `meta-scaffold-terminated`     | A `## Project Scaffolding` block the parser cannot close | `code`                      | B    | **red**: 347 lines returned               |

## Phase 0 - Decisions

- [ ] ADR (area): the meta family shape, shared with the other three leaves.
- [ ] ADR (area): the rule design, Tier B, dual detection, and the scaffold
      terminator rule that this leaf motivated.

## Phase 1 - Fixtures first (red)

- [ ] `tests/fixtures/meta-astro/`: `clean/`, `core-rules-restated/`,
      `router-unlinked/`, `unnamed-owner/`, `stale-file-ref/`,
      `unterminated-scaffold/`, each with a one-line `README.md`.
- [ ] Six `CORPUS` pairs bound to `rule-meta-astro`, including a snippet whose
      scaffold block runs to EOF.
- [ ] Suites written and watched to fail with "rule not found".

## Phase 2 - The rules

- [ ] `skills/rule-meta-astro/guardrails/`: six rule files plus `index.js`.
- [ ] `guardrails: [...]` frontmatter, ids equal to the exports.
- [ ] Green the Phase 1 suites.

## Phase 3 - Fix the scaffold contract

- [ ] Move `## Project Scaffolding` above `## Guardrails`, or give the scaffold
      block its own explicit end marker, so the parser stops at the block.
- [ ] Assert in the suite that the extracted block is shorter than the body and
      contains no See-also link.
- [ ] Report the same check against every skill with a scaffold block, so the
      next unterminated block fails on the day it is written.

## Phase 4 - Split the body and serve the references

- [ ] Move the 10 auxiliary files under `references/` and add the four
      references in the table above.
- [ ] Body trimmed to the islands model plus pointers; the six copied Core
      Rules become the one-sentence pointer the sibling leaves already use.
- [ ] The three dangling references point at the skills that exist.
- [ ] Consume the served-references surface planned in `rule-platform-desktop`;
      if that surface is dropped, this phase falls back to declaring the files
      in the body.

## Phase 5 - Verification

- [ ] `node --import ./scripts/alias-hook.mjs --test skills/rule-meta-astro/guardrails/`
- [ ] `_corpus`, `_routing-corpus`, `_router-child-coverage` suites.
- [ ] Scaffold extraction check across the catalog.
- [ ] `pnpm census && pnpm census:check`, `pnpm lint`, typecheck.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step                                              | Class       | Model                     | Why                            |
| ------------------------------------------------- | ----------- | ------------------------- | ------------------------------ |
| Phase 0 - Decisions                               | `T1-plan`   | `gemini-4-argon` (high)   | planning and prose that argues |
| Phase 1 - Fixtures first (red)                    | `T4-tests`  | `deepseek-v4.1-flash`     | test writing at the cheap end  |
| Phase 2 - The rules                               | `T3-rules`  | `kimi-k2.7-code`          | small deterministic code       |
| Phase 3 - Fix the scaffold contract               | `T7-author` | `qwen3.8-max`             | skill bodies and references    |
| Phase 4 - Split the body and serve the references | `T5-bulk`   | `minimax-m3.1-flash`      | mechanical edits at scale      |
| Phase 5 - Verification                            | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops        |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test skills/rule-meta-astro/guardrails/
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD), `rule-platform-desktop#3` (CONTRACT)

Feeds: `rule-meta` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

## Open notes

- The 347-line scaffold return is the most concrete bug any plan in this series
  has found: a tool contract silently returning 34 times the content it
  promises. It is a parser contract issue, not an Astro issue, and the fix
  belongs in the phase that also guards every other skill.
- Astro is the only meta leaf that chose to copy the Core Rules instead of
  pointing at them, and it is also the longest. The correlation is not a
  coincidence: copying shared rules is how a skill grows.
- The performance playbook (314 lines) is the largest single auxiliary file in
  the catalog. It is also the one `rule-platform-web` overlaps most: that skill
  owns the budgets, this one owns the Astro-specific technique.
