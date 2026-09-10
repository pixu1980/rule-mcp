

/** @module tools/a11y/report */

import { renderEarl } from "./_earl.js";
import { evaluate } from "./_evaluate.js";
import { renderMarkdown } from "./_markdown.js";

/**
 * Build the report.
 *
 * @param {{
 *   scope: { title: string, url: string, level?: "A"|"AA"|"AAA" },
 *   sample?: string[],
 *   results?: Array<{ criterion: string, outcome: string, note?: string, location?: string }>,
 *   evaluator?: string,
 *   date?: string,
 * }} input
 * @returns {{ markdown: string, earl: string, summary: object }}
 */
export function buildReport(input) {
  const ev = evaluate(input);

  return { markdown: renderMarkdown(ev), earl: renderEarl(ev), summary: ev.summary };
}
