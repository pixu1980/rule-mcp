# rule-styleguide - best-practice implementation plan

Status: plan only.
Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`.
Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, twenty-ninth skill (the area
router).

## Evidence base

Read in this session:

- `skills/rule-styleguide/SKILL.md`: 248 lines, of which 151 are a Project
  Scaffolding section that reproduces eight configuration files.
- `skills/`: 16 styleguide children plus this router.
- `src/tools/ai/_rank-skills.js`: BM25 over section text, plus name affinity,
  tag affinity, a graph bonus, framework bias and two hard-coded domain boosts.
- `src/core/guardrails/engine/_registry.js`: `SCAFFOLD_GUARDRAILS` apply when the
  skill is `rule-styleguide` and the mode is `scaffold`.
- `src/core/scaffold/_parser.js`: the scaffold mode reads the section from this
  skill's text, so moving the templates is a code change, not a copy.

Public sources: nothing external applies; this is repository structure. Local
articles: rechecked at the owner's request, and the matches are incidental
(system design, MCP, prompting). Nothing is cited from there.

Problems found:

| Problem                            | Detail                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| the table missed three children    | 13 rows for 16 children: comments, english and file-tree were absent                                                     |
| the metadata pointed at ghosts     | the description routes "business validation" (moved to data, ADR 144) and a tag advertises "patterns" (deleted, ADR 146) |
| the scaffolding duplicated         | eight files, 61% of the file, copied from the configuration skill                                                        |
| shared guardrails were mislabeled  | 11 entries under "across all styleguides"; four are single-owner                                                         |
| the routing description was loose  | the ranker is BM25 plus name, tag and graph signals, not keyword matching                                                |
| the router contract was unenforced | the four `router-*` rules exist in two area plans and nowhere else                                                       |

## Decisions

| Question     | Decision                                                                  |
| ------------ | ------------------------------------------------------------------------- |
| Table        | One row per child, with a test that fails when the filesystem disagrees   |
| Metadata     | Drop the ghost terms, name the three new areas                            |
| Scaffolding  | Templates move to `rule-styleguide-configuration`; the parser reads there  |
| Shared rules | A rule-to-owner table, no copied descriptions                             |
| Content      | Purpose, routing contract, owner map, load order, one See also            |
| Routing text | Verified against the ranker, then written as a contract                   |
| Router rules | The four `router-*` rules, owned by `rule`, inherited here, advisory first |
| Delivery     | Plan only                                                                 |

## Workstream A - The table and the children

The table becomes 16 rows. Three join:

| Skill                      | Covers                                                        | When to use                      |
| -------------------------- | ------------------------------------------------------------- | -------------------------------- |
| `rule-styleguide-comments`  | what a comment states, the three kinds that never ship, JSDoc | writing or reviewing a comment   |
| `rule-styleguide-english`   | American spelling, plain language, the accent allowlist       | writing prose a reader will see  |
| `rule-styleguide-file-tree` | the folder shape, barrels, scan and fix                       | creating or auditing a directory |

The `router-child-coverage` test compares the table's links with the directories
whose names begin with `rule-styleguide-`, so the next skill created in the area
fails the suite until it is listed.

## Workstream B - The metadata

The description drops "business validation" and names the three new areas; the
tag list drops `patterns` and gains `comments`, `english` and `file-tree`. A
router whose own description points at skills that moved teaches the ranker the
wrong association, which is worse than a dead link: it misroutes silently.

## Workstream C - The scaffolding move

The eight file templates move to `rule-styleguide-configuration`, which already
claims them. Three things follow:

1. `src/core/scaffold/_parser.js` reads the section from the configuration skill.
   The tool name stays `rule_tool_styleguide mode=scaffold`, so the references in
   the frontend skills keep working.
2. `SCAFFOLD_GUARDRAILS` stay keyed to `rule-styleguide` and `mode: scaffold`
   until the parser change lands, then key to the configuration skill. The
   registry comment and the census must agree before the key moves.
3. The router keeps a three-line pointer to the owner instead of the 151 lines.

This is a structural change: an ADR records the source of truth move and the
registry key change, because a future reader will otherwise find two plausible
homes and pick the wrong one.

## Workstream D - The owner map

The 11 shared-looking rules become a table of rule id to owning skill. The owners
come from the loader's `ownedGuardrails`, not from reading the prose:

| Rule family            | Owner                                    |
| ---------------------- | ---------------------------------------- |
| CSS shape and comments | `rule-styleguide-css`                     |
| Markup semantics       | `rule-styleguide-html`                    |
| File and folder naming | `rule-styleguide-naming` and `-file-tree` |
| JSDoc                  | `rule-styleguide-comments`                |
| Accessibility tests    | `rule-styleguide-a11y`                    |

The table is generated from the loader in the test, so a rule that moves again
updates the map instead of leaving a sentence that was true in March.

## Workstream E - The routing contract

The section stops pretending to be a description of keyword matching. It says
what the ranker does, at the level a reader needs: section text scored with BM25,
the skill name and tags weighted on top, a graph bonus for related skills, a
framework bias, and two domain overrides for commits and scope challenges. The
detail lives in `_rank-skills.js`; the contract says what a prompt author can
rely on, not how the score is computed.

A short load-order table answers the second question a router exists for: which
skills to load together. CSS with a11y and baseline, html with a11y and i18n,
javascript with typescript and comments, naming with file-tree.

## Proposed guardrails

Owned by `rule`, inherited here; advisory first, blocking after the corpus gate.

| Rule id                 | Rejects                                       | Tier | Source    |
| ----------------------- | --------------------------------------------- | ---- | --------- |
| `router-child-coverage` | a child directory missing from the table      | A    | This plan |
| `router-link-resolves`  | a link to a file that does not exist          | A    | This plan |
| `router-use-when`       | a row whose "when to use" is empty or generic | B    | This plan |
| `router-no-dup-rules`   | a router restating a rule its child owns      | B    | ADR 079   |

## Verification

1. A test that the table has exactly one row per child directory.
2. A test that every link in the table and in See also resolves.
3. A test that the scaffold parser finds the templates in the new owner and that
   `mode=scaffold` still returns the same eight files.
4. A test that the owner map equals the loader's `ownedGuardrails` for the
   styleguide area.
5. A `good` and a `bad` fixture per `router-*` rule.
6. The existing content and link-integrity tests, plus `pnpm census`.

## Phases

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the table, the metadata, the parser and the ranker.
- [x] Recheck the local articles and record that nothing applies.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - The table and the metadata

- [ ] Add the three missing rows.
- [ ] Rewrite the description and the tags.
- [ ] Add the coverage test.

### Phase 2 - The scaffolding move

- [ ] Move the templates to the configuration skill.
- [ ] Point the parser at the new owner; keep the tool name.
- [ ] Move the registry key with the parser, in one commit.
- [ ] Write the ADR.

### Phase 3 - The owner map and the contract

- [ ] Replace the shared list with the owner table, generated from the loader in
      the test.
- [ ] Verify and rewrite the routing section.
- [ ] Add the load-order table.
- [ ] Clean See also.

### Phase 4 - The router rules

- [ ] Implement the four rules with fixtures and a unit test each.
- [ ] Apply them to every area router, not only this one.
- [ ] Promote Tier A after the corpus gate reports 100%.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test tests/core/guardrails-precision-recall.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_content.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/docs/link-integrity.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/scaffold/__tests__/_parser.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The table is hand-maintained; no generator exists, so the test is the guard,
  not a build step.
- The four `router-*` rules belong to `rule` and are inherited here; implementing
  them once and applying them to every area router is the point, not a
  convenience.
- The scaffold move touches code, not only prose: the parser, the registry key
  and the census contract move in one commit with the ADR.
- Local articles were rechecked; nothing applies.
