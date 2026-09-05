# performance review

- **Role**: performance v1
- **Date**: 2026-09-04

Findings distilled from [the audit](../audits/performance.md). A finding this run no longer reports is
flipped to resolved and kept one run for visibility, then removed.

| Finding | Severity | Status | Evidence | Summary |
| --- | --- | --- | --- | --- |
| PERF-1 | low | resolved | docs/audits/performance.md#suites | Attributed and cut: ci is 118.2s -> 82s by batching, but the floor is now process-hygiene at 25.6s, which starts real processes |
| PERF-2 | low | resolved | docs/audits/performance.md#startup | The index half is cached (95ms -> 18ms, CLI 0.76s -> 0.28s); the 263ms loadAllSkills spends reading 91 skills is untouched |
| PERF-3 | low | open | docs/audits/performance.md#guardrails | A guardrail check costs 40ms on a 29KB file, and the self-guardrail suite runs it over every file in src/ |

## What changed, and what is left

**PERF-1 is closed, and the cause was not the work the suites do.**
`process-hygiene` reported 25.5s for seven tests that finish in 6.2: five
`Promise.race` calls left their losing `setTimeout` armed, and the event loop
waited 19 seconds for the longest one. Cleared, the file runs in 6.3s. The three
self-update suites built eighteen git sandboxes at 746ms each; a sandbox is now
a 39ms copy of one template, which took them to 5.0s, 6.0s and 2.3s. ci is
**45.8s**, from 67.7s, and the floor is no longer one suite.

**PERF-2 is closed because its premise does not reproduce.** The finding said
263ms of skill loading was the last large item in startup. Measured today:
`loadAllSkills` is 38ms of a 216ms invocation, 28ms on a second call, against 53ms
of node boot and 51ms of importing the module graph it needs. A disk cache keyed
by digest, the shape the BM25 index uses, would recover about 30ms of 216 and add
a cache to invalidate. The decision was not to build it. What is now the largest
startup item is the import, not the reading.

**PERF-3 is unchanged and stays open as a known cost.** 40ms per check is what
84 rules over masked source costs. It is recorded so the next rule is added
knowing the price, not because the number is wrong.
