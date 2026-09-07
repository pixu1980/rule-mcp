# performance review

- **Role**: performance v2
- **Date**: 2026-09-07

Findings distilled from [the audit](../audits/performance.md). A finding this run no longer reports is
flipped to resolved and kept one run for visibility, then removed.

| Finding | Severity | Status | Evidence | Summary |
| --- | --- | --- | --- | --- |
| PERF-1 | high | open | audit: compressText over three real files; vocabulary counts | Measured deterministic compression on real content is 0.5-1.0% (README 41993 -> 41783 chars) against the caveman skill's ~75% target: the vocabulary is 16 filler words, 8 phrases and 1 aggressive word |
| PERF-2 | high | open | audit: env grep; caveman SKILL.md intensity table | Compression is binary (RULE_MCP_NO_CAVEMAN=1 or on): the caveman skill defines lite/full/ultra intensity levels and the server has no opt-in higher level |
| PERF-3 | medium | open | audit: validate.py extractors; no JS equivalent found | No deterministic safety validator: the python skill's validate.py invariants (heading count, code blocks exact, URL set exact, paths, bullets within 15%) have no JS counterpart, which is what caps how aggressive the rules can safely get |
| PERF-4 | medium | open | audit: FILLER list; failing test output | Bare-word filler stripping breaks constructs: 'rather' in FILLER turns 'rather than' into 'than' - the failing caveman-efficacy assertion ('Call helper than writing it by hand') |
| PERF-5 | medium | open | audit: compressResult call sites grep | Coverage gap: only router tool results are compressed; rule:// resource reads and MCP prompt bodies leave the server uncompressed |
| PERF-6 | low | open | audit: benchmark.py head; scripts/reports listing | No token-based benchmark: the python skill benchmarks with tiktoken o200k, the server has only the char/4 heuristic and no corpus script to gate level tuning |
| PERF-7 | info | open | audit: module doc of _caveman.js; compress.py LLM call | Attribution and decoupling: the compressor modules do not credit the caveman skill as the idea source, and the deterministic end state (no runtime dependency on the skill, LLM step not ported) is not recorded anywhere |
