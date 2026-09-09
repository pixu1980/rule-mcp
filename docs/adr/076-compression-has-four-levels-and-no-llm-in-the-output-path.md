# 076: Compression has four levels and no LLM in the output path

- **Date**: 2026-09-09
- **Status**: accepted
- **Tags**: compression, tokens, determinism, text
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The caveman skill defines lite/full/ultra intensity levels, and its caveman-compress companion reaches its numbers by calling an LLM and validating the result with validate.py. The server had one level, a 16-word vocabulary and no validator, measured at 0.5-2.2 percent against the skill's ~75 percent claim. Whether to port the LLM step was the open question.

## Decision

Port the deterministic half and refuse the LLM half. Four levels (off, lite, full, ultra) select data tables tagged per level, and validate.py becomes src/core/text/compress-guard/, running per prose run with rollback on violation. An LLM in the output path would cost determinism, cacheability and the zero-dependency contract, and the result cache could no longer replay a compression. The guard plus per-block rollback buys the same safety deterministically, and the caveman skill is credited as the idea source rather than invoked.

## Consequences

The vocabulary can be aggressive because a bad rule costs one paragraph, not the whole result. Measured by pnpm report:compression: 2.03 percent on real tool results and 34.2 percent on verbose prose at full, with zero guard violations. The plan's 8 and 20 percent targets were corrected by measurement, because this repository's own docs are already written in the compressed style. The guard immediately caught a real bug: a 4-backtick fence wrapping 3-backtick content desynced the fence walker. Cost: the compression level is part of the tool cache key, so changing it recomputes.

## What would end this

The assumption this leans on, and the observation that would make it wrong.
