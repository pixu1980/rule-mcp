# performance audit

- **Role**: performance v1
- **Date**: 2026-09-04

Evidence only: the commands this run executed with their measured values, the files it read,
the sources it consulted. No opinions - those belong in the review.

## Evidence

Third run. The second run's numbers are kept below it, because a claim about an
improvement is only readable next to what it improved on. Every number is a wall
clock taken on this machine.

<a id="startup"></a>
<a id="suites"></a>
<a id="guardrails"></a>

| What was measured                              | How                                                     | Result                                                                                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Why `process-hygiene` cost 25.5s               | per-test durations against the file's own duration      | 7 tests sum to **6.2s**; the file ran **25.5s**. Five `Promise.race` calls left their losing `setTimeout` armed, and `process.getActiveResourcesInfo()` reported **6 pending `Timeout`s** after the last test |
| `process-hygiene`, timers cleared              | `node --test`, wall clock                               | **6.3s**, 8 pass                                                                                                                                                                                              |
| Cost of one git sandbox                        | build vs `cpSync` of a built one                        | **746ms to build, 39ms to copy**                                                                                                                                                                              |
| The three self-update suites, sandboxes copied | each timed on its own                                   | `self-update` 9.3s -> **5.0s**, `self-update-throttle` 8.0s -> **6.0s**, `self-update-remote-pin` 5.1s -> **2.3s**                                                                                            |
| The whole ci script                            | `pnpm run ci`, reading the `CI EXIT=` line              | 67.7s -> **45.8s**, exit 0                                                                                                                                                                                    |
| Where the 216ms of a CLI call goes             | timestamps around each phase in one process             | node boot **53ms**, importing the skills module graph **51ms**, `loadAllSkills(true)` **38ms**, `listTools()` **6ms**                                                                                         |
| `loadAllSkills` on a second call               | `loadAllSkills(true)` twice in one process              | **28ms**                                                                                                                                                                                                      |
| `rule-mcp tools list`, warm              | wall clock, 3 runs                                      | **216ms, 224ms, 215ms**                                                                                                                                                                                       |
| One guardrail check                            | `checkCode` on a 29KB file, 20 iterations               | **40.4ms per call**, unchanged, now over 84 rules                                                                                                                                                             |
| The guardrail corpus                           | `node --test test/guardrails-precision-recall.test.mjs` | 84 rules, 168 snippets, **10ms** (93 over 186 before ADR 088 removed three skills)                                                                                                                            |

Second run, for comparison:

| What was measured                   | How                                                         | Result                                                                                                                           |
| ----------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| The suite that owned the 25.8s      | each suite timed on its own                                 | **`test/process-hygiene.test.mjs` 25.6s**, then `self-update-throttle` 25.3s, `self-update` 13.5s, `docs-numbering-doctor` 13.4s |
| What makes the throttle suite slow  | `grep` for sleeps, then read the harness                    | **450ms of sleeps**; the rest is a git clone and a child process per scenario                                                    |
| The 45 node:test suites, sequential | one `node --test` per file, timed                           | **39.7s**                                                                                                                        |
| The same 45, one invocation         | `node --test <45 files>`                                    | **26.8s**, 416 pass, 0 fail, **3 runs identical**                                                                                |
| The whole ci script, before         | the previous script from `git show HEAD:package.json`       | **118.2s**, exit 0                                                                                                               |
| The whole ci script, after          | `pnpm run ci`                                               | **~82s**, exit 0                                                                                                                 |
| BM25 build, warm                    | `performance.now()` around `buildIndex(true)`, 5 iterations | 163ms first, then **97, 90, 99, 95ms**                                                                                           |
| BM25 restore from disk              | build, `clearIndex()`, build again                          | **18ms**, same 984 docs and 7057 terms                                                                                           |
| A routed CLI call                   | `time node bin/rule-mcp.js tools call rule`        | **0.76s** cold, then **0.28s, 0.31s, 0.49s**                                                                                     |
| The stored index                    | `ls -la`                                                    | **477KB** gzipped, one file kept                                                                                                 |
| `codeSignature()`                   | `performance.now()`                                         | **2.0ms**, once per process                                                                                                      |
| One guardrail check                 | `checkCode` on a 29KB file, 20 iterations                   | **40.4ms per call**                                                                                                              |

## What was read

- `test/process-hygiene.test.mjs`, `test/self-update.test.mjs`,
  `test/self-update-throttle.test.mjs`, `test/self-update-remote-pin.test.mjs`,
  `src/core/skills.js`, `src/core/bm25.js` (its disk cache, as the shape a registry cache would copy)
- Second run: `package.json`'s `ci` script before and after, `src/core/bm25.js`,
  `src/core/tool-cache.js`, `src/core/code-signature.js`

## What could not be concluded

- **Nothing about the 263ms of skill loading, because it does not reproduce.**
  `loadAllSkills` costs 38ms of a 216ms invocation on this machine, and 28ms on a
  second call in the same process. Whatever the earlier figure measured, it is not
  what a cache would recover today.
- **Whether the 51ms of importing the skills module graph can be cut.** It is
  larger than the reading it enables, and nothing here measured what a dynamic
  import per rarely-used tool would move.
