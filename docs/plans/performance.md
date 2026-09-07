# performance plan

- **Role**: performance v2
- **Date**: 2026-09-07

Steps re-derived from the open findings in [the review](../reviews/performance.md) on every run, worst
first. Mark an executed step with `[x]` - the next sync keeps the mark while its finding stays
open. This file is deleted by the run that finds nothing open.

## Shape of the work

Port the deterministic pieces of the caveman-compress python skill (validator, classifier,
safety denylist) into the server, replace its LLM compression step with an expanded
rule-based vocabulary behind opt-in levels, and point every emitting surface through the
same pipeline. End state: zero runtime dependency on the skill, byte-deterministic output
(same input, same level, same bytes - cache-safe), the caveman skill credited as the idea
source. The LLM call in compress.py is deliberately NOT ported: it is the part the
deterministic contract forbids.

Levels (opt-in, env `RULE_MCP_CAVEMAN_LEVEL=off|lite|full|ultra`, default `full` =
today's behavior):

| Level | Adds                                                                                                             | Expected on prose |
| ----- | ---------------------------------------------------------------------------------------------------------------- | ----------------- |
| off   | nothing (alias of NO_CAVEMAN=1)                                                                                  | 0%                |
| lite  | fillers, hedging, pleasantries; keeps articles and full sentences                                                | 2-5%              |
| full  | + articles, phrase rewrites, short synonyms (today's default, expanded)                                          | 8-15%             |
| ultra | + abbreviation map (DB/auth/config/req/res/fn/impl), conjunction stripping, arrow causality on plain prose lines | 20-35%            |

Targets are to be measured by the step 6 benchmark, not asserted; the current measured
baseline is 0.5-1.0%.

## Steps

- [ ] **Step 1 - PERF-3 (medium)**: Port validate.py to `src/core/text/compress-guard/` as pure functions: the nested-fence code-block extractor, URL set, heading list, path set, bullet count. `guardCompression(original, compressed)` returns violations; `compressText` applies rules per block and rolls the block back when the guard trips - the deterministic replacement for the python fix-with-Claude retry loop. This is the enabler: every later vocabulary expansion is safe because a violation reverts that block, never the whole result.
- [ ] **Step 2 - PERF-4 (medium)**: Fix the construct-breaking word pass: run phrase rewrites before single words, make multiword constructs explicit ("rather than" -> "not", "as well as" -> "and"), and drop bare words that only ever appear inside kept constructs from FILLER ("rather"). This alone turns the failing caveman-efficacy assertion green. Depends on step 1 so the fix lands with the guard watching it.
- [ ] **Step 3 - PERF-1 (high)**: Expand the vocabulary as data files (`_fillers.data.js`, `_phrases.data.js`, `_synonyms.data.js`, `_abbreviations.data.js`), one table per level, sourced from the caveman skill rule table (drop articles/filler/pleasantries/hedging, short synonyms, ultra abbreviations). Port detect.py's line classification into the existing scannable/looksLikeJson guards so YAML/JSON/table/code lines are exempt by construction. Every table entry ships with a corpus case in the efficacy test. Depends on steps 1-2.
- [ ] **Step 4 - PERF-2 (high)**: Level plumbing: `RULE_MCP_CAVEMAN_LEVEL` read once, `compressText(text, { level })` threaded through `compressResult`; `off` aliases the existing `NO_CAVEMAN`; default `full` keeps current behavior. Register the variable in `scripts/reports/census/_env-vars.data.mjs`, docs/05, and the cache key namespace (a level change must not replay another level's cached output). Depends on step 3.
- [ ] **Step 5 - PERF-5 (medium)**: Extend coverage to everything the server emits: route `resources/_read.js` payloads and prompt bodies (`prompts/_get.js` via `server/_prompt-handlers.js`) through `compressResult` with the same guards (code fences, JSON, generated markdown tables); measure per-surface savings in telemetry `savedBySource` so the win is visible in `rule_tool_stats`. Depends on steps 1-4.
- [ ] **Step 6 - PERF-6 (low)**: Port benchmark.py to `scripts/reports/compression/index.mjs`: corpus = `skills/*/SKILL.md` + recorded tool results, report chars and char/4 tokens per level with guard-violation count (must be zero), markdown + `--json`. The level targets in the table above become the gate this script measures; wire a regression assertion into caveman-efficacy.
- [ ] **Step 7 - PERF-7 (info)**: Attribution and decoupling: credit the caveman skill in the `_caveman.js` module doc and docs/03 ("Inspired by the caveman skill (caveman-compress); rules ported deterministically, LLM step deliberately not ported"), same pattern as the ai-flight-recorder credit in telemetry/flight. Record the levels decision and the no-LLM contract as an ADR. Rides along with step 4's docs touch.

## Dependencies

- Step 1 first (the guard), step 2 rides on it, step 3 needs both, step 4 needs 3.
- Step 5 after 4 (surfaces adopt the leveled pipeline, not the current one twice).
- Step 6 lands with 3 and gates 3-5; step 7 rides with 4.

## Deliberately not proposed

- Porting compress.py's Claude call or the fix-prompt retry loop: an LLM in the output
  path breaks determinism, cacheability and the zero-dependency contract - the guard plus
  per-block rollback replaces it.
- Worker-thread offload for the compressor: the pass is a handful of regex replaces per
  result, sub-millisecond at the measured sizes; a worker would add startup cost for
  nothing (measurement first).
- The wenyan levels: character-based compression targets a different tokenizer economy
  and cannot be validated by the step 1 guard; out of scope until someone asks.
