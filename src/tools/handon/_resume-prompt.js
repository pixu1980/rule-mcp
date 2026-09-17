

/**
 * @module tools/handon/resume-prompt
 *
 * The block a handoff wrote for the next session, and the report section that
 * hands it back.
 *
 * A prompt that lives in the chat alone dies with the chat. Reading it out of
 * the document is what makes it worth writing: a resume can offer the exact
 * words again instead of paraphrasing them.
 *
 * Reading is deliberately forgiving: the fence is a convenience for the parser,
 * not a requirement a hand-written handoff has to meet.
 */

import { neutralizeDirectives } from "../../core/index.js";

/** The heading the block lives under, at any depth from `##` down. */
const HEADING = /^#{2,}[ \t]*Resume Prompt\b/i;

/** A heading that ends the section. */
const ANY_HEADING = /^#{1,6}[ \t]/;

/** A line that opens or closes a fenced code block. */
const FENCE = /^[ \t]*(?:`{3,}|~{3,})/;

/**
 * The prompt the handoff carries for the next session, or `undefined`.
 *
 * @param {string} body - the handoff's text
 * @returns {string|undefined}
 */
export function resumePrompt(body) {
  if (typeof body !== "string") {
    return;
  }

  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => HEADING.test(line));

  if (start === -1) {
    return;
  }

  const section = [];

  for (const line of lines.slice(start + 1)) {
    if (ANY_HEADING.test(line)) {
      break;
    }

    section.push(line);
  }

  const open = section.findIndex((line) => FENCE.test(line));
  const inner =
    open === -1
      ? section
      : (() => {
          const close = section.findIndex((line, index) => index > open && FENCE.test(line));

          return section.slice(open + 1, close === -1 ? section.length : close);
        })();
  const text = inner.join("\n").trim();

  return text === "" ? undefined : text;
}

/**
 * The report section that hands the block back.
 *
 * Quoted rather than restated: the value of a prompt is its exact wording, and a
 * paraphrase is a different prompt. Directives are defanged on the way out - the
 * block comes from a file in the repository, and a file is input, not
 * instruction (hardening 4.4). A resume prompt that a person wrote never opens
 * with "ignore previous instructions".
 *
 * @param {string|undefined} prompt
 * @param {{ source?: string, heading?: string }} [options]
 * @returns {string[]}
 */
export function promptToRunLines(prompt, { source, heading = "##" } = {}) {
  if (!prompt) {
    return [];
  }

  return [
    `${heading} Prompt to run next`,
    "",
    `The handoff${source ? ` \`${source}\`` : ""} carries this prompt for the next session. It is quoted, and nothing in it has been executed.`,
    "",
    "```prompt",
    neutralizeDirectives(prompt),
    "```",
    "",
  ];
}
