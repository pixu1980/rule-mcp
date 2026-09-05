# 051: A drawn box is a rectangle, and the house spelling reaches every file

- **Date**: 2026-08-31
- **Status**: accepted
- **Tags**: fingerprint, output, guardrails, ascii, house-style
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Two gaps in the same rule, found by looking rather than by a test failing.

The first was reach. `scripts/clean-prose.mjs` scanned `*.js`, `*.mjs` and `*.md`, which is where skills and documentation live and is not where everything lives. British spelling had been sitting undisturbed in the installers, in PowerShell, in `package.json` and in `docs/adr/`, the last of which was skipped on the reasoning that an accepted decision is not rewritten - true of the decision, and not true of the spelling of the word describing it. Thirty-six spellings and two ADR filenames were outside the scan entirely, so the report said zero while the repository said `catalogue`.

The second was a fingerprint nothing looked for. Fourteen closed ASCII boxes in this repository, and all fourteen were ragged: a top border one column short of the longest row, a right edge stepping in and out down the diagram. It happens for a structural reason - the characters are chosen a line at a time and nothing counts the columns - and it is the most visible tell there is, because a reader who would otherwise have trusted the diagram now knows nobody looked at it. Unlike an em dash or a British spelling, no spell-check sees it.

## Decision

Both become deterministic passes rather than things to remember.

`src/core/ascii-box.js` finds each complete box - an opening corner, frame lines at the same indentation, a closing corner - and pads the short lines out to the widest line of that box, repeating whatever the line is drawn from: a dash for a border, a space for a row of content. It is deliberately narrow, and the narrowness is the safety argument. It never truncates, never moves content, never realigns an inner separator and never invents a missing border; anything it cannot fix that way it reports through `findRaggedBoxes` instead of guessing. Boxes are grouped by their opening corner and its indentation, so a small inset box beside a full-width one keeps its own size. It runs last in `finalizeResult`, after compression and fingerprint removal, because it counts columns and has to see the final characters. `fp-box-rectangular` joins the fingerprint guardrails and fails on what is left.

The spelling pass now covers every tracked text file - shell, PowerShell, YAML, TypeScript, CSS, HTML - with three exclusions that are load-bearing rather than convenient: `fingerprint.js` IS the British-to-American dictionary, its test file IS the fixtures, and `wcag-data.js` is vendored W3C text whose criterion titles are normative. `CHANGELOG.md` and `docs/adr/` lose their exemption. One new distinction came out of applying it: the installers use an arrow and a bullet to draw a picker, and rewriting those to `->` and `-` makes a worse picker, so `stripFingerprint` gained a `spellingOnly` mode for files whose strings are interface rather than prose. The report counts the same way the pass runs, so a zero means nothing is left to fix and not that nothing was looked at.

## Consequences

`node scripts/clean-prose.mjs` reports zero across 548 files rather than 451, and the number now includes ragged box lines. Two ADRs were renamed to match their americanized titles, along with `test/install-agent-catalog.test.mjs` and the `package.json` line that runs it. The README architecture diagram was rebuilt by hand: the automatic pass squares the outer edge, and the inner column grid was misaligned in a way no safe transform can repair, which is the honest boundary of what a pass that refuses to move content can do. Stacked boxes of different widths stay different widths - each is a rectangle, and harmonizing them across a diagram would be a layout opinion rather than a defect fix. The skill documenting all this prints no ragged example on purpose, because the pass would square it on the next run.
