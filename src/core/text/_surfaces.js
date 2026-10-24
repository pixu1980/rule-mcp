

/**
 * @module core/text/surfaces
 *
 * The compression-surface manifest: every place this MCP server emits text
 * toward a model, which deterministic compression pass shortens it (or the
 * deliberate reason it does not), and which telemetry source books the saving.
 *
 * One source of truth for three consumers:
 *   - the invariant test (`./__tests__/_surfaces.test.mjs`) walks it and pins
 *     that every "prose" surface shortens verbose text, keeps JSON intact and
 *     never breaks structure;
 *   - the docs section in `docs/08-engineering-guides.md` renders it;
 *   - a reader auditing "is every server->model byte compressed?" can answer
 *     from this table without re-reading the handlers.
 *
 * The `compress` functions are the same ones the handlers call, so the test
 * measures the real path - not a reimplementation.
 *
 * @see module:core/text/compression - the pass itself
 * @see module:core/text/compress-guard - the structural guard
 * @see ADR 080 - deterministic port, no LLM in the output path
 * @see ADR 077 - the list surfaces joined the manifest
 */

import { compressSurfaceText } from "./_compression.js";

const text = (handler) => (value) => handler(String(value ?? "")).text;

/**
 * The manifest. `kind` is what the pass may do:
 *   - "prose"     shortens natural language, never JSON, never structure
 *   - "terse"     short fault texts, deliberately not compressed
 *   - "vocabulary" a fixed token list, not prose
 *   - "data"      machine payloads; compressing them corrupts them
 */
export const SURFACES = [
  {
    id: "tools/call results",
    kind: "prose",
    where: "src/tools/router/_helpers.js finalize()",
    source: "compression",
    compress: text(compressSurfaceText),
    optOut: "RULE_MCP_NO_COMPRESSION / RULE_MCP_COMPRESSION_LEVEL=off",
  },
  {
    id: "resources/read bodies (text/*)",
    kind: "prose",
    where: "src/resources/_serve.js readResource()",
    source: "compression-resource",
    compress: (value) => compressSurfaceText(value, { source: "compression-resource" }).text,
    optOut: "RULE_MCP_NO_COMPRESSION / RULE_MCP_COMPRESSION_LEVEL=off",
  },
  {
    id: "prompts/get bodies",
    kind: "prose",
    where: "src/server/_prompt-handlers.js GetPrompt",
    source: "compression-prompt",
    compress: (value) => compressSurfaceText(value, { source: "compression-prompt" }).text,
    optOut: "RULE_MCP_NO_COMPRESSION / RULE_MCP_COMPRESSION_LEVEL=off",
  },
  {
    id: "prompts/list descriptions",
    kind: "prose",
    where: "src/server/_prompt-handlers.js ListPrompts",
    source: "compression-prompt-list",
    compress: (value) => compressSurfaceText(value, { source: "compression-prompt-list" }).text,
    optOut: "RULE_MCP_NO_COMPRESSION / RULE_MCP_COMPRESSION_LEVEL=off",
  },
  {
    id: "tools/list descriptions",
    kind: "prose",
    where: "src/tools/router/_surface.js listTools()",
    source: null,
    noSourceReason: "memoized once per process at startup, not per request",
    compress: text(compressSurfaceText),
    optOut: "RULE_MCP_NO_COMPRESSION / RULE_MCP_COMPRESSION_LEVEL=off",
  },
  {
    id: "resources/list labels",
    kind: "prose",
    where: "src/resources/_listing.js compressResourceListing()",
    source: null,
    noSourceReason: "no-op on the terse real set; kept for the invariant (ADR 077)",
    compress: text(compressSurfaceText),
    optOut: "RULE_MCP_NO_COMPRESSION / RULE_MCP_COMPRESSION_LEVEL=off",
  },
  {
    id: "resume hook block (SessionStart/UserPromptSubmit)",
    kind: "prose",
    where: "src/core/session/resume/_context.js handoffBlock()",
    source: "compression-resume",
    compress: (value) => compressSurfaceText(value, { source: "compression-resume" }).text,
    optOut: "RULE_MCP_NO_COMPRESSION / RULE_MCP_COMPRESSION_LEVEL=off / RULE_MCP_NO_RESUME_HANDON",
  },
  {
    id: "banners (self-update notice, resume announcement)",
    kind: "prose",
    where: "src/tools/router/_helpers.js withBanner()",
    source: "compression-banner",
    compress: (value) => compressSurfaceText(value, { source: "compression-banner" }).text,
    optOut: "RULE_MCP_NO_COMPRESSION / RULE_MCP_COMPRESSION_LEVEL=off",
  },
  {
    id: "workflow reminder",
    kind: "prose",
    where: "src/core/enforcement/_reminder.js decorateWorkflowReminder()",
    source: "compression", // rides on the tool-result pass that follows it in finalize()
    compress: text(compressSurfaceText),
    optOut: "RULE_MCP_NO_COMPRESSION / RULE_MCP_NO_REMINDER",
  },
  {
    id: "error envelopes",
    kind: "terse",
    where: "src/tools/router/call/_pipeline.js enforcementError()",
    reason: "short fault texts; compression would cost a guard run for nothing",
  },
  {
    id: "completions/complete",
    kind: "vocabulary",
    where: "src/server/_completions.js",
    reason: "a fixed token list the client matches against, not prose (ADR 077)",
  },
  {
    id: "JSON payloads (application/json bodies, JSON tool content)",
    kind: "data",
    where: "resources/_serve.js, tools/router/_helpers.js",
    reason: "compressing data corrupts it; the pass short-circuits on JSON",
  },
];
