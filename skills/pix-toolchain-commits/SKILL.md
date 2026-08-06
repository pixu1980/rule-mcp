---
name: rule-toolchain-commits
description: >-
  Use whenever writing, preparing, or validating git commits and pushes. Enforces atomic Conventional Commits with a MANDATORY scope on every commit — no bare `fix:` allowed.
tags:
  - "git"
  - "commit"
  - "push"
  - "conventional-commits"
  - "atomic"
  - "hooks"
  - "commitlint"
frameworks: [all]
---

# rule-toolchain-commits — Atomic Conventional Commits (scope mandatory)

## Commit rule (non-negotiable)

**Every** commit MUST be an atomic Conventional Commit with a scope:

```
<type>(<scope>): <imperative subject>
```

- The `scope` is **always required**. A bare `fix: message` is **rejected**.
- One logical change per commit (**atomic**). No exceptions — not for WIP, not for "fix of fix", not for merge noise.
- This applies to every developer, every branch, every repository in the rule ecosystem.

## Commit types

| Type       | Use when                                |
| ---------- | --------------------------------------- |
| `feat`     | New user-visible or API feature         |
| `fix`      | Bug fix                                 |
| `refactor` | Internal change with no behavior change |
| `perf`     | Performance improvement                 |
| `docs`     | Documentation only                      |
| `test`     | Tests only                              |
| `chore`    | Maintenance, tooling, deps, config      |
| `build`    | Build system / bundler changes          |
| `ci`       | CI pipeline changes                     |
| `style`    | Formatting, no logic change             |
| `revert`   | Reverting a previous commit             |

## Commit scope

- The scope is the module, domain, or area the change touches — e.g. `fix(skills): ...`, `feat(router): ...`, `docs(adr): ...`.
- Reuse existing file/module/package names. Do **not** invent new scopes.
- Exactly **one scope per commit**. If a change spans multiple areas, split it into multiple commits.

## Commit subject

- Imperative mood: "add", "fix", "remove" — never "added", "fixes", "removing".
- ≤ 50 characters when possible, hard cap 72.
- No trailing period. Lowercase after the colon unless the first word is a proper noun.

## Commit body

- Add a body **only** when the "why" is not obvious from the subject: non-obvious reasoning, migration notes, linked issues (`Closes #42`).
- Never restate the diff. Wrap at 72 chars, bullets `-` not `*`.
- **Breaking change**: add `!` after the type/scope (`feat(api)!: ...`) and a `BREAKING CHANGE:` footer describing the migration.

## Atomic commits

- Split unrelated changes before committing: `git add -p` to stage hunks selectively, or create separate commits/branches.
- Each commit should build and pass its tests on its own (when feasible).
- Never mix concerns in one commit (e.g. a `feat` bundled with an unrelated `chore`).
- A commit is the smallest unit that can be **reviewed**, **reverted**, and **released** safely.

## Push

- Before pushing: run the pre-push checks, `git pull --rebase` on the target branch, and verify the commit message again.
- Never force-push to `main`/`develop` or shared branches.
- Never push a commit that does not follow this rule — fix it locally first with `git commit --amend` or a new commit.

## Enforcement (make it mechanical)

Do not rely on discipline — enforce with hooks so a violating commit is **rejected**:

1. **`commit-msg` hook** (no Husky needed) — reject any message without `type(scope):`:

```sh
#!/bin/sh
# .githooks/commit-msg
msg_file="$1"
msg=$(cat "$msg_file")
if ! echo "$msg" | grep -qE '^(feat|fix|refactor|perf|docs|test|chore|build|ci|style|revert)(\([a-z0-9_-]+\)!?): '; then
  echo "ERROR: commit message must be 'type(scope): subject' (scope REQUIRED, e.g. fix(skills): ...)" >&2
  exit 1
fi
exit 0
```

2. **Husky + commitlint** (full validation): see [rule-toolchain-husky](../rule-toolchain-husky/SKILL.md) for setup. Enforce the mandatory scope with `commitlint.config.js`:

```js
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [2, "always", ["skills", "router", "detector", "docs", "adr", "core", "tools", "cli", "hooks"]],
  },
};
```

3. **Pre-push validation**: add a `pre-push` hook running `git diff --check` and the linter/tests (see [rule-toolchain-husky](../rule-toolchain-husky/SKILL.md)).

## See also

- [rule-toolchain-husky](../rule-toolchain-husky/SKILL.md) — Git hooks, commitlint, lint-staged setup
- [rule-devops-version](../rule-devops-version/SKILL.md) — Automatic version bumps driven by commit types
- [rule-process-feature-workflow](../rule-process-feature-workflow/SKILL.md) — Commit rules inside the feature delivery workflow
- [rule](../rule/SKILL.md) — Central skill index and dispatcher

---
