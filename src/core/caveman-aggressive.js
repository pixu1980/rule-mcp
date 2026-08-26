/**
 * @module core/caveman-aggressive
 *
 * Aggressive extra compression pass applied ON TOP of the standard caveman
 * output (default since v1.0.0; opt out entirely with RULE_MCP_NO_CAVEMAN=1).
 *
 * Same safety rules as the standard compressor: fenced code blocks, inline
 * code spans, URLs, headings and table rows are protected; only prose is
 * touched. Multi-word phrases collapse to shorter equivalents and a few more
 * single-word fillers are removed.
 */

/** Multi-word phrases compressed to shorter equivalents (case-insensitive). */
const PHRASES = [
  ["in order to", "to"],
  ["as well as", "and"],
  ["note that", ""],
  ["please", ""],
  ["at this time", "now"],
  ["right now", "now"],
  ["kind of", ""],
  ["sort of", ""],
];
const PHRASE_RES = PHRASES.map(([from]) => new RegExp(String.raw`\b${from.replaceAll(" ", String.raw`\s+`)}\b`, "gi"));
const PHRASE_TOS = PHRASES.map(([, to]) => to);

/** Extra single-word fillers removed in aggressive mode. */
const AGGRESSIVE_RE = new RegExp(String.raw`\b(?:literally)\b\s*`, "gi");

/**
 * Aggressive extra pass over already-standard-compressed text.
 *
 * @param {string} text
 * @returns {string}
 */
export function compressTextAggressive(text) {
  if (typeof text !== "string" || text.length === 0 || text.trimStart().startsWith("```")) {
    return text;
  }
  let isInFence = false;
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("```")) {
        isInFence = !isInFence;
        return line;
      }
      if (isInFence || trimmed.startsWith("#") || trimmed.startsWith("|") || trimmed.startsWith(">")) {
        return line;
      }
      const protectedSpans = [];
      const protect = (m) => {
        protectedSpans.push(m);
        return `\x00${protectedSpans.length - 1}\x00`;
      };
      let work = line.replaceAll(/`[^`]*`/g, protect).replaceAll(/https?:\/\/\S+/g, protect);
      for (const [i, PHRASE_RE] of PHRASE_RES.entries()) {
        work = work.replace(PHRASE_RE, PHRASE_TOS[i]);
      }
      work = work
        .replaceAll(AGGRESSIVE_RE, "")
        .replaceAll(/[ \t]{2,}/g, " ")
        .replace(/[ \t]+$/, "");
      work = work.replaceAll(/\x00(\d+)\x00/g, (_, index) => protectedSpans[Number(index)]);
      return work;
    })
    .join("\n");
}
