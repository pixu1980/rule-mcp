

/** Parse a handoff body into its claims. */
import { ADR_DIR, PENDING_WINDOW } from "./_constants.js";
import { codeSpans, looksLikeBranch, looksLikePath, looksLikeCommand } from "./_shapes.js";
import { openItems } from "./_open-items.js";

/**
 * What a handoff asserts.
 *
 * A claim that cannot be found is not silently dropped - it lands in `missing`,
 * and the report names it. Half a report the reader can see the shape of beats a
 * whole report that quietly left something out.
 *
 * @param {string} body
 * @returns {object}
 */
export function parseHandoff(body) {
  const spans = codeSpans(body);
  const rangeMatch = body.match(/\b([0-9a-f]{7,40})\.\.(HEAD|[0-9a-f]{7,40})\b/);
  const declared = body.match(/\*\*Branch:\*\*\s*`?([\w./-]+)`?/)?.[1];

  const branches = [...new Set([declared, ...spans.filter((span) => looksLikeBranch(span))].filter(Boolean))];
  const files = spans.filter((span) => looksLikePath(span));

  const adrs = new Set();
  const pending = new Set();

  for (const match of body.matchAll(/\bADRs?\s+(\d{3})(?:\s+(?:to|-|through)\s+(\d{3}))?/gi)) {
    const from = Number.parseInt(match[1], 10);
    const to = match[2] ? Number.parseInt(match[2], 10) : from;
    const around = body.slice(Math.max(0, match.index - PENDING_WINDOW), match.index + PENDING_WINDOW);
    const claimsPending = /\b(?:pending|proposed|not written|unwritten|still to|to be accepted|outstanding)\b/i.test(around);

    for (let number = from; number <= to && number - from < 20; number += 1) {
      const id = String(number).padStart(3, "0");
      adrs.add(id);

      if (claimsPending) {
        pending.add(id);
      }
    }
  }

  for (const match of body.matchAll(new RegExp(String.raw`${ADR_DIR}/(\d{3})`, "g"))) {
    adrs.add(match[1]);
  }

  const open = openItems(body);

  const commands = spans.filter((span) => {
    if (!looksLikeCommand(span)) {
      return false;
    }

    const at = body.indexOf(`\`${span}\``);
    const around = body.slice(at, at + span.length + PENDING_WINDOW);

    return /\b(?:green|pass(?:es|ed|ing)?|clean|zero|succeeds?|ok)\b/i.test(around);
  });

  const missing = [];

  if (branches.length === 0) {
    missing.push("branch");
  }

  if (!rangeMatch) {
    missing.push("commit range");
  }

  if (files.length === 0) {
    missing.push("files in flight");
  }

  return {
    title: body.match(/^#\s+(.+)$/m)?.[1] ?? "",
    date: body.match(/\*\*Date:\*\*\s*`?([\d-]+)`?/)?.[1] ?? "",
    branches,
    range: rangeMatch ? { start: rangeMatch[1], end: rangeMatch[2] } : undefined,
    files,
    adrs: [...adrs].sort(),
    pending,
    open,
    commands,
    missing,
  };
}
