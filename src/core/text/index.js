/**
 * Text-processing barrel: block spacing and caveman compression.
 *
 * The ascii-box, en-english and fingerprint subsystems are published as
 * `@rule-mcp/sdk/text` (ADR 079): a guardrail is written against them,
 * so they are a contract rather than an internal of this tree.
 */
export * from "./block-spacing/index.js";
export * from "./_caveman.js";
export * from "./_caveman-aggressive.js";
export * from "./_classify.js";
export * from "./_sensitive.js";
export * from "./compress-guard/index.js";
