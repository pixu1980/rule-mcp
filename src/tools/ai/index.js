

/**
 * @module tools/ai
 *
 * rule routing tool - analyzes prompts and routes to the best rule skill.
 * Uses BM25 plus name/tag affinity with domain and framework biasing,
 * one concern per file (ADR 058).
 */

export * from "./_register.js";
