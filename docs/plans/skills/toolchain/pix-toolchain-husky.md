# rule-toolchain-husky - best-practice implementation plan

Status: `planned`
Notes:`planned` Notes: plan only. Each skill waits for the owner before implementation. Output convention: one plan per skill at `docs/plans/skills/<area>/<skill>.md`. Index: `docs/plans/skills/README.md`.

Area: toolchain. Order: reverse alphabetical, eighth skill.

## Evidence base

Read in this session:

- `skills/rule-toolchain-husky/SKILL.md`: install with `husky init`, lint-staged
  in `package.json`, a commitlint config, two hook files, a lefthook
  alternative, and a Conventional Commits reference.
- `skills/rule-styleguide-git/SKILL.md` (formerly `rule-toolchain-commits`),
  which owns the commit rule.
- This repository's own hook installer, `scripts/install/git-hooks/index.mjs`,
  and its tracked `.githooks/` hooks. It installs shims into `.git/hooks/` and
  deliberately avoids `core.hooksPath` because git honors exactly one hooks
  path, so setting it would silence a global one.

Public sources verified in this session:

- Husky get started, https://typicode.github.io/husky/get-started.html
- Husky package, latest 9.1.7, https://registry.npmjs.org/husky/latest
- commitlint rules, https://commitlint.js.org/reference/rules.html
- commitlint CLI, latest 21.2.3, https://registry.npmjs.org/@commitlint%2Fcli/latest
- Git hooks, https://git-scm.com/docs/githooks

Facts and issues found:

| Current text                              | Reality                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| install section stops at `husky init`     | v9 also wants `prepare: "husky"` so hooks install on install           |
| hook file shape not stated                | verify it against the v9 docs rather than v8 examples                  |
| Conventional Commits reference duplicated | the rule lives in `rule-styleguide-git`                                 |
| commitlint config has no scope rule       | the repository rule requires a scope, so `scope-empty` must be `never` |
| type list omits `build`                   | the accepted types include `build`                                     |
| no local/CI statement                     | hooks are local; CI is the authority                                   |
| no `.githooks` option                     | the repository itself uses tracked hooks plus an installer             |

Local articles: the formatting-tools piece has a real Husky + lint-staged
section ("only on the files you actually changed, which keeps it fast"). It
stays context only; the plan anchors to the official documentation.

## Decisions

| Question    | Decision                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Scope       | Hook wiring only, Husky v9, lint-staged, commitlint, tracked hooks, lefthook, CI parity                        |
| Approach    | A decision rule per project type, not one mandatory tool                                                       |
| Boundaries  | The commit rule is `rule-styleguide-git`; the lint commands belong to biome/eslint; the tests to devops-testing |
| Husky v9    | `prepare: "husky"`, `husky init`, hook shape verified against v9, `HUSKY=0` documented                         |
| commitlint  | `scope-empty` never, `type-enum` identical to the repository types, header and subject rules                   |
| lint-staged | Staged files only, commands aligned with the chosen linter, fix only where it applies                          |
| Hooks       | pre-commit lint-staged, commit-msg commitlint, pre-push lint and tests                                         |
| Performance | Light pre-commit, full tests on pre-push                                                                       |
| CI parity   | Hooks are convenience, CI is the authority                                                                     |
| Delivery    | Plan only now                                                                                                  |
| ADR         | Only when a decision is structural                                                                             |

## Workstream A - Choosing the mechanism

The decision rule, stated once:

| Project shape                                                           | Mechanism                                                                   |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Repository that wants no hook dependency, hooks versioned with the code | Tracked `.githooks/` plus an installer that writes shims into `.git/hooks/` |
| Project that already uses the Husky ecosystem                           | Husky v9 plus lint-staged                                                   |
| Hooks that must be fast across many languages                           | lefthook, as an alternative with a config file                              |

`core.hooksPath` is named once as the option the repository rejects, with the
reason: git honors one path, so setting it silences a global one.

## Workstream B - Husky v9

1. `pnpm exec husky init` creates `.husky/`.
2. `"prepare": "husky"` in `package.json` installs the hooks on every install.
3. The hook file shape is taken from the v9 documentation, not from v8
   examples that source a script.
4. `HUSKY=0` disables the hooks for containers and CI.

## Workstream C - commitlint aligned with the repository rule

1. `scope-empty: [2, "never"]`: a commit without a scope is rejected, which is
   the rule `rule-styleguide-git` owns.
2. `type-enum` matches the accepted types: `feat`, `fix`, `docs`, `style`,
   `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
3. `header-max-length` and `subject-case` set the shape of the subject.
4. The DCO trailer is not a commitlint rule; the repository hook checks it, and
   the plan says so instead of implying commitlint covers it.

## Workstream D - lint-staged

1. Staged files only, always; it is what keeps the commit fast.
2. Commands come from the linter the project already chose (Biome or ESLint),
   so the hooks introduce no new tool.
3. `--fix` applies only to files the tool can rewrite.

## Workstream E - Hooks and performance

1. `pre-commit`: lint-staged.
2. `commit-msg`: commitlint.
3. `pre-push`: linter, `git diff --check`, and the test command.
4. Other hooks only when a project needs them.
5. The split keeps commits quick and puts the full suite where it is paid once.

## Workstream F - CI parity

The hooks are a local convenience. The same checks run in CI as the
authoritative gate, so `--no-verify` skips convenience and never the real gate.

## Proposed guardrails

Advisory first, then blocking after 100% precision and recall.

| Rule id                   | Rejects                                               | Tier | Source                            |
| ------------------------- | ----------------------------------------------------- | ---- | --------------------------------- |
| `husky-commitlint-scope`  | a commitlint config with no `scope-empty: never` rule | A    | commitlint rules; repository rule |
| `husky-lint-staged-scope` | a lint-staged entry that ignores the staged set       | B    | lint-staged                       |
| `husky-hooks-present`     | a hook config file with no matching hook installed    | B    | Git hooks                         |

## Assets and templates to ship

- `assets/templates/husky/` (pre-commit, commit-msg, pre-push).
- `assets/templates/commitlint.config.js` (scope and types aligned).
- `assets/templates/githooks-installer.md` (the tracked-hooks alternative).
- `assets/templates/lefthook.yml`.

## Phases

## Dependency graph

This leaf closes before its area router, which cannot list a child that does not exist.

Depends on: `rule-process-ai` (HARD)

Feeds: `rule-toolchain` (HARD)

Shared files: tests/fixtures/guardrail-corpus.mjs, tests/fixtures/census.json, docs/adr/ADR.md

### Phase 0 - Decisions and scaffolding

- [x] Audit the skill and the repository's own hook setup.
- [x] Verify the Husky, commitlint and Git hook facts.
- [x] Interview the owner and record the decisions.
- [x] Create this plan and the index entry.

### Phase 1 - Content

- [ ] Add `prepare: "husky"` and verify the v9 hook shape.
- [ ] Remove the Conventional Commits reference and link `rule-styleguide-git`.
- [ ] Align the commitlint config with the scope rule and the type list.
- [ ] Document `HUSKY=0`.
- [ ] Add the mechanism decision rule, including the tracked `.githooks` path.
- [ ] Add the pre-push hook and the performance split.
- [ ] Add the CI parity statement.

### Phase 2 - Guardrails and assets

- [ ] Implement the three rules with fixtures and a unit test each.
- [ ] Ship the husky, commitlint, githooks and lefthook templates.
- [ ] Promote the Tier A rule after the corpus gate reports 100%.
- [ ] Write the ADR for the mechanism decision rule, since choosing the hook
      mechanism is a structural decision.

### Phase 3 - Verification

- [ ] Build the fixture repository and confirm a commit without a scope is
      rejected.
- [ ] Confirm lint-staged touches only staged files.
- [ ] Confirm `HUSKY=0` disables the hooks cleanly.
- [ ] Regenerate `docs/14-guardrails.md` with `pnpm census`.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step | Class | Model | Why |
| ---- | ----- | ----- | --- |
| Phase 0 - Decisions and scaffolding | `T1-plan` | `gemini-4-argon` (high) | planning and prose that argues |
| Phase 1 - Content | `T7-author` | `qwen3.8-max` | skill bodies and references |
| Phase 2 - Guardrails and assets | `T3-rules` | `kimi-k2.7-code` | small deterministic code |
| Phase 3 - Verification | `T8-verify` | `gemini-3.8-flash` (high) | fast verification loops |

Plan default: `T8-verify` - `gemini-3.8-flash` (high). Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.

## Verification gates

```bash
pnpm test tests/core/guardrails-precision-recall.test.mjs
pnpm lint
pnpm census
pnpm test
```

## Open notes

- The repository's own installer is the reference for the tracked-hooks path;
  the plan cites it as the pattern, not as a second copy of the script.
- The Husky v9 migration page would not render for the fetch used here, so the
  hook file shape is a verification task in Phase 1, not a claim in the plan.
