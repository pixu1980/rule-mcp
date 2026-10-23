# rule-styleguide-comments - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only, except the JSDoc reception and the span fix, applied now. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, twenty-sixth skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-comments/SKILL.md`: what a comment is for, the three
  things that never ship, what to write instead, and three guardrails.
- The JSDoc section and the `jsdoc-required` rule in
  `rule-styleguide-javascript`, which the javascript plan decided to move here.
- `src/core/layers/_guardrails.js`, the frontmatter-versus-folder check.
- The seven frontend skills that point at `javascript.md` for the JSDoc rule.

Public sources verified in this session:

- JSDoc, https://jsdoc.app/
- TSDoc, https://tsdoc.org/
- Google TypeScript Style Guide, comments section, https://google.github.io/styleguide/tsguide.html#comments
- SPDX, https://spdx.dev/
- REUSE, https://reuse.software/

Local articles: no dedicated piece on comments exists in
the local article corpus; the matches are incidental.

Problems found:

| Problem                             | Detail                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| a broken inline code span           | a change-history example contained a raw newline inside the span, which Markdown cannot render, and it carried a pending marker |
| JSDoc had two owners in the plans   | the section and `jsdoc-required` sit in the javascript skill, while this skill owns comment form and content                    |
| the license header was undocumented | the repository mandates an SPDX header on every source file and no guardrail says so                                            |
| no policy for pending markers       | a marker without an issue reference is a promise nobody tracks                                                                  |
| no policy for suppressions          | a suppression without a reason is the failure mode the rules exist to prevent                                                   |
| standards were not cited            | JSDoc, TSDoc and the Google guide are never named                                                                               |

## Decisions

| Question       | Decision                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| JSDoc          | Section, rule and frontmatter move here; applied now                                                                                |
| Span           | Fixed now                                                                                                                           |
| Boundaries     | Confirmed: this skill owns form and content of comments; typography, language, code rules and the lint rules stay with their owners |
| Standards      | JSDoc, TSDoc, Google TypeScript Style Guide, SPDX and REUSE                                                                         |
| New content    | SPDX header, pending-marker policy, suppression reasons, deprecated successor, section comments                                     |
| New guardrails | License header, bare pending marker, suppression reason, deprecated successor                                                       |
| Severity       | Advisory first; the three existing rules keep their behavior                                                                        |
| Verification   | The corpus, a JSDoc fixture, a false-positive matrix, a Markdown span test                                                          |
| Delivery       | The JSDoc move and the span fix now, the rest planned                                                                               |

## Workstream A - The JSDoc reception, applied

Done in this pass:

1. `_jsdoc-required.js` moved from the javascript guardrails folder to this
   one, with its import and array entry updated on both sides.
2. The frontmatter list on both skills is updated: `jsdoc-required` is declared
   here and no longer there.
3. The JSDoc section moved into this skill, before the See also list.
4. The corpus fixtures and the false-positive test now check the rule against
   `rule-styleguide-comments`.
5. The seven frontend skills point at `comments.md` instead of `javascript.md`;
   the contract with the interface is unchanged, only the owner moved.

## Workstream B - The broken span, fixed

The change-history bullet no longer contains a newline inside an inline span,
and the example no longer carries a pending marker. The Markdown check in the
verification list exists so the defect cannot return.

## Workstream C - Standards

Each rule cites its source: JSDoc and TSDoc for the block syntax, the Google
guide for when a comment is warranted, SPDX and REUSE for the license header.

## Workstream D - New content

1. **The license header.** Two lines at the top of every source file, with the
   holder and the identifier, exactly as the repository already does.
2. **Pending markers.** A marker is allowed only with a reference to the issue
   that will close it; without one it is a promise nobody tracks.
3. **Suppressions.** A suppression carries a reason on the same line, and the
   checked form is preferred over the silent one.
4. **Deprecation.** A deprecated export names its successor, so the migration is
   mechanical.
5. **Section comments.** In a long file, a comment that names the section is
   navigation, and it follows the same rule: it says something the code cannot.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                        | Rejects                                  | Tier | Source      |
| ------------------------------ | ---------------------------------------- | ---- | ----------- |
| `comment-license-header`       | a source file with no SPDX header        | A    | SPDX; REUSE |
| `comment-no-bare-marker`       | a pending marker with no issue reference | B    | This plan   |
| `comment-suppression-reason`   | a suppression with no reason on the line | A    | This skill  |
| `comment-deprecated-successor` | `@deprecated` with no successor named    | B    | TSDoc       |

The three existing rules and `jsdoc-required` stay.

## Verification

1. A `good` and a `bad` snippet per rule in the corpus, with the JSDoc pair now
   under this skill.
2. A JSDoc fixture covering an exported function, a class, a constant and a
   barrel exemption.
3. A false-positive matrix: a comment marker inside a string, inside a URL and
   inside a template literal must not count.
4. A Markdown check that the skill's own prose has no broken inline span.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-styleguide` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the JSDoc owner and the references.
- [x] Reproduce the broken span.
- [x] Verify the standards.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Applied now

- [x] Move the JSDoc rule, its frontmatter entry and its section here.
- [x] Update the corpus, the false-positive test and the frontend references.
- [x] Fix the broken span.

### Phase 2 - Content

- [ ] Add the license header, pending markers, suppressions, deprecation and
      section comments.
- [ ] Cite the standards per section.

### Phase 3 - Guardrails and verification

- [ ] Add the four rules with fixtures and a unit test each.
- [ ] Add the false-positive matrix and the Markdown span check.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Regenerate `docs/15-guardrails.md` with `pnpm census`.
- [ ] Write the ADR for the JSDoc ownership move, since it moves a rule between
      skills.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions and scaffolding | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Applied now | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 2 - Content | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 3 - Guardrails and verification | `T3-rules` | `kimi-k2.7-code` | small deterministic code |

Plan default: `T7-author` - `qwen3.8-max`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
node --import ./scripts/alias-hook.mjs --test tests/core/guardrails-precision-recall.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/guardrails/__tests__/_false-positives.test.mjs
node --import ./scripts/alias-hook.mjs --test src/core/skills/__tests__/_content.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The JSDoc move is applied; the loader reports no drift for these two skills,
  and the only remaining drift in the repository is the CSS one its own plan
  records.
- The frontend skills changed only the pointer, not the requirement.
- No local article is cited; the standards are the sources.
