# 046: Vendor WCAG and make the conformance report refuse to overstate itself

- **Date**: 2026-08-29
- **Status**: accepted
- **Tags**: a11y, wcag, guardrails, determinism, tools
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Accessibility had two guardrails, semantic-html and a11y-test-required, and neither cited a success criterion. That left the whole determinism story missing on the one topic where the output is a claim someone may have to defend in front of a regulator. The W3C ships an evaluation methodology for this, WCAG-EM, and a tool that implements it, but that tool is a Svelte application with no npm package: it is not something to depend on. Separately, a report written by a model has a specific failure mode that matters more here than elsewhere. Asked to summarize an accessibility review, a model reports on the criteria it was told about and says nothing about the other forty. The gap between "we checked twelve things" and "we conform at AA" is exactly where a conformance claim goes wrong, and prose cannot be relied on to close it.

## Decision

Vendor the criteria rather than fetch them. src/core/wcag-data.js is generated from the W3C's published WCAG 2.2 JSON by scripts/update-wcag-data.mjs, exposed as `rule-mcp a11y-update`, which is the only place this project touches the network for data. WCAG 2.2 is a Recommendation, not a feed, so a deliberate sync is the right cadence and every a11y answer stays deterministic and cacheable. Add pix_a11y_report, which turns per-criterion outcomes into a WCAG-EM structured report plus EARL JSON-LD, and which enforces four rules that a prose report cannot: every criterion in the conformance target appears, anything not reported comes back as untested rather than being omitted, an unknown criterion number or EARL outcome is an error rather than a silent skip, and any failure, cantTell or untested blocks the claim. Add nine a11y guardrails covering the regex-decidable subset, each carrying the criterion it enforces, and propagate that field through checkCode so a failure reads "1.1.1 Non-text Content" rather than "add an alt".

## Consequences

The skill states plainly that nine guardrails out of 55 criteria is a floor and not an audit: contrast needs rendering, and whether alt text is meaningful or focus order matches reading order needs a person. Claiming otherwise would be the most expensive kind of false confidence, so the limitation is documented next to the table rather than left implied. wcag-data.js is excluded from the prose cleanup pass on two grounds: it is generated, so a hand edit diverges from its generator, and criterion titles are normative text that must not be restyled. The same pass had a defect this phase exposed for the third time - it listed only tracked files, so brand new files passed a clean scan precisely when they were most likely to need it - now fixed with --others --exclude-standard. Tool surface grows to 98, and pix_a11y_report joins the minimal surface because in that mode the skill tools are unreachable and a conformance report is an action rather than guidance.
