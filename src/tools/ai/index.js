/**
 * @module tools/ai
 *
 * pix routing tool - analyzes prompts and routes to the best pix skill.
 * Uses BM25 plus name/tag affinity with domain and framework biasing,
 * one concern per file (ADR 061).
 */

export { registerAiTool } from "./_register.js";
