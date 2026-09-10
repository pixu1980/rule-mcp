

/** @module core/session/resume/context - the verified handon block a resumed session receives */

import { compressSurfaceText } from "../../text/_caveman.js";
import { handon } from "../../../tools/handon/index.js";
import { markAnnounced } from "./_announce.js";

/** Session sources that mean "the user came back to unfinished work". */
const RESUMED = new Set(["resume"]);

/**
 * Ceiling on the injected block. A handoff is normally a page; a pathological
 * one must not become the largest thing in the context window before the user
 * has typed a word.
 */
const MAX_CHARS = 8000;

/**
 * The verified handoff as a block, or "" when there is nothing to say. Never
 * throws: a caller that fails must degrade to saying nothing.
 *
 * @param {string} [cwd]
 * @param {string} occasion - What made this fire, stated to the reader
 * @returns {string} Markdown block, or ""
 */
export function handoffBlock(cwd, occasion) {
  if (process.env.RULE_MCP_NO_RESUME_HANDON === "1") {
    return "";
  }

  let report;
  try {
    report = handon({ projectDir: cwd ?? process.cwd() });
  } catch {
    return "";
  }
  // No source means no handoff file. handon says so in prose for a human who
  // asked; nobody asked here, so the answer is silence.
  if (!report?.source || !report.text) {
    return "";
  }

  const body = report.text.length > MAX_CHARS ? `${report.text.slice(0, MAX_CHARS)}\n\n(truncated: call \`rule_tool_process_handon\` for the rest)` : report.text;

  const block = [
    "## PIX RESUMED SESSION",
    "",
    `${occasion} \`${report.source}\` was verified against the repository as it is` +
      " now, by `rule_tool_process_handon`. Every claim below carries its own" +
      " verdict: act on what is still true, re-derive what changed, and treat" +
      " unverified as unknown.",
    "",
    body,
    "",
    "Continue from the suggested first move unless the user asks for something else. Do not restate this back to them.",
  ].join("\n");

  // Injected verbatim into the model's context by the SessionStart hook, so it
  // is prose the model pays for, exactly like a tool result - it goes through
  // the same caveman pipeline and guardian before it leaves (plan item 1). When
  // caveman is off the pass returns the input unchanged and books nothing.
  return compressSurfaceText(block, { source: "caveman-resume" }).text;
}

/**
 * The context to inject when a session is resumed, or "" when there is nothing
 * to say. Never throws: a hook that fails must degrade to the directive alone.
 *
 * @param {{ source?: string, cwd?: string }} [payload] - The SessionStart hook payload
 * @returns {string} Markdown block, or ""
 */
export function resumeContext(payload = {}) {
  if (!RESUMED.has(payload?.source ?? "")) {
    return "";
  }

  const block = handoffBlock(payload.cwd, "This session was resumed, so");
  // Recorded for the other door: the tool path runs in a different process and
  // would otherwise inject the same page again on the first `resume` prompt.
  if (block) {
    markAnnounced(payload.cwd);
  }

  return block;
}
