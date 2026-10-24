# 01 - performance plan execution

- **Date**: 2026-09-09
- **Branch**: `perf/meta-surface` (step 7 only); steps 1-6, 8, 9 are on `main`
- **Commit range**: `13d20b6c..949c25c9` (6 commits, none pushed)
- **Plan**: `docs/plans/performance.md` - every step marked `[x]`

## What was executed

The whole of `docs/plans/performance.md`, nine steps, in dependency order: the
guard first because it is what makes an aggressive vocabulary safe, then the
vocabulary, the levels, the construct traps, the uncovered surfaces, the
startup branch, the benchmark, and the attribution.

| Step | Finding             | What landed                                                                                                                                                                                                                                     |
| ---- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | PERF-1 vocabulary   | Four level-tagged data tables under `src/core/text/`: `_fillers.data.js`, `_phrases.data.js`, `_synonyms.data.js`, `_abbreviations.data.js`. `detect.py` and `compress.py` guards ported into `_classify.js`, `_line-shape.js`, `_sensitive.js` |
| 2    | PERF-2 levels       | `RULE_MCP_CAVEMAN_LEVEL=off\|lite\|full\|ultra` (`_level.js`), threaded as `{ level }`, part of the tool cache key                                                                                                                              |
| 3    | PERF-3 guard        | `src/core/text/compress-guard/` is `validate.py` ported, with per-block rollback in `_caveman-blocks.js`. The python CLI contract is asserted against the JS in a test that skips when python3 is absent                                        |
| 4    | PERF-4 traps        | Phrase-before-word order enforced in one place (`_caveman-line.js`); anchored pleasantry openers added                                                                                                                                          |
| 5    | PERF-5 surfaces     | `rulemcp://` resource bodies and `prompts/get` bodies now compress; each books its own source                                                                                                                                                   |
| 6    | PERF-8 startup      | `pnpm report:startup`; compiled code cache in `bin/`; handlers deferred into their actions; `listTools()` memoized                                                                                                                              |
| 7    | PERF-9 meta surface | `rule-mcp-meta-*` namespace, `rule_tool_meta` dispatcher, `rule-mcp-area-toolset` prompt rename (branch `perf/meta-surface`)                                                                                                                    |
| 8    | PERF-6 benchmark    | `pnpm report:compression` over four corpora                                                                                                                                                                                                     |
| 9    | PERF-7 attribution  | Credit lines in the module doc and the guides; ADR 073                                                                                                                                                                                          |

## Commits

```
949c25c9 feat(skills): rule-mcp-meta namespace with a narrow dispatcher          [perf/meta-surface]
78ef4f2b docs(plan): mark steps 1-6, 8 and 9 executed and correct the level table by measurement
0f1a4b1e docs(perf): quote the measured compression and startup numbers, credit the source
fd480cb4 perf(cli): warm --help from 216 ms to 48 ms, measured not assumed
097314f3 feat(resources): compress resource and prompt bodies, booked per surface
9e82936e feat(text): four compression levels behind a structural guard
```

## ADRs written

- **073** - Compression has four levels and no LLM in the output path
- **074** - The CLI entry point loads no command handler it has not been asked for
- **075** - Meta-frameworks get their own namespace and a narrow dispatcher

## Where the plan was wrong, and what the measurement said

Three of the plan's numbers did not survive contact with a measurement. All
three are corrected in the plan, the audit and the ADRs rather than quietly
dropped.

1. **Compression targets of 8% (`full`) and 20% (`ultra`) are unreachable on
   this repository.** Its own skills and docs are already written in the
   compressed style the caveman skill teaches, so on them the rules measure how
   little filler is left, not what they can do. Measured by
   `pnpm report:compression`:

   | Corpus                    | `lite` | `full` | `ultra` |
   | ------------------------- | ------ | ------ | ------- |
   | skills (89 SKILL.md)      | 0.06%  | 1.52%  | 2.02%   |
   | docs (17 files)           | 0.02%  | 0.56%  | 0.73%   |
   | real tool results (6)     | 0.11%  | 2.03%  | 2.58%   |
   | verbose prose (synthetic) | 17.4%  | 34.2%  | 42.3%   |

   Guard violations are 0 at every level on all four corpora. The floors in
   `src/core/text/__tests__/_efficacy.test.mjs` are set under the measured
   values, with margin, on both the shipped and the synthetic corpus.

2. **`NODE_COMPILE_CACHE` is worth 2-6%, not the ~35% the plan quoted.** The
   plan's number compared a cold run against a warm one. The cache is still
   enabled - it is free - but the 168 ms actually came from what `--help` no
   longer loads.

3. **The meta rename raised the connect cost.** 105 tools and 96,679
   tools-list bytes became 106 and 97,204, +525 for the dispatcher. The four
   entries were renamed, not merged; making them modes of one tool is a wider
   change and a separate decision.

## Startup, measured

`pnpm report:startup`, Node v24.19.0, median of five warm runs:

|                             | before | after  |
| --------------------------- | ------ | ------ |
| `--help` warm               | 216 ms | 48 ms  |
| entry import (cold process) | 185 ms | 12 ms  |
| second `listTools()`        | 7.4 ms | 0 ms   |
| `tools list` warm           | 291 ms | 265 ms |
| stdio `initialize`          | 266 ms | 251 ms |

`loadAllSkills` (53 ms) and the first `listTools()` (8 ms) are unchanged: they
are work `tools list` and `serve` genuinely need.

## Bugs the work surfaced

- **A 4-backtick fence wrapping 3-backtick content desynced the fence walker**,
  so `docs/04-operations.md` had code compressed as prose. Pre-existing;
  the new guard is what caught it. One CommonMark tracker (`_fence.js`) now
  serves the walker, the ultra pass and the guard. Tilde fences were never
  recognized either, and now are.
- **`rule-mcp adr new` and `fix` were dead**: they called
  `rule_tool_process_adr` and `rule_tool_fix`, while the registry has carried the
  `rule_tool_` prefix since the rename. Fixed in `0f1a4b1e`.

## Open items for the next session

1. **`perf/meta-surface` is unmerged.** One commit, `949c25c9`. Full suite
   green on it. It changes the tool inventory (106 tools, 90 skills) and the
   README counts, so review it before merging.
2. **Five commits landed on `main` rather than on a branch.** They are local
   and unpushed; say so if they should be moved.
3. **`scripts/fix/prose/index.mjs --apply` is a footgun unscoped.** Run
   repo-wide it rewrote 142 unrelated files (arrows, multiplication signs).
   All of it was reverted and the fix applied per-file. Consider making
   `--apply` require a path.
4. **Merging the four meta tools into one** is the change that would actually
   cut the connect cost, and it is deliberately not done (ADR 075).
5. `docs/audits/performance.md` and `docs/plans/performance.md` are not
   prettier-formatted. That predates this session; `pnpm format` is not in the
   test suite.

## Contract reminders

- Conventional commits with a **mandatory scope**: `type(scope): subject`. The
  `commit-msg` hook rejects a scope-less message.
- `pnpm` only, exact versions, `pnpx` never `npx`.
- Everything in English, American spelling, ASCII punctuation.
- Route through `rule-mcp` before implementing; never invent APIs, files or passing
  checks.
- Never spawn subagents; use the rule-mcp tools and tokensave.

## Commands that verify the state

```bash
node scripts/ci/run-tests/index.mjs all   # green on both branches
pnpm lint                                 # 0 errors
pnpm census:check                         # current
pnpm report:compression                   # the level table
pnpm report:startup                       # the startup table
```
