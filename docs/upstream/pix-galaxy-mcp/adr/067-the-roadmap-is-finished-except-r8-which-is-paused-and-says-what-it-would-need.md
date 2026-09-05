# 067: The roadmap is finished except R8, which is paused and says what it would need

- **Date**: 2026-09-01
- **Status**: accepted
- **Tags**: roadmap, planning, skills, tools, documentation
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Eight phases were planned after the token-first upgrade. Seven closed, each with its own ADR: R0 (049), R1 (052), R2 (053), R3 (054), R4 (055), R5 (056 and 061), R6 (064), R7 (062). R8, the modern platform skills, shipped one milestone of seven.

Plans and handoffs are being removed from this repository, so what those files uniquely held has to survive somewhere or stop existing. The roadmap held the only record of unfinished work, and this is it.

## Decision

**R8 is paused after M1, not abandoned and not finished.** `rule-styleguide-baseline` shipped: three support states rather than a percentage, what a fallback actually costs, progressive enhancement, and the project declaring its own floor. Every later distillate was meant to annotate against it, and now can.

It stopped for one reason. The plan is sized and argued from "103 features and 131 use cases across fourteen categories", and that artifact could not be found. Writing the remaining skills from other material would build a different corpus than the one the plan reasoned about, so the phase waits rather than quietly substituting its inputs.

**Two decisions were taken while the phase was still fresh, so nobody re-derives them.**

_The tool surface question is answered and was not acted on._ ADR 055 handed it here with a number and it was measured again: the 89 per-skill tools are about 80% of what `tools/list` costs on every turn, the skill path carried 7.7% of calls, and exactly one of the eighty-seven skill tools had ever been called. The trim was therefore available and larger than any raise. The decision was to raise the ceiling to 20,000 and keep every tool advertised. `src/core/tool-budget.js` records that, because that file's own rule is to say so when a trim exists and is skipped. The sample is still one machine.

_When R8 resumes it adds sections, not skills._ The five-skill table in the plan is superseded. Part of the gap it was written to close has closed since, mostly through R6: `<dialog>` now appears in ten files, popover in six, `<details>` in seven, `inert` in four, and the router sends "build a modal dialog" to the section that names the native element. The ninety-line hand-rolled modal the plan called the worst outcome on its list is no longer the likely one.

**What is still absent from the whole corpus**, and is what a resumed R8 is for: scroll-driven animation, speculation rules, `@property`, customizable `<select>`, on-device model APIs, `:has()`, and view transitions as a platform feature rather than as an Astro component.

## Consequences

`docs/plans/` and `docs/handoff/` are removed. The ADR log is the only surviving record, which is what `docs/README.md` now says.

That has a cost worth naming. The resume mechanism built across ADRs 052, 057, 059 and 060 reads `docs/handoff/`, so it has nothing to read until the next `/rule-handoff` writes one. The mechanism is intact; the directory is empty. `pix_process_handon` on an empty directory reports that there is nothing to verify, which is correct rather than broken.

The ordering rationale that the roadmap carried is gone: why the risky cache work waited for the safe cache work, why the articles blocked nothing, why R7 came last. The decisions those arguments produced are in the ADRs; the arguments are in git.
