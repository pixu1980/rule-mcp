# performance plan

- **Role**: performance v2
- **Date**: 2026-09-07

Steps re-derived from the open findings in [the review](../reviews/performance.md) on every run, worst
first. Mark an executed step or sub-step with `[x]` - the next sync keeps the mark while its
finding stays open. This file is deleted by the run that finds nothing open.

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

| Level | Adds                                                                                                       | Expected on prose |
| ----- | ---------------------------------------------------------------------------------------------------------- | ----------------- |
| off   | nothing (alias of NO_CAVEMAN=1)                                                                            | 0%                |
| lite  | fillers, hedging, pleasantries; keeps articles and full sentences                                          | 2-5%              |
| full  | + articles, phrase rewrites, short synonyms (today's default, expanded)                                    | 8-15%             |
| ultra | + abbreviation map (DB/auth/config/req/res/fn/impl), conjunction stripping, arrow causality on prose lines | 20-35%            |

Targets are to be measured by the step 6 benchmark, not asserted; the current measured
baseline is 0.5-1.0%.

## Steps

- [ ] **Step 1 - PERF-3 (medium)**: Port validate.py to a deterministic compression guard - the enabler: every later vocabulary expansion is safe because a violated block reverts, never the whole result. This replaces the python fix-with-Claude retry loop.
  - [ ] **1.1**: Create `src/core/text/compress-guard/` (underscore-barrel): `_extract.js` (the nested-fence code-block extractor from validate.py, CommonMark closing-fence rule; URL regex; heading list; path regex; bullet count) and `_guard.js` (`guardCompression(original, compressed)` -> `{ ok, violations[] }` with the python severities: headings/code/URLs are errors, paths/bullets are tolerances).
  - [ ] **1.2**: Tests first in `tests/core/compress-guard.test.mjs`: one case per invariant ported from validate.py semantics (heading count mismatch, code block byte-diff, lost URL, bullet drop beyond 15%), plus the nested 4-backtick-wrapping-3-backtick fence case.
  - [ ] **1.3**: Wire the per-block rollback into `compressText`: split on fence boundaries (the split already exists in `_caveman.js`), compress a block, guard it, keep the original block on violation; count rollbacks into the result for telemetry.
  - [ ] **1.4**: Gate: new suite green, `tests/core/caveman.test.mjs` and the efficacy suite unchanged at level full, guard overhead measured under 1 ms on the README corpus and quoted in the next audit run.
- [ ] **Step 2 - PERF-4 (medium)**: Fix the construct-breaking word pass ('rather' in FILLER turns "rather than" into "than" - the failing caveman-efficacy assertion). Depends on step 1 so the fix lands with the guard watching it.
  - [ ] **2.1**: Reorder the pipeline in `_caveman-line.js`: phrase rewrites run before single-word fillers, always.
  - [ ] **2.2**: Make the constructs explicit in the phrase table ("rather than", "as well as", "in order to") and remove bare `rather` from FILLER; audit the other 15 fillers for the same trap (`very` in "very least", `quite` in "quite a few").
  - [ ] **2.3**: Extend the efficacy corpus with one sentence per protected construct; the existing "compression never leaves broken English behind" case turns green.
  - [ ] **2.4**: Gate: `node --test tests/core/caveman-efficacy.test.mjs` 8/8 - closing the pre-existing failure documented in execution-plan.md phase 7.
- [ ] **Step 3 - PERF-1 (high)**: Expand the vocabulary from 16 fillers + 8 phrases + 1 aggressive word to the caveman skill's full rule table, as per-level data files. Depends on steps 1-2.
  - [ ] **3.1**: Author the tables as data (`_fillers.data.js`, `_phrases.data.js`, `_synonyms.data.js`, `_abbreviations.data.js`), each entry tagged with the minimum level that applies it (lite: filler/hedging/pleasantries; full: articles, phrases, short synonyms - "utilize"->"use", "implement a solution for"->"fix"; ultra: the abbreviation map DB/auth/config/req/res/fn/impl and arrow causality).
  - [ ] **3.2**: Port detect.py's line classification into the existing guards (`scannableProse`, `looksLikeJson`): YAML-ish lines, JSON bodies, code-pattern lines and table rows are exempt by construction, not by luck.
  - [ ] **3.3**: Port compress.py's sensitive-content refusal where it applies server-side: `rule_tool_compress` refuses input whose `fileName` matches the denylist (`.env*`, `credentials*`, `id_rsa`, `.ssh/` components), quoting the python heuristic; tool results are not files and skip this.
  - [ ] **3.4**: Every table entry ships with a corpus case: per-level assertions of the rewrite and its idempotence (`compress(compress(x)) === compress(x)` per level).
  - [ ] **3.5**: Gate: level full on the audit corpus (README, two SKILL.md files) reaches a measured >= 8% char reduction with zero guard violations; numbers quoted in the next audit run.
- [ ] **Step 4 - PERF-2 (high)**: Level plumbing, opt-in, cache-safe. Depends on step 3.
  - [ ] **4.1**: Read `RULE_MCP_CAVEMAN_LEVEL` once (`off|lite|full|ultra`, default `full`); `off` aliases the existing `RULE_MCP_NO_CAVEMAN=1`; unknown values fall back to `full` with one stderr warning.
  - [ ] **4.2**: Thread `{ level }` through `compressText`/`compressResult` so tests can pin levels without env games.
  - [ ] **4.3**: Namespace the result cache by level (the tool-cache key gains the level tag) - a level change must never replay another level's cached output; invalidation case added to `tests/core/cache-invalidation.test.mjs`.
  - [ ] **4.4**: Register the variable in `scripts/reports/census/_env-vars.data.mjs`, document it in docs/05, run `pnpm census`.
  - [ ] **4.5**: Gate: per-level efficacy suite green, cache suites green, census docs regenerated without drift.
- [ ] **Step 5 - PERF-5 (medium)**: Extend compression to everything the server emits - today only router tool results pass through `compressResult`. Depends on steps 1-4.
  - [ ] **5.1**: Route `rule://` resource payloads (`src/resources/_read.js`) through `compressResult` with the same guards; generated markdown tables and code fences must survive byte-identical (guard-enforced).
  - [ ] **5.2**: Route prompt bodies (`src/server/_prompt-handlers.js` via `prompts/_get.js`) through the same pass; the persona contract text is prose and compresses, argument hints and schemas do not.
  - [ ] **5.3**: Book the savings per surface in telemetry `savedBySource` (`caveman`, `caveman-resource`, `caveman-prompt`) so `rule_tool_stats` and the flight export show where the tokens went.
  - [ ] **5.4**: Gate: `tests/prompts/prompts.test.mjs`, `tests/tools/minimal-tools.test.mjs` and the resource round-trips green; a flight export shows non-zero resource/prompt savings on a real session.
- [ ] **Step 6 - PERF-6 (low)**: Port benchmark.py to a corpus benchmark that gates the level targets.
  - [ ] **6.1**: `scripts/reports/compression/index.mjs`: corpus = `skills/*/SKILL.md` + a recorded set of real tool results; per level report chars, char/4 tokens, percent saved, guard-violation count (must be 0); `--json` for CI.
  - [ ] **6.2**: Regression assertion in the efficacy suite: level full >= 8% and ultra >= 20% on the prose corpus, or the numbers in this plan's table get corrected by measurement - either way plan and code cannot drift apart silently.
  - [ ] **6.3**: Gate: script runs as `pnpm report:compression`, wired into the engineering-guides measured-numbers section.
- [ ] **Step 7 - PERF-7 (info)**: Attribution and decoupling - credit without dependency. Rides along with step 4's docs touch.
  - [ ] **7.1**: Module doc of `_caveman.js`: "Inspired by the caveman skill and its caveman-compress companion; the deterministic rules are ported, the LLM step is deliberately not" - same credit pattern as the ai-flight-recorder note in `core/telemetry/flight/index.js`.
  - [ ] **7.2**: Same credit line in the engineering-guides doc beside the measured numbers.
  - [ ] **7.3**: ADR: record the compression-levels decision and the no-LLM determinism contract (extends ADR 052's token-efficiency pipeline).

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
