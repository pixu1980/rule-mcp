

/**
 * @module core/compression
 *
 * Deterministic text compressor. Trims filler from PROSE to cut token usage
 * while preserving every piece of technical substance. Applied to tool outputs
 * by the router (on by default; `RULE_MCP_COMPRESSION_LEVEL` picks the
 * intensity, `RULE_MCP_NO_COMPRESSION=1` turns it off).
 *
 * Inspired by the deterministic compression rules in the compression skill
 * (`skills/rule-compression/SKILL.md`): the vocabulary tables, the
 * classification guards and the structural validator are ported, while the LLM
 * compression step is deliberately left out. An LLM in the output path costs
 * determinism, cacheability and the zero-dependency contract; the guard plus
 * per-block rollback buys the same safety for free.
 *
 * Safety -- the compressor NEVER touches:
 *   - fenced code blocks (``` ... ```)
 *   - inline code spans (`...`)
 *   - URLs and filesystem paths
 *   - Markdown headings (# ...), table rows (| ... |), blockquotes
 *   - code-shaped and `key: value` lines
 *   - content whose text is JSON (data, not prose -- compressing it would corrupt it)
 *
 * On top of those exemptions, every prose run between two fences is checked
 * against the original by `./compress-guard/` - see `./_compression-blocks.js`.
 * Idempotent: compress(compress(x)) === compress(x).
 */

import { addCompression } from "../telemetry/_token-stats.js";
import { compressTextGuarded } from "./_compression-blocks.js";
import { looksLikeJson } from "./_classify.js";
import { compressionLevel } from "./_level.js";

export { compressTextGuarded } from "./_compression-blocks.js";
export { atLeast, compressionEnabled, compressionLevel, DEFAULT_LEVEL, LEVELS } from "./_level.js";

/**
 * Below this many characters the compression pass costs more in overhead than
 * it saves. The MCP middleware (tool results, prompts, resources) skips it.
 */
export const MIN_COMPRESS_LENGTH = 100;

/**
 * Compress a block of prose/markdown text. Fenced code blocks pass through
 * untouched; JSON content is returned unchanged.
 *
 * @param {string} text
 * @param {{ level?: string }} [options]
 * @returns {string}
 */
export function compressText(text, options) {
  return compressTextGuarded(text, options).text;
}

/**
 * Compress one text payload from a surface that is not a tool result: a
 * `rule://` resource body, a prompt body. Same pipeline, same guard, booked
 * under its own source so `rule_tool_stats` can say which surface saved what.
 *
 * @param {string} text
 * @param {{ level?: string, source?: string }} [options]
 * @returns {{ text: string, saved: number, rollbacks: number }}
 */
export function compressSurfaceText(text, { level = compressionLevel(), source = "compression" } = {}) {
  if (level === "off" || typeof text !== "string" || text === "" || looksLikeJson(text)) {
    return { text, saved: 0, rollbacks: 0 };
  }

  const compressed = compressTextGuarded(text, { level });
  addCompression(text.length, compressed.text.length, source);

  return { text: compressed.text, saved: Math.max(0, text.length - compressed.text.length), rollbacks: compressed.rollbacks };
}

/**
 * Compress an MCP tool result in place-safe fashion (returns a new object).
 * Only text content items that are prose (not JSON) are compressed.
 *
 * @param {{ content?: Array<{ type: string, text?: string }> }} result
 * @param {{ level?: string }} [options]
 * @returns {object} the same result when disabled, else a compressed copy
 */
export function compressResult(result, { level = compressionLevel() } = {}) {
  if (level === "off" || !result || !Array.isArray(result.content)) {
    return result;
  }

  let bytesIn = 0;
  let bytesOut = 0;
  let rollbacks = 0;
  const content = result.content.map((item) => {
    if (item && item.type === "text" && typeof item.text === "string" && !looksLikeJson(item.text)) {
      const compressed = compressTextGuarded(item.text, { level });
      bytesIn += item.text.length;
      bytesOut += compressed.text.length;
      rollbacks += compressed.rollbacks;

      return { ...item, text: compressed.text };
    }

    return item;
  });

  addCompression(bytesIn, bytesOut);

  // A rollback is the only thing worth reporting: it means a rule was unsafe
  // on this payload, which is a vocabulary bug, not a runtime condition.
  const meta = rollbacks > 0 ? { _meta: { ...result._meta, pixCompression: { level, rollbacks } } } : {};

  return { ...result, content, ...meta };
}
