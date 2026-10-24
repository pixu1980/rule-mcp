---
name: rule-mcp-process-changelog
description: >-
  Use when a project needs a CHANGELOG, when deciding where changelog entries come from, or when one has drifted from the commits. Covers generating it from conventional commits, which commit types earn an entry, and why the release tag is the moment to build it rather than the commit hook.
tags:
  - changelog
  - conventional-commits
  - release
  - versioning
  - automation
  - git
  - keep-a-changelog
frameworks: [all]
---

# rule-mcp-process-changelog - Derive it from the commits, at the tag

## Purpose

A hand-written changelog is a second record of what the commits already say,
and it is the copy without a generator behind it, so it goes stale first. It
also tends to grow into paragraphs that retell an architecture decision, which
is a third copy of something the ADR already holds.

**Generate it from the commits.** The history is structured data if the commit
messages are, and enforcing that is a single hook.

## The prerequisite: every commit is parseable

`type(scope): subject`, enforced by a `commit-msg` hook that rejects anything
else. Without it there is nothing to generate from, and adding the hook later
means a changelog that starts mid-history.

```sh
#!/bin/sh
first="$(sed -n '1p' "$1")"
case "$first" in "Merge "*|"Revert "*) exit 0 ;; esac
printf '%s\n' "$first" | grep -Eq '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)\([a-z0-9._-]+\): .+$' && exit 0
echo "commit-msg: conventional commit WITH scope required" >&2
exit 1
```

**A hook in the repository is not an installed hook.** It has to be copied into
`.git/hooks/`, or `core.hooksPath` has to point at it. A rule documented and
uninstalled is a rule enforced by nobody, and the way you find out is a commit
that violates it.

## When to generate the changelog

**At the release tag.** Not in a commit hook, and here is why, because the hook
is the tempting answer:

| Moment           | What goes wrong                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pre-commit`     | Every branch rewrites the same file from its own history, so **every merge conflicts**                                                   |
| `pre-commit`     | The hook runs before the commit exists, so each commit ships the changelog of its parent                                                 |
| `pre-commit`     | A rebase rewrites every hash, so every entry it generated is wrong afterwards                                                            |
| End of a session | Session cadence and release cadence are different; ten sessions before a release is ten commits, one session across ten releases is none |
| **Release tag**  | Every commit exists, hashes are final, the file changes once per release                                                                 |

The conflict is the one that decides it, and it is not theoretical: two branches
that each commit produce two different generated files, and the merge stops with
a conflict whose only correct resolution is "regenerate", every time.

A changelog answers **"what changed between 1.1 and 1.2"**. Its reader installs
the package. Per-commit regeneration serves that reader nothing and costs
everyone a conflict.

So: generate in the release job, offer `pnpm changelog` for reading it mid-work,
and let the generator's own tests be what CI gates.

## Do not gate the changelog on being current

The obvious CI check, asserting the committed file equals the generator's
output, does not work: the unreleased section changes with every commit, so the
build fails on the commit after any regeneration. It recreates the hook's
problem with a red build instead of automation.

**Gate on shape instead.** Every entry line matches the generated form, and the
header is the generated header. That catches the failure worth catching, which
is somebody hand-writing prose back into the file, and it stays true between
commits.

## Which commit types earn a changelog entry

| Type                                    | Section       |
| --------------------------------------- | ------------- |
| `feat`                                  | Added         |
| `fix`                                   | Fixed         |
| `perf`, `refactor`                      | Changed       |
| `revert`                                | Removed       |
| `docs`                                  | Documentation |
| `chore`, `ci`, `build`, `test`, `style` | **no entry**  |

A changelog that lists a dependency bump is one nobody reads. The dropped types
are still in `git log`, and the file should say that it drops them so a reader
is not left wondering where a commit went.

**A breaking change keeps its type's section and carries a mark.** A breaking
feature is still an addition; routing it to Changed loses what it was. Detect it
from `!` after the scope or `BREAKING CHANGE:` in the body.

## Releases come from tags

Commits after the newest tag are unreleased. A repository with no tags yet
produces a single unreleased section rather than an empty heading, which is the
case every project is in on its first day.

In CI the checkout must be complete. A shallow clone has no tags and one commit,
so it produces a changelog describing one commit:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

## The entry itself

```
- **installer**: back up before writing (`ade151b`)
- **BREAKING** **api**: the receipt is required (`36016f6`)
```

The scope leads, because it is what tells a reader whether the line concerns
them. The hash makes the entry traceable without making it noisy.

**Clean the rendered subject, never the commit.** Older messages carry
typographic characters and spellings the house style rejects, and history is
immutable while the rendered line is not. Run the same prose pass over the
subject that the project runs over anything else it publishes.

## A generated file is not formatted by hand

Add it to the formatter's ignore list, beside the other generated files. A
formatter that rewrites generated output makes the next generation a diff, and
any byte-for-byte test around it fails on a file nobody edited.

## Checklist

1. Is `type(scope): subject` enforced by an **installed** hook?
2. Does the generator read tags for releases, and tolerate having none?
3. Is it run at the release tag, with a complete checkout?
4. Is there an on-demand script for reading it mid-work?
5. Does CI gate the generator's behavior rather than the file's freshness?
6. Is the file in the formatter's ignore list?
7. Does the file say which commit types it leaves out?

---

## See also

- [rule-mcp-styleguide-git](../rule-mcp-styleguide-git/SKILL.md) - The commit
  convention this depends on, and the hook that enforces it
- [rule-mcp-process-npm-release](../rule-mcp-process-npm-release/SKILL.md) - The
  release the changelog is generated for
- [rule-mcp-process-adr](../rule-mcp-process-adr/SKILL.md) - Where the reasoning
  behind a change belongs, so the changelog does not retell it
- [rule-mcp-process](../rule-mcp-process/SKILL.md) - The process skill index

---
