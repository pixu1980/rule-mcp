---
name: rule-styleguide-comments
description: >-
  Use when writing or reviewing code comments. Covers what a comment is for, the three kinds that should never be committed - commented-out code, code kept for future use, and change history - and what to write instead.
tags:
  - comments
  - code-review
  - documentation
  - dead-code
  - history
frameworks: [all]
guardrails: [no-commented-out-code, no-future-use-code, js-comment-no-history]
---

# rule-styleguide-comments - A comment states a constraint the code cannot

Write a comment to say something the code itself cannot: a constraint, a
reason, an invariant that is not local. Never to restate what the next line
does, never to say where the code came from, never to argue that the change is
correct. That last one is the author talking to the reviewer, and it is noise
the moment the change merges.

## What never ships

- **Commented-out code.** Version control remembers it; the comment does not.
  A reader cannot tell whether it is a fix in progress, a rollback, or debris.
- **Code kept for future use.** A block held behind a comment for a feature
  nobody has asked for is a guess with a maintenance cost. Delete it and write
  it when the feature arrives.
- **Change history.** `// changed 2026-03 by ...`, `// was: foo`, `// TODO
remove after the migration`. Git already answers who and when, and answers
  it correctly after the file moves.

## What to write instead

State the constraint and the cost of breaking it:

```js
// The pid file is removed only once the process is gone: removing it after a
// single SIGTERM would throw away the only record of a daemon that ignored
// the signal.
```

A comment like that survives a rewrite of the lines beneath it, which is the
test of whether it was worth writing.

## See also

- `rule-styleguide` - the styleguide hub these rules belong to
- `rule-styleguide-naming` - what a file is called, before what is inside it
- `rule-process-code-review` - where these rules are applied to someone else's change
