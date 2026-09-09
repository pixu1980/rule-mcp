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
 * This is the one place where the original and the compressed text are both in
 * hand, so it is also where the structural guard runs on the result of every
 * mode: a pass that loses a heading, a code block or a URL is reported and the
 * original is returned instead.
 *
 * No model call, no filesystem, no clock: same input, same output, so the
 * result cache can replay it.
 *
 * @see module:core/text/caveman - filler removal
 * @see module:core/text/compress-guard - the structural guard
 * @see module:core/text/fingerprint - typographic and spelling conversion
 * @see module:core/text/ascii-box - box alignment, which the fingerprint mode carries
 */

import { z } from "zod/v4";
import { alignAsciiBoxes } from "../core/text/ascii-box/index.js";
import { compressText } from "../core/text/_caveman.js";
import { isSensitivePath } from "../core/text/_sensitive.js";
import { guardCompression } from "../core/text/compress-guard/index.js";
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
    fileName: z.string().optional().describe("Where the prose came from, when it came from a file. A sensitive name (.env, credentials, id_rsa, anything under .ssh) is refused"),
  });

  registerTool({
    name: "rule_tool_compress",
    description:
      "Compress prose deterministically: strip filler and leading articles, replace typographic characters " +
      "with ASCII, convert British spelling to American. Code, inline spans, URLs and JSON are never touched.",
    zodSchema: CompressSchema,
    handler: async (arguments_) => {
      const { text, mode = "both", fileName } = arguments_;

      // A file name is the only signal available before the read, so the
      // refusal is hard rather than a warning after the fact.
      if (isSensitivePath(fileName)) {
        const refusal =
          `# rule_tool_compress: REFUSED\n\n**File:** ${fileName}\n\n` +
          `That name looks like a secret (.env, credentials, a key, or a path under .ssh). ` +
          `Compression rewrites text and reports what it removed - neither belongs anywhere near a credential.`;

        return { isError: true, content: [{ type: "text", text: refusal }], _meta: { pixCompress: { mode, refused: "sensitive-file-name" } } };
      }

      const candidate = compress(text, mode);
      const verdict = guardCompression(text, candidate);
      const out = verdict.ok ? candidate : text;
      const before = estimateTokens(text);
      const after = estimateTokens(out);
      const saved = Math.max(0, before - after);
      const percent = before > 0 ? Math.round((saved / before) * 100) : 0;
      const violations = verdict.violations.map((violation) => `${violation.rule}: ${violation.message}`);

      return {
        content: [{ type: "text", text: out }],
        _meta: { pixCompress: { mode, beforeTokens: before, afterTokens: after, saved, percent, guarded: verdict.ok, violations } },
      };
    },
  });
}
