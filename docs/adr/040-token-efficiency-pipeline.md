# 040: Token-efficiency pipeline (caveman aggressive + tokensave-aware decoration)

- **Date**: 2026-08-25
- **Status**: accepted
- **Tags**: token-efficiency, caveman, tokensave, mcp-boundary, diagnostics

## Context

The server already compressed every output with caveman, but the tokensave
integration was partial: only `pix_gateway` and `rule_tool_process_handoff`
emitted the tokensave directive, the suppression helper
(`suppressIfTokensave`) had zero production callers, detection looked only at
`process.cwd()`, and nothing measured the actual savings. The goal: when a
project ships a `.tokensave/` graph, the server must save as many tokens as
possible on EVERY call - without breaking tool output contracts.

## Decision

1. **Decoration lives at the MCP boundary** (`src/server.js`
   CallToolRequestSchema handler), not inside `router.callTool`. Internal
   callers (CLI, tests, gateway internals) keep raw payloads; only real client
   responses are decorated. This is what makes aggressive saving safe.
2. **Multi-source graph detection**: explicit tool arg (`path/target/projectDir`)
   > `RULE_MCP_PROJECT_DIR` env > cwd > up to 6 parent directories.
3. **Directive once per process, JSON-deferred**: the full directive is
   prepended on the first response whose primary payload is not machine-parsed
   JSON (tools like `pix_tool` contract `content[0]` to be parseable). No spam.
4. **Threshold suppression**: blocks under 40 lines pass through untouched;
   heavy outputs of allowlisted tools (`rule_tool_fix`) truncate to head+tail
   plus a terse pointer. Threshold tunable via `RULE_MCP_SUPPRESS_MIN_LINES`.
5. **Caveman aggressive by default**: an extra pass compresses multi-word
   phrases ("in order to"→"to", "note that"→"", …) and more fillers, with the
   same safety rules (fences/JSON/headings verbatim).
6. **Measured, not anecdotal**: `src/core/token-stats.js` counts compression
   bytes and suppression savings; `doctor` reports the snapshot.

## Consequences

**Positive**: in `.tokensave` projects every call steers the model to the code
graph, heavy dumps collapse, compression is stronger, and the savings are
observable in `doctor`. Contracts preserved: JSON-first payloads, gateway
receipts, test fixtures (`test_*` tools exempt), cache determinism
(decoration applied after cache retrieval, never frozen into it).
**Negative**: outputs in decorated sessions differ from raw internal results
(by design); suppression thresholds need tuning per consumer feedback.
