/**
 * @module tools/compress
 *
 * `rule_tool_compress`: runs the two output passes over arbitrary prose.
 *
 * The passes already run on every tool result, but the model writes plenty of
 * text the server never sees - an answer, a commit message, a PR description.
 * This exposes the same deterministic transformation so that text can be run
 * through it before it is written out, instead of the model trying to apply
 * the rules from memory.
 *
 * No model call, no filesystem, no clock: same input, same output, so the
 * result cache can replay it.
 *
 * @see module:core/text/caveman - filler removal
 * @see module:core/text/fingerprint - typographic and spelling conversion
 * @see module:core/text/ascii-box - box alignment, which the fingerprint mode carries
 */

import { z } from "zod/v4";
import { alignAsciiBoxes } from "../core/text/ascii-box/index.js";
import { compressText } from "../core/text/_caveman.js";
import { stripFingerprint } from "../core/text/fingerprint/index.js";
import { registerTool } from "./router/index.js";

/** Rough token estimate, good enough to report a saving. */
const estimateTokens = (text) => Math.ceil(text.length / 4);

/**
 * Apply the passes a caller asked for.
 *
 * @param {string} text
 * @param {"both"|"caveman"|"fingerprint"} mode
 * @returns {string}
 */
export function compress(text, mode = "both") {
  if (mode === "caveman") {
    return compressText(text);
  }

  if (mode === "fingerprint") {
    return alignAsciiBoxes(stripFingerprint(text));
  }

  return alignAsciiBoxes(stripFingerprint(compressText(text)));
}

/** Register the rule_tool_compress tool. */
export function registerCompressTool() {
  const CompressSchema = z.object({
    text: z.string().describe("Prose to compress. Code fences, inline code, URLs and JSON pass through untouched"),
    mode: z.enum(["both", "caveman", "fingerprint"]).default("both").describe("both (default), caveman (filler only), fingerprint (punctuation and spelling only)"),
  });

  registerTool({
    name: "rule_tool_compress",
    description:
      "Compress prose deterministically: strip filler and leading articles, replace typographic characters " +
      "with ASCII, convert British spelling to American. Code, inline spans, URLs and JSON are never touched.",
    zodSchema: CompressSchema,
    handler: async (arguments_) => {
      const { text, mode = "both" } = arguments_;
      const out = compress(text, mode);
      const before = estimateTokens(text);
      const after = estimateTokens(out);
      const saved = Math.max(0, before - after);
      const percent = before > 0 ? Math.round((saved / before) * 100) : 0;

      return {
        content: [{ type: "text", text: out }],
        _meta: { pixCompress: { mode, beforeTokens: before, afterTokens: after, saved, percent } },
      };
    },
  });
}
