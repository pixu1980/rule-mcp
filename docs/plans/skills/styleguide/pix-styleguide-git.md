# rule-styleguide-git - best-practice implementation plan

Status: plan only. Each skill waits for the owner before implementation.
Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`.
Index: `docs/plans/skills/README.md`.

Area: styleguide. Order: reverse alphabetical, twentieth skill.

## Evidence base

Read in this session:

- `skills/rule-styleguide-git/SKILL.md` (260 lines): the commit rule, types,
  scope, subject, body, atomicity, branch names, merge requests, push, the
  three ways to ignore a file, recovery, enforcement, and a final "Conventions
  (rules -> skills merge)" section.
- `src/core/commit/_rule.js`, the code that every commit gate reads.
- `skills/rule-toolchain-husky/SKILL.md`, which owns the hook wiring.

Public sources verified in this session:

- Conventional Commits 1.0.0, https://www.conventionalcommits.org/en/v1.0.0/
- Git commit, https://git-scm.com/docs/git-commit
- Developer Certificate of Origin, https://developercertificate.org/
- Semantic Versioning 2.0.0, https://semver.org/
- Chris Beams, How to Write a Git Commit Message, https://cbea.ms/git-commit/
- Git rebase, https://git-scm.com/docs/git-rebase
- Git worktree, https://git-scm.com/docs/git-worktree
- Pro Git, https://git-scm.com/book/en/v2

Local articles: no dedicated git piece exists in
`~/Downloads/articles to check/`; the matches are incidental.

Problems found:

| Problem                      | Detail                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| merge artifact               | the final section nests a `# Commits and Branches Rules` heading and repeats the body                           |
| commitlint example is wrong  | `scope-enum` lists a closed set (`skills`, `router`, ...) that would reject real commits (`plans`, `site`, ...) |
| no guardrails                | the commit rule is enforced by a hook, but no rule is defined                                                   |
| standards are not cited      | Conventional Commits, DCO, SemVer and the Git docs are never named                                              |
| no signing or history topics | signed commits, `fixup!`, autosquash, worktree and bisect are absent                                            |

## Decisions

| Question       | Decision                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Scope          | The seven areas, with the artifact removed and the standards cited                                                      |
| Boundaries     | The commit and branch rule only; hook wiring stays with the husky skill                                                 |
| Artifact       | Removed                                                                                                                 |
| Standards      | Conventional Commits 1.0.0, DCO, SemVer, Git docs, Chris Beams                                                          |
| Missing topics | Signed commits, `fixup!` and autosquash, worktree and bisect, MR templates and CODEOWNERS, branch strategy, merge queue |
| Scope rule     | Required but free: `scope-empty: never`, no closed enum                                                                 |
| Guardrails     | Subject pattern, scope required, subject length, no WIP on the main branch, body wrap, DCO trailer                      |
| Severity       | Blocking in the `commit-msg` hook, advisory everywhere else                                                             |
| Verification   | Message fixtures, a hook test on a temporary repository, and a comparison with `_rule.js`                               |
| Delivery       | Plan only now                                                                                                           |

## Workstream A - Remove the artifact

The final section goes. The branch prefixes, types, scope and merge request
conventions stay in the body, where they already are.

## Workstream B - The commit rule

1. `type(scope): subject`, with the eleven accepted types.
2. The scope is mandatory and free-form: `scope-empty: never` replaces the
   closed `scope-enum`, which contradicted the history this repository writes.
3. The subject is imperative and under 72 characters; the body explains why,
   wrapped at 72 columns; the footer carries `BREAKING CHANGE` and the DCO
   trailer.
4. One logical change per commit, and a `fixup!` that has not been squashed is
   not a commit that belongs on the main branch.

## Workstream C - Branches and integration

1. The branch prefixes stay, with the `hotfix/` case documented.
2. The skill states the integration model it expects: trunk-based or feature
   branches, and whether the merge squashes or keeps the commits.
3. The merge queue and the CODEOWNERS file are named where the hosting platform
   supports them.

## Workstream D - Recovery and clean history

`rebase`, `rebase --onto`, `revert`, `reset`, `reflog`, `worktree` and `bisect`
get a short section each, with the case that calls for each. `fixup!` and
`git rebase --autosquash` are the way a review fix disappears into the commit
it belongs to.

## Workstream E - Signing

Signed commits with GPG or SSH are documented, with the verification command
and the policy a repository can choose. DCO and cryptographic signing are
different controls and the skill says so.

## Workstream F - Enforcement

1. The `.githooks/commit-msg` script stays, and it reads the same rule as
   `src/core/commit/_rule.js`.
2. The commitlint example is corrected to `scope-empty: never`, with no scope
   enum.
3. The hook wiring itself is linked to `rule-toolchain-husky`; this skill owns
   the rule, not the installation.

## Workstream G - Review templates

A PR/MR template with the checklist a reviewer expects, and CODEOWNERS where the
platform supports it.

## Proposed guardrails

These rules judge a commit message, not a source file. The `commit-msg` hook
uses them; `rule_tool_check` does not, because it receives code and a file name.

| Rule id                  | Rejects                                           | Tier | Source               |
| ------------------------ | ------------------------------------------------- | ---- | -------------------- |
| `commit-subject-pattern` | a subject that is not `type(scope): subject`      | A    | Conventional Commits |
| `commit-scope-required`  | an empty scope                                    | A    | This skill           |
| `commit-dco-trailer`     | a missing `Signed-off-by`                         | A    | DCO                  |
| `commit-subject-length`  | a subject longer than 72 characters               | B    | Chris Beams          |
| `commit-body-wrap`       | a body line longer than 72 characters             | B    | Chris Beams          |
| `commit-no-wip`          | a `WIP` or unsquashed `fixup!` on the main branch | B    | This skill           |

Severity: blocking in the hook, advisory in the documentation.

## Verification

1. A fixture set of valid and invalid messages for every rule.
2. The `commit-msg` hook run against a temporary repository, asserting the exit
   code.
3. A test that the rule in the skill and the rule in `src/core/commit/_rule.js`
   agree on the accepted types and the subject pattern.

## Phases

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill, the artifact and the commitlint example.
- [x] Verify the standards.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Remove the merge artifact.
- [ ] Cite the standard behind each section.
- [ ] Correct the commitlint example to a free but required scope.
- [ ] Add signing, `fixup!` and autosquash, worktree, bisect, MR templates and
      CODEOWNERS.
- [ ] State the branch strategy and the merge queue behavior.

### Phase 2 - Guardrails

- [ ] Implement the six message rules and wire them into the `commit-msg` hook.
- [ ] Add the fixtures and the hook test.
- [ ] Promote the Tier A rules after the corpus gate reports 100%.
- [ ] Write the ADR for the free-scope rule and the hook ownership, since both
      decide where a future commit rule lives.

### Phase 3 - Verification

- [ ] Run the message fixtures.
- [ ] Run the hook against the temporary repository.
- [ ] Compare the documented rule with `_rule.js`.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm test tests/docs/commit-gates.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The commit guardrails are a new kind of rule: they judge a message, not a
  source file. If the engine cannot carry them, the hook keeps them and the
  corpus gains message fixtures anyway.
- No local article is cited; Conventional Commits, the DCO and the Git
  documentation are the sources.
