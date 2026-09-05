# 053: Handon verifies a handoff rather than summarizing it

- **Date**: 2026-08-31
- **Status**: accepted
- **Tags**: handon, handoff, tooling, determinism, tokens

- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

`pix_process_handoff` writes the account of a session and the `/rule-handoff` prompt persists it to `docs/handoff/<NN>-<slug>.md`. Nothing read it back. Resuming meant a person opening the file, and that has two costs. The file is written in the present tense and stays that way: "the fix is on `feat/x`, the suite is green, ADR 046 is pending" can be wrong in all three clauses a week later, and nothing in the file marks which. And the whole thing gets pasted to re-establish context, when most of a handoff is narrative the resuming reader already lived through. Asking a model to "read the last handoff and tell me where we are" does not fix either problem: it will restate the text with the confidence of the original, because that is what it was handed, and it will not check whether the branch still exists or whether the ADR landed.

## Decision

`pix_process_handon` parses what a handoff claims and checks each claim against the repository as it is now: branch existence and whether it merged, how many commits landed after the range the handoff covers, whether each file in flight is unchanged, modified or deleted, the current status of every referenced ADR, the open checklist items, and any command the handoff said was passing. Three rules make the answer worth trusting. It is read-only, so no checkout, no stash and no write - only git plumbing that reports, with arguments passed as an array rather than interpolated, because a branch name out of a handoff file is input. It never re-runs a claimed command: that takes minutes and sometimes writes files, so it reports the claim and its age and lets the reader decide. And it never guesses - a claim it cannot check is reported as unverified, which is a real answer, where "probably still fine" is exactly how a stale handoff does its damage. Output is grouped as still true, changed since, unverified, then the open items and one suggested first move that names its reason. Three surfaces as usual: the MCP tool, `rule-mcp handon`, and `/rule-handon`. It joins the cache denylist for the same reason `pix_detect` is on it - a replayed answer would describe a repository that has moved.

## Consequences

On this repository's own handoff the report is 786 characters against 3,257, so a resume costs a quarter of a paste. The fixtures paid for themselves immediately: a scripted repository where the branch merged, one file was deleted, another modified and the pending ADR landed caught two real defects on first run. `test/tool-surface-budget.test.mjs` names a branch prefix and a file extension in the same string, so `test/tool-surface-budget.test.mjs` was being reported as a branch that never existed - the extension check is what separates a branch from a path. And `src/core/telemetry*.js` is a glob, which matched nothing on disk and was therefore reported as deleted, a fabricated fact drawn from a real handoff. Both are now excluded by shape. The tool surface went over its ceiling here: a trim came first and was real, six `include*` booleans on the handoff schema carried descriptions restating their own property names, but 69 tokens do not pay for a 150-token tool. The budget moves once, from 16,500 to 16,800, and `src/core/tool-budget.js` records that R4 will not fit under that either and should weigh whether ninety tool entries is still the right shape.

## Alternatives Considered

1. A prompt that tells the model to read the handoff and check it. Rejected: verification is mechanical, and a model given a confident text reproduces its confidence.
2. Re-run the commands the handoff claimed were green. Rejected: minutes of wall clock, and some of them write files, which breaks the read-only guarantee that makes the tool safe to run first.
3. Rewrite the handoff file in place with current facts. Rejected: it would destroy the record of what was believed at the time, which is the only thing a handoff is for.
