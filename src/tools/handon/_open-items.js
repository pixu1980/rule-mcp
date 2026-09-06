/** The still-open items a handoff hands to the next session. */
import { looksLikeBranch, looksLikeCommand } from "./_shapes.js";

/**
 * What the handoff says is left to do.
 *
 * Two shapes, because handoffs are written by hand and both are in use: an
 * unchecked checkbox anywhere in the document, and the list under a "Next"
 * heading, which is what every handoff in this repository actually uses. A
 * checked box is done, and prose under the heading is prose, so neither counts.
 * The list ends where the following heading begins.
 *
 * @param {string} body - the handoff's text
 * @returns {string[]} the items, in the order the handoff put them
 */
export function openItems(body) {
  const boxes = [...body.matchAll(/^[ \t]*[-*]\s*\[ \]\s*(.+?)\s*$/gm)].map((match) => match[1]);
  const lines = body.split("\n");
  const heading = lines.findIndex((line) => /^#{2,}[ \t]*Next\b/i.test(line));

  if (heading === -1) {
    return boxes;
  }

  const listed = [];
  let current = "";

  const flush = () => {
    if (current === "") {
      return;
    }

    listed.push(current);
    current = "";
  };

  for (const line of lines.slice(heading + 1)) {
    if (/^#{2,}[ \t]/.test(line)) {
      break;
    }

    const item = line.match(/^[ \t]*(?:\d{1,3}\.|[-*])[ \t]+(?!\[[ xX]\])(.{1,300}?)[ \t]*$/);

    if (item) {
      flush();
      current = item[1];
      continue;
    }

    // A handoff is written to a column, so an item longer than the line
    // continues on the next one. Truncating at the wrap hands the next session
    // half a sentence, which is worse than handing it nothing.
    if (current !== "" && line.trim() !== "") {
      current = `${current} ${line.trim()}`.slice(0, 400);
      continue;
    }

    flush();
  }

  flush();

  const seen = new Set(boxes);

  return [...boxes, ...listed.filter((item) => !seen.has(item))];
}
