# performance plan

- **Role**: performance v1
- **Date**: 2026-09-04

Steps re-derived from the open findings in [the review](../reviews/performance.md) on every run, worst
first. This file is deleted by the run that finds nothing open.

| Step | Finding | Severity | What it takes |
| --- | --- | --- | --- |
| 1 | PERF-3 | low | A guardrail check costs 40ms on a 29KB file, and the self-guardrail suite runs it over every file in src/ |

## Steps, with dependencies

| Step | Fixes  | Depends on | What it takes                                                                                                            |
| ---- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | PERF-3 | -          | Nothing, unless a rule is added. Then measure again: 40ms is the current price of one check, over 84 rules.               |

## What this plan does not do

- It proposes no skill-registry cache. The 263ms that justified one does not
  reproduce: skill loading is 38ms of a 216ms invocation, so a cache would
  recover about 30ms and add an invalidation to get wrong.
- It proposes no further parallelism. ci is 45.8s and no single suite defines
  that floor any more.
