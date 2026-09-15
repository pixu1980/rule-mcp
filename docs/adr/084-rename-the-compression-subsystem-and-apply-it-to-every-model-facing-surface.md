# 084: Rename the compression subsystem and apply it to every model-facing surface

- **Date**: 2026-09-15
- **Status**: accepted
- **Tags**: compression, tokens, rename, mcp-boundary, determinism
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The deterministic compressor was branded "caveman" in module names, exports, environment variables, comments, docs, the served skill and the installer. The user asked for no remaining caveman references outside README.md, and for the algorithms to run on every model-facing surface: tool results, prompts and resources. A 100-character floor was requested to avoid paying the pass's overhead on short messages.

## Decision

Rename the code, comments and configuration to neutral compression names: `_caveman*.js` becomes `_compression*.js`, `cavemanLevel`/`cavemanEnabled` become `compressionLevel`/`compressionEnabled`, `RULE_MCP_CAVEMAN_LEVEL` becomes `RULE_MCP_COMPRESSION_LEVEL`, `RULE_MCP_NO_CAVEMAN` becomes `RULE_MCP_NO_COMPRESSION`, and the served skill moves from `rule-caveman` to `rule-compression`. README.md keeps the single phrase `compression system inspired by caveman`. The MCP middleware (`finalize` for tool results, `compressMessages` for prompts, `readResource` for resources) now skips compression below `MIN_COMPRESS_LENGTH` (100) characters. The compressor itself stays length-agnostic so the unit tests and the `rule_tool_compress` tool keep their exact behavior.

## Consequences

The codebase, generated agent commands, installers and docs no longer carry caveman branding; README.md is the only file that references the inspiration. Every model-facing surface runs the same deterministic pass, with a size floor that keeps short error messages and acknowledgements readable. Historical ADRs and CHANGELOG entries were rewritten to the neutral name, which loses the original wording but honors the no-caveman constraint. The performance plan, audit and review documents were updated to match.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the caveman name inside the code and only rename the docs
1. Drop the compressor entirely and rely on tokensave suppression
1. Apply compression to every string with no size floor
