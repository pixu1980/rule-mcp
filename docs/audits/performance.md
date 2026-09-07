# performance audit

- **Role**: performance v2
- **Date**: 2026-09-07

Evidence only: the commands this run executed with their measured values, the files it read,
the sources it consulted. No opinions - those belong in the review.

## Evidence

| What was measured | How | Result |
| --- | --- | --- |
| Python skill inventory | `wc -l ~/.agents/skills/caveman-compress/scripts/*.py` | 700 lines: compress.py 227 (LLM orchestration), validate.py 189 (deterministic invariants), detect.py 121 (deterministic classifier), benchmark.py 78, cli.py 73 |
| What in the skill is deterministic | read of compress.py, validate.py, detect.py | compress.py calls Claude (`call_claude`, model claude-sonnet-4-5 or `claude --print`) - NOT deterministic; validate.py (nested-fence code-block extractor, URL set, heading count, path set, bullets within 15%) and detect.py (extension + content classification) ARE deterministic; plus a sensitive-path denylist and an outer-fence strip |
| Server compressor size | `wc -l src/core/text/_caveman*.js` | `_caveman.js` 124, `_caveman-line.js` 79, `_caveman-aggressive.js` 79 (282 total) |
| Server vocabulary | read of FILLER, PHRASES, AGGRESSIVE_RE | 16 filler words, article regex, 8 phrase rewrites, 1 aggressive word ("literally") |
| Measured compression on real content | `compressText` over three files | `skills/rule-frontend-react/SKILL.md` 24266 -> 24115 chars (0.6%), `skills/rule-styleguide/SKILL.md` 9741 -> 9639 (1.0%), `README.md` 41993 -> 41783 (0.5%) |
| Caveman skill target and levels | `~/.agents/skills/caveman/SKILL.md` | "Cuts token usage ~75%"; intensity table lite / full / ultra (+ wenyan variants); ultra adds abbreviation (DB/auth/config/req/res/fn/impl), conjunction stripping, arrow causality |
| Level support server-side | `grep -n "NO_CAVEMAN\|CAVEMAN_LEVEL" src` | Only the binary opt-out `RULE_MCP_NO_CAVEMAN=1`; no level variable exists |
| Compression coverage | `grep -rn "compressResult\|compressText" src` minus core/text | 3 call sites: router `_helpers.js` (tool results), `tools/compress.js` (the explicit tool); nothing in `resources/_read.js`, `prompts/_get.js`, `server/_prompt-handlers.js` |
| Known breakage | `node --test tests/core/caveman-efficacy.test.mjs` | 7 pass, 1 fail: "compression never leaves broken English behind" - expected "Call helper rather than writing it by hand.", got "Call helper than writing it by hand."; FILLER contains bare "rather" |
| Failure pre-exists this run | same test on a clean tree earlier this session | fails at HEAD too (documented in docs/plans/execution-plan.md phase 7) |
| Token counting today | benchmark.py vs server | python uses tiktoken `o200k_base` with word-count fallback; server uses the char/4 heuristic everywhere; no corpus benchmark script exists under `scripts/reports/` (cache, cache-similarity, census, coverage, tool-surface only) |
| Attribution today | module doc of `_caveman.js` | Describes the compressor; no credit line naming the caveman skill as the idea source |
| Evidence skills loaded | `pix_process_simplicity` and `pix_styleguide_patterns` earlier this session; role names backend/frontend workers and vite | Worker/vite skills are not applicable to a regex text pass (single synchronous transform, already sub-ms per result); noted rather than loaded |
