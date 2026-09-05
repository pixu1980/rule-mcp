# 066: Lint and format become gates, and the two tools stop undoing each other

- **Date**: 2026-09-01
- **Status**: accepted
- **Tags**: lint, prettier, eslint, ci, guardrails
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The repository declared two quality tools and enforced neither in a way anyone saw.

`pnpm run lint` allowed fifty warnings and was carrying forty-two, a budget nine short of its own contents. It was not in the `ci` script at all. `pnpm run format` failed on 396 files. Both were steps in the GitHub `Lint + Format` job, which never reported because that job runs on `main` and on pull requests, and the work had been on a branch for weeks.

So the state was: two gates, both red, neither visible, one of them not wired into the local chain.

## Decision

**ESLint errors go to zero and the warning threshold goes to zero with them**, in the script and in the workflow. Thirty-three of thirty-five errors came out with `--fix` and each change was read; forty-two warnings were cleared one at a time.

Two autofixes were refused because both would have been defects:

- `unicorn/prefer-https` wanted `http://www.w3.org/ns/earl#` rewritten in the EARL context of `pix_a11y_report`. That is an IRI, not a URL to fetch: RDF terms compare byte for byte, so https would emit a vocabulary nothing resolves.
- `unicorn/prefer-set-methods` wanted `Set#intersection` where the router filters `next_tools`. That list is ranked, and the order the specification gives an intersection depends on which set is smaller, so it would hold today and quietly stop holding when the registry or the suggestion count moved.

**Prettier runs over everything, and where it fought another tool the fight was settled rather than formatted away.**

`unicorn/number-literal-case` wants uppercase hex digits and Prettier writes them lowercase; each `--fix` reverted the other, seventy-five errors either way. The rule is off. **When a formatter is in the pipeline, formatting is its job.**

Generated files are not formatted. `docs/adr/ADR.md` and `src/core/wcag-data.js` come out of generators, and reformatting them made the byte-for-byte assertion in `test/adr-index.test.mjs` fail on the next `pix_process_adr`. Both are in a new `.prettierignore`, and the scripts name it explicitly, because **`--ignore-path` replaces the default rather than adding to it** and the file was being read by nobody.

One document made Prettier unstable rather than merely unformatted: two list items separated from their parent by a blank line and indented thirty-four spaces, which reads as neither a nested list nor a code block. Prettier added four spaces on every pass and never converged. The list is ordinary now.

**`lint` heads the `ci` chain**, three seconds before six minutes of tests, and the workflow calls `pnpm run lint` and `pnpm run format` rather than repeating their commands, so the local gate and the remote one cannot drift.

## Consequences

**Reading warnings found two defects that no test reported**, both in the installer and both fixed under ADR 063: a documented `--force` flag that nothing read, and configuration written without a backup while the writer that takes one sat unused. A threshold that allows forty-two warnings is a place for that to hide.

A third defect came out of the same pass and is fixed here rather than in its own ADR, because it is a one-line correction to a regular expression. `js-no-inline-blocks` had no word boundary, so `for` matched inside `platform`, `before` and `information`, and its block body allowed newlines, so it flagged the multi-line blocks the rule exists to require. A JSDoc `@param {HTMLElement}` after any such word was a violation. Measured across the corpus: **83 of 265 JavaScript blocks were false positives.** That is most of what the project had recorded as `pix_check` being unreliable on its own source.

The remaining `pix_check` false positives are not fixed. `jsdoc-required` and the blank-line family still fire on committed code, so a clean guardrail run is still not a gate the way lint now is.

Prettier reformats the code inside fenced blocks in the skills, so teaching examples got expanded from one-liners. That is a content change made by a formatter, accepted deliberately as the price of the gate being green.
