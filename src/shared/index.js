/**
 * src/shared: cross-cutting helpers with a single home, no dual paths.
 *
 * The guardrail-authoring helpers are not here: they are the published
 * surface a rule is written against and live in `@rule-mcp/sdk`
 * (ADR 079), so a skill depends on a package rather than on this tree.
 */
export * from "./_process.js";
export * from "./_result.js";
