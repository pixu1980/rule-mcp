# rule-process-ai - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes:merge, rename and guardrail move applied; the absorbed content work is listed below and still open. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`. Order: `docs/plans/skills/DEPENDENCIES.md`, where this plan runs first.

Area: process. Order: first, because every other plan is written by these rules.

## What this plan absorbs

Three plans and one pending row became this one:

| Was                                    | Now                                                                 |
| -------------------------------------- | ------------------------------------------------------------------- |
| `rule-process-ai-sdlc` (pending)        | the body of `skills/rule-process-ai/SKILL.md`                        |
| `rule-process-simplicity` (planned)     | `references/simplicity.md` plus the new "Scope comes first" section |
| `rule-styleguide-english` (planned)     | `references/english.md`                                             |
| `rule-styleguide-fingerprint` (planned) | `references/fingerprint.md`                                         |

Their decisions are carried here, not discarded: the accent allowlist, the `-ogue` stem fix, the bidi controls, the plain-language rules and the four new guardrail families each survive as a workstream below. What changed is the owner and the naming, because the owner is now one skill.

## Evidence base

Read and measured in this session:

- `skills/rule-process-ai/SKILL.md`: 218 lines after the merge, from 177. The lifecycle body is unchanged; the scope contract, the ownership map and the reference table are new.
- `skills/rule-process-ai/references/`: 275 lines of simplicity, 71 of English, 152 of fingerprint, moved with `git mv` so the text is the same text.
- `skills/rule-process-ai/guardrails/`: nine rules in one family, moved from three directories and renamed with the `ai-` prefix.
- The duplicated spelling map: `rule-styleguide-english` and `rule-styleguide-fingerprint` both documented the British to American table and both claimed `fp-american-english`. One rule, two documents, which is the drift ADR 058 exists to prevent.
- `src/tools/ai/_reduction-signal.js`: 28 phrases, unchanged, and now the only thing that makes a scope prompt route here.
- The surface after the merge: 84 skills, 105 tools, 176 resources, 38 prompts, 41 commands, from `tests/docs/docs-accuracy.test.mjs`.
- The routing corpus, 95 prompts: 77 exact and 90 top-or-alternative before the merge and after it, once the vocabulary was restored to `SKILL.md`.

Problems found:

| Problem                                    | Detail                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| one rule, two documents                    | the spelling map and `fp-american-english` lived in both the English and the fingerprint skill, so a rule change had two places to land and one to forget                                                                                                               |
| the lifecycle skill owned no guardrail     | `rule-process-ai-sdlc` documented gates and enforced none, while the three skills it now absorbs carried all the enforceable discipline                                                                                                                                  |
| three plans and one pending row            | four index entries for one body of rules, and the one that was pending was the only one able to describe the whole                                                                                                                                                      |
| moving a body to a reference loses routing | the simplicity vocabulary sat in `SKILL.md`, which is what the ranker indexes. Moving it to `references/` dropped a scope prompt from the top route to a data skill (T8 in `_reminder.test.mjs`), and the fix was to keep the contract and the vocabulary in `SKILL.md` |
| the rename is a breaking surface           | the tool id is derived from the skill name, so `rule_tool_process_ai_sdlc` became `rule_tool_process_ai`; every client call and every document naming it had to follow                                                                                                    |

## Decisions

| Question    | Decision                                                                                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Directories | The three are deleted, not tombstoned. Their names join `removedSkillNames`, so a surviving reference fails the suite                                                             |
| Guardrails  | Nine rules move into one family and take the `ai-` prefix: `ai-english-only-*`, `ai-american-english`, `ai-no-emdash`, `ai-no-typographic-chars`, `ai-box-rectangular`, `ai-no-*` |
| Rename      | Full, tool included: `rule-process-ai-sdlc` to `rule-process-ai`, and `rule_tool_process_ai_sdlc` to `rule_tool_process_ai`                                                           |
| Index       | One row for the merged skill; the four old rows are gone and the total is 84                                                                                                      |
| Shape       | `SKILL.md` plus `references/`, the shape `rule-styleguide-a11y` already uses                                                                                                       |
| Graph       | `docs/plans/skills/DEPENDENCIES.md` holds it, and this plan is first in it                                                                                                        |
| Old plans   | Deleted, folded here                                                                                                                                                              |
| Routers     | `rule-process` and `rule-styleguide` tables updated, and a child-coverage test guards them                                                                                          |
| Delivery    | Merge applied in this session                                                                                                                                                     |

## Workstream A - The merge (applied)

Done in this session, in this order: the directory rename, the three bodies moved into `references/`, the nine guardrails moved and renamed, the new `SKILL.md` with the ownership map and the scope contract, the three directories deleted, `removedSkillNames` extended, the two router tables corrected, the census and the README counts regenerated, and the routing corpus re-measured.

## Workstream B - The guards the absorbed plans still owe

The English and fingerprint plans each carried a list of rules that was never built. They belong to this skill now, and they keep their tier:

| Rule id (proposed)           | From        | Fails on                                                | Tier |
| ---------------------------- | ----------- | ------------------------------------------------------- | ---- |
| `ai-identifier-english`      | English     | a non-English identifier                                | B    |
| `ai-plain-sentence-length`   | English     | a sentence or paragraph past the documented limit       | B    |
| `ai-terminology-consistency` | English     | two terms for one concept in the same document          | B    |
| `ai-bidi-controls`           | Fingerprint | a bidi control character, which can hide code in review | A    |
| `ai-no-emoji`                | Fingerprint | an emoji in prose that is not interface copy            | B    |
| `ai-nfc-text`                | Fingerprint | text that is not NFC-normalized                         | B    |
| `ai-repeated-opener`         | Fingerprint | three paragraphs opening with the same connective       | B    |
| `ai-structural-tells`        | Fingerprint | a closing paragraph that restates the opening           | B    |

`ai-bidi-controls` is the only one that earns blocking on arrival: it is a security
property, not a style one, and its false-positive surface is nearly empty.

## Workstream C - The two spelling fixes

Both were decided in the absorbed plans and neither is applied:

1. The `-ogue` stem over-corrects: it currently rewrites any word ending in it, so the stem narrows to `catal`, `dial` and `anal`.
2. The map misses the medical family, the `-lled` family and several single words. They are added to `src/core/fingerprint.js`, which the skill and the guardrail both read, so one edit moves both.

## Workstream D - The scope contract in practice

The six-line contract is now in `SKILL.md` and the catalog is in the reference. What is missing is the check that the contract was declared: `pix_tool` returns `scope_contract` and asks for `files_to_change` and `out_of_scope`, and nothing verifies that a plan or a change actually declares them.

## Workstream E - The router tables

`rule-process` and `rule-styleguide` are corrected by hand. A `router-child-coverage` test compares each area router's links with the directories under it, so the next skill that moves fails the suite instead of leaving a stale row.

## Workstream F - The reduction signal

28 phrases, English only, undocumented until this plan. The section naming them, and the corpus test that keeps them honest, are still open; the Italian half lives on `feat/decision-models` and is not duplicated here.

## Phases

## Dependency graph

The root of the graph: it owns the prose, scope and gate rules every other plan obeys, so it depends on nothing.

Depends on: -

Feeds: `rule-process` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - The merge

- [x] Rename the directory and the tool.
- [x] Move the three bodies into `references/`.
- [x] Move and rename the nine guardrails into one family.
- [x] Rewrite `SKILL.md` with the ownership map, the scope contract and the reference table.
- [x] Delete the three directories and extend `removedSkillNames`.
- [x] Correct the `rule-process` and `rule-styleguide` tables and the central index row.
- [x] Regenerate the census and the README counts (84 skills, 105 tools, 176 resources).
- [x] Re-measure the routing corpus and restore the scope vocabulary to `SKILL.md`.
- [x] Delete the three absorbed plans and collapse the index to one row.

### Phase 1 - Content

- [x] Move the organizational essay out of `references/simplicity.md` into the lifecycle body, where it belongs.
- [ ] Document the reduction signal and add its corpus test.
- [ ] Narrow the `-ogue` stem and extend the spelling map in `src/core/fingerprint.js`.
- [ ] Name the file-size test and ADR 061 in the simplicity reference (the `SKILL.md` section already names them; the reference still does not).

### Phase 2 - The guards

- [ ] Failing corpus cases first for `ai-bidi-controls`, one good and one bad.
- [ ] Implement `ai-bidi-controls` as blocking, with its fixture.
- [ ] Add the advisory set from Workstream B one rule at a time, each with its own corpus pair.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

### Phase 3 - The routers

- [ ] Add the `router-child-coverage` test for every area router.
- [ ] Fix the rows it reports, and record in `DEPENDENCIES.md` any area that has to wait for a leaf.

### Phase 4 - Verification

- [ ] Run the gates below.
- [ ] Confirm the persona that carried the old skill still points here.
- [ ] Announce the tool rename in the changelog entry for the next release.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_routing-corpus.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/text/__tests__/_reminder.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/guardrails/__tests__/_enforcement.test.mjs
node --import ./scripts/alias-hook.mjs --test tests/docs/docs-accuracy.test.mjs
pnpm census && pnpm census:check
pnpm lint
```

## Open notes

- The merge moved 716 lines and changed 29 files by rename alone. The only non-mechanical edit the routing needed was the "Scope comes first" section: a reference is not indexed, and the score for a scope prompt fell from first to second until the vocabulary came back.
- The tool rename breaks any client that calls `rule_tool_process_ai_sdlc`. Nothing in this repository does, and the surface map, the fixture and the counts are regenerated; an external client has to follow the new id.
- A running server keeps the catalog it loaded at startup. `skills reload` reaches the process that runs it, not the stdio instance a client attached earlier, so a client started before this merge keeps answering with the four old names until it is restarted. The repository is the authority: the corpus test, the router tables and the census are all green on disk.
- The historical ADRs that name the four skills stay as they are: an ADR records what was decided when it was decided, and `docs-scan` already excludes the ADR directory from the stale-name sweep. Only live documents move.
