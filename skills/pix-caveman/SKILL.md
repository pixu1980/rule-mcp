---
name: rule-caveman
description: >-
  Use when writing anything a human will read: answers, commit messages, code reviews, docs. Covers the compression rules, the intensity levels, what must never be compressed, and how the server enforces the output style deterministically.
tags:
  - caveman
  - compression
  - compress
  - tokens
  - terse
  - concise
  - commits
  - review
  - writing
frameworks: [all]
---

# rule-caveman - Say it in fewer tokens

## Purpose

Every token saved is a token earned. Filler costs money on the way out and
context on the way back in, and it carries no information: a reader who deletes
"I'd be happy to help you with that" loses nothing.

Compression is not brevity. Brevity drops content; compression drops packaging.
Every technical fact, path, flag, number and error string survives verbatim.

## Make a verbose answer shorter: compression rules

Drop:

- Articles before a noun: "the router caches" becomes "router caches".
- Filler adverbs: `just`, `really`, `basically`, `actually`, `simply`, `very`, `quite`.
- Pleasantries: `sure`, `certainly`, `of course`, `happy to`, `great question`.
- Throat-clearing openers: `It is worth noting that`, `Keep in mind that`.
- Hedging that carries no probability: `it seems that`, `arguably`.

Keep, always:

- Code, in fences and in inline spans.
- Paths, identifiers, flags, version numbers, error strings, quoted verbatim.
- Numbers and units.
- The reason a thing is true, when the reason is the answer.

Shape: `[thing] [action] [reason]. [next step].`

Not this:

> Sure! I'd be happy to help. The issue you are experiencing is most likely
> being caused by a problem in the authentication middleware.

This:

> Bug in auth middleware. Token expiry check uses `<` not `<=`. Fix:

## Intensity levels

| Level | What changes                                                        |
| ----- | ------------------------------------------------------------------- |
| lite  | Pleasantries and hedging go. Sentences stay whole.                  |
| full  | Articles and filler go too. Fragments are fine. Default.            |
| ultra | Telegraphic. Only for lists, tables and status lines a human scans. |

Pick `lite` for anything a stranger reads. Pick `ultra` only where structure
already carries the meaning.

## When NOT to compress

Compression removes redundancy, and redundancy is what makes a warning survive
a skim. Write these in full sentences:

- Security warnings and anything about credentials or data loss.
- Confirmation of an irreversible action: dropped table, force push, deploy.
- Multi-step sequences where reading the steps out of order would break them.
- Any answer to "I don't understand" or a repeated question.

Resume compression once the careful part is delivered.

## Compressed commit messages

Conventional Commits with a mandatory scope: `type(scope): subject`. The
`commit-msg` hook rejects a scope-less message.

- Subject: imperative, lowercase, no trailing period, 50 characters or fewer.
- Body: only when the _why_ is not obvious from the diff. Explain the reason
  the change exists, not the mechanics the diff already shows.
- Never describe the file list. The diff is the file list.

```
fix(auth): compare token expiry with <= not <

A token expiring exactly on the boundary second was rejected, so a
client that refreshed on schedule saw one failed request per hour.
```

## Compressed code review comments

One line per finding: location, problem, fix.

```
src/auth.js:42 - expiry check off by one, use <=
src/api.js:88 - unbounded Promise.all over user input, cap concurrency
```

No preamble, no praise sandwich, no restating the code back at the author.
Severity goes first when the list is long enough to need ordering.

## Deterministic passes the server runs on every result

Compression is not left to memory. Two deterministic passes run on every tool
result, both opt-out:

| Pass        | Module                    | What it removes                           | Opt-out                           |
| ----------- | ------------------------- | ----------------------------------------- | --------------------------------- |
| Caveman     | `src/core/caveman.js`     | Filler, leading articles, blank-line runs | `RULE_MCP_NO_CAVEMAN=1`     |
| Fingerprint | `src/core/fingerprint.js` | Em dashes, curly quotes, British spelling | `RULE_MCP_NO_FINGERPRINT=1` |

Both skip fenced code, inline spans, URLs and JSON, and both are idempotent.
Call `pix_compress` to run the same passes over arbitrary prose before
writing it out.

## Never spawn subagents

NEVER spawn subagents for research or implementation - they burn tokens. Use
rule tools (deterministic, LLM-free) and tokensave (code graph) instead. A
subagent pays for a whole fresh context window to answer what a tool call
answers for nothing.

## See also

- [rule-styleguide-fingerprint](../rule-styleguide-fingerprint/SKILL.md) - the character and spelling rules in full
- [rule-toolchain-commits](../rule-toolchain-commits/SKILL.md) - the commit convention this compresses
- [rule-process-code-review](../rule-process-code-review/SKILL.md) - what to look for before compressing the comment
- [rule-process-simplicity](../rule-process-simplicity/SKILL.md) - the same discipline, applied to code
