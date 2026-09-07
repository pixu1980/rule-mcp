---
name: rule-toolchain-commits
description: >-
  Use whenever writing, preparing, or validating git commits and pushes. Enforces atomic Conventional Commits with a MANDATORY scope on every commit - no bare `fix:` allowed.
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

# rule-toolchain-commits - Atomic Conventional Commits (scope mandatory)

## Commit rule (non-negotiable)

**Every** commit MUST be an atomic Conventional Commit with a scope:

```
<type>(<scope>): <imperative subject>
```

- The `scope` is **always required**. A bare `fix: message` is **rejected**.
- One logical change per commit (**atomic**). No exceptions - not for WIP, not for "fix of fix", not for merge noise.
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

- The scope is the module, domain, or area the change touches - e.g. `fix(skills): ...`, `feat(router): ...`, `docs(adr): ...`.
- Reuse existing file/module/package names. Do **not** invent new scopes.
- Exactly **one scope per commit**. If a change spans multiple areas, split it into multiple commits.

## Commit subject

- Imperative mood: "add", "fix", "remove" - never "added", "fixes", "removing".
- <= 50 characters when possible, hard cap 72.
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

## Branch names

Same vocabulary as the commit types, so a branch announces its own kind of
change: `feat/`, `fix/`, `refactor/`, `chore/`, `docs/`, `test/`, and `hotfix/`
for the urgent production path. Format is `<prefix>/<short-kebab-description>`.

Three names that keep appearing and should not:

- **An author name.** The branch belongs to the change, not the person; the
  author is already in every commit.
- **A bare ticket number.** `1423` requires a second lookup to mean anything.
  Put the id in the description if it helps: `fix/1423-duplicate-invoice`.
- **`update` or `fixes`.** Generic to the point of being no name at all. The
  opposite failure, a name that repeats the whole ticket title, is only slightly
  better.

## Merge requests

- Title follows the same Conventional Commits format, scope included.
- Description says what changed, why, and how to verify it. Screenshots for UI.
- Squash into `develop`; rebase `develop` into `main`.
- Pipelines green and at least one approval before merge - both, not either.

## Push

- Before pushing: run the pre-push checks, `git pull --rebase` on the target branch, and verify the commit message again.
- Never force-push to `main`/`develop` or shared branches.
- Never push a commit that does not follow this rule - fix it locally first with `git commit --amend` or a new commit.

## Three ways to ignore a file, and which one your case needs

`.gitignore` is one of three, and it only works on files git has never seen.
Answer this first:

```bash
git ls-files --error-unmatch path/to/file   # prints the path: tracked. errors: untracked
```

| Situation                                          | Use                                       | Notes                                                                                 |
| -------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| Untracked, and the whole team should ignore it     | `.gitignore`                              | Committed, shared, reviewed                                                           |
| Untracked, and it is only your mess                | `.git/info/exclude`                       | Same syntax, never committed. For scratch files nobody else should have to read about |
| Untracked, and it is your mess in every repository | `core.excludesfile`                       | `git config --global core.excludesfile ~/.gitignore_global`                           |
| Tracked, and you keep a local variant on purpose   | `git update-index --skip-worktree <path>` | The override sticks. Undo with `--no-skip-worktree`                                   |

**Adding a tracked file to `.gitignore` does nothing.** It keeps being tracked
and keeps appearing in diffs. Untrack it first, in its own commit, and expect it
to disappear from everyone's checkout when they pull:

```bash
git rm --cached path/to/file
```

**Do not reach for `--assume-unchanged` to hold a local edit.** It is a
performance hint that says nothing here is changing, and git is free to stop
believing it: a pull can clear the flag, and the local secret you forgot about
is staged again. `--skip-worktree` says the difference is deliberate, which is
the thing you actually meant. `git ls-files -v` shows the flags, lowercase `h`
for assume-unchanged and uppercase `S` for skip-worktree.

## Getting work back

Most of what feels lost in git is reachable. `git reflog` lists where HEAD has
been, including the commit a bad reset left unreferenced, so `git reset --hard
<hash>` from that list is usually the whole recovery. It is the first command to
reach for after any destructive mistake, before trying anything cleverer.

The rest, by the question they answer:

| Question                                                  | Command                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| Which commit introduced this?                             | `git bisect`                                                 |
| Who wrote this line and in what change?                   | `git blame`, then `git show` on the hash it names            |
| What does this history actually look like?                | `git log --graph --oneline --decorate`                       |
| Can I take just this commit?                              | `git cherry-pick <hash>`                                     |
| Can I park this and come back?                            | `git stash push -m "..."`, `git stash list`, `git stash pop` |
| Can I work on another branch without disturbing this one? | `git worktree add ../branch-name branch-name`                |
| How do I remove untracked junk?                           | `git clean -nd` first, always, then `-fd`                    |

Two cautions. `git reset` and `git rebase` rewrite history, which is safe before
a push and a coordination problem after one. And `git clean -fd` deletes files
git has never seen, so the dry run is not optional.

## Enforcement (make it mechanical)

Do not rely on discipline - enforce with hooks so a violating commit is **rejected**:

1. **`commit-msg` hook** (no Husky needed) - reject any message without `type(scope):`:

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

## Conventions (rules -> skills merge)

# Commits and Branches Rules

## Branch naming

Use the following prefixes:

- `feat/` - New feature
- `fix/` - Bug fix
- `refactor/` - Code refactoring without behavior change
- `chore/` - Tooling, dependencies, CI changes
- `docs/` - Documentation only
- `test/` - Adding or updating tests
- `hotfix/` - Urgent production fix

Format: `<prefix>/<short-kebab-description>`

### Branch naming rules

- Never use author names as branch names
- Do not use only a number or ID as the branch name
- Avoid overly generic or excessively long names

## Commit messages

Follow **Conventional Commits** specification (v1.0.0):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Usage                                        |
| ---------- | -------------------------------------------- |
| `feat`     | New feature                                  |
| `fix`      | Bug fix                                      |
| `refactor` | Refactoring without behavior change          |
| `chore`    | Tooling, deps, CI                            |
| `docs`     | Documentation                                |
| `test`     | Tests                                        |
| `perf`     | Performance improvement                      |
| `ci`       | CI pipeline changes                          |
| `style`    | Formatting (handled by Biome, rarely manual) |

### Scope

Use the package or module name: `backend`, `frontend`, `agent`, `docker`, `ci`, `docs`.

### Rules

- Subject line: imperative mood, lowercase, no period, max 72 characters.
- Body: wrap at 80 characters. Explain _what_ and _why_, not _how_.
- Breaking changes: add `BREAKING CHANGE:` footer or `!` after type.
- Reference GitLab issues: `Closes #123` or `Refs #456`.

## Merge request conventions

- Title follows the same Conventional Commits format.
- Description includes: what changed, why, how to test, screenshots if UI.
- Squash merge into `develop`. Rebase merge from `develop` into `main`.
- All pipelines must pass before merge.
- At least one approval required.

## See also

- [rule-toolchain-husky](../rule-toolchain-husky/SKILL.md) - Git hooks, commitlint, lint-staged setup
- [rule](../rule/SKILL.md) - Central skill index and dispatcher

---
