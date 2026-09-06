/**
 * @module core/resume
 *
 * The handoff a resumed session would otherwise have to be asked for.
 *
 * `rule_tool_process_handoff` writes the snapshot and `rule_tool_process_handon`
 * verifies it against the repository as it is now (ADR 052). Both are typed by
 * hand, and the session that most needs them is the one where nobody types
 * anything: the user reopens the agent with `resume` hours later and asks the
 * next question, while the file that says where the work stopped sits unread in
 * `docs/handoff/`.
 *
 * The harness already knows. SessionStart carries `source: "resume"`, so the
 * hook that injects the session directive can inject the verified handoff in the
 * same process, before the first prompt is answered.
 *
 * Not every harness spells it that way. `pi resume` and its equivalents turn the
 * word into the user's first message, and no hook fires at all - an MCP server
 * has no session-start event to listen to. But it does see the prompt the moment
 * the model routes it, which is the same moment, so the prompt is the second
 * signal: `resumeAnnouncement` for the tool path, `resumeContext` for the hook.
 *
 * Two doors, one page. The hook cannot see the server's module latch, so it
 * leaves a record in the state directory and the tool path reads it: injected
 * after this process started means injected during this session, and stays
 * quiet. An older record is a previous session's and suppresses nothing.
 *
 * Three deliberate limits:
 *
 *   - **Resume only.** `startup` is a new session, `fork` inherits the context
 *     it forked from, and `clear` is a wipe the user asked for. Injecting a
 *     handoff into any of those overrides an intention rather than serving one.
 *   - **Verified, never restated.** The injected text is handon's output, so a
 *     merged branch or a landed ADR arrives labeled as changed. A hook that
 *     pasted the handoff would hand the model a stale snapshot with the
 *     confidence of the original, which is the failure ADR 052 exists to stop.
 *   - **Silent when there is nothing.** No handoff means no injection. An
 *     apology for an absent file is tokens spent to say nothing.
 *
 * Opt out with `RULE_MCP_NO_RESUME_HANDON=1`.
 *
 * @see module:cli/guard - the hook that calls this
 * @see module:tools/handon - the verification being reused
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getRuntimePaths } from "../../cli/paths.js";
import { handon } from "../../tools/handon/index.js";

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
function handoffBlock(cwd, occasion) {
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

  const body =
    report.text.length > MAX_CHARS
      ? `${report.text.slice(0, MAX_CHARS)}\n\n(truncated: call \`rule_tool_process_handon\` for the rest)`
      : report.text;

  return [
    "## PIX RESUMED SESSION",
    "",
    `${occasion} \`${report.source}\` was verified against the repository as it is` +
      " now, by `rule_tool_process_handon`. Every claim below carries its own" +
      " verdict: act on what is still true, re-derive what changed, and treat" +
      " unverified as unknown.",
    "",
    body,
    "",
    "Continue from the suggested first move unless the user asks for something" +
      " else. Do not restate this back to them.",
  ].join("\n");
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

/**
 * Prompts that mean "carry on from where we stopped" and nothing else.
 *
 * `pi resume`, and every harness that spells it that way, does not fire a hook:
 * it turns the word into the user's first message. So the only place it can be
 * caught is the prompt, and the prompt is read strictly: the whole prompt, once
 * punctuation and case are gone, has to be one of these. A rule that fired on any
 * sentence containing "continue" would answer "continue implementing the parser"
 * with a handoff.
 */
const RESUME_PHRASES = new Set([
  "resume",
  "resume work",
  "resume the work",
  "resume session",
  "resume the session",
  "resume where we left off",
  "continue",
  "continue work",
  "continue the work",
  "continue where we left off",
  "continue from where we left off",
  "pick up where we left off",
  "where were we",
  "where did we leave off",
  "handon",
  "handoff",
  "riprendi",
  "riprendi il lavoro",
  "riprendi da dove eravamo",
  "continua",
  "continua il lavoro",
  "dove eravamo",
]);

/**
 * Whether a prompt asks to resume and asks nothing else.
 *
 * @param {string} [prompt]
 * @returns {boolean}
 */
export function isResumeSignal(prompt) {
  if (typeof prompt !== "string") {
    return false;
  }

  const normalized = prompt
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s]+/gu, " ")
    .replaceAll(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return false;
  }

  return RESUME_PHRASES.has(normalized);
}

/** Once per process. A handoff is what to work on, stated once, not per call. */
let announced = false;

/**
 * When this process started, which for a stdio MCP server is when the session
 * started: the harness launches one server per session and keeps it for the
 * duration. That is the only session identity the two paths share - the hook
 * runs in a separate short-lived process and knows a `session_id` this server
 * never sees.
 */
const PROCESS_STARTED_AT = Date.now() - Math.round(process.uptime() * 1000);

/** Where the record lives. Keyed by project, because two projects are two answers. */
function recordFile(cwd) {
  const key = createHash("sha256")
    .update(resolve(cwd ?? process.cwd()))
    .digest("hex")
    .slice(0, 16);

  return join(getRuntimePaths().stateDir, "resume", `${key}.json`);
}

/**
 * Record that the handoff was announced for this project, now.
 *
 * @param {string} [cwd]
 * @param {number} [at] - Epoch ms, for tests that need an older record
 */
export function markAnnounced(cwd, at = Date.now()) {
  const file = recordFile(cwd);
  try {
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, JSON.stringify({ at }), "utf8");
  } catch {
    /* a record that cannot be written costs a duplicate, never a crash */
  }
}

/**
 * Whether something already announced the handoff for this project during this
 * session. A record older than this process is a previous session's: resuming
 * twice from the same handoff must work twice.
 *
 * @param {string} [cwd]
 * @returns {boolean}
 */
export function wasAnnouncedThisSession(cwd) {
  const file = recordFile(cwd);

  if (!existsSync(file)) {
    return false;
  }

  try {
    const { at } = JSON.parse(readFileSync(file, "utf8"));

    return typeof at === "number" && at >= PROCESS_STARTED_AT;
  } catch {
    return false;
  }
}

/** Drop the record. Used by the tests, and harmless anywhere else. */
export function clearAnnounced(cwd) {
  try {
    rmSync(recordFile(cwd), { force: true });
  } catch {
    /* nothing to drop */
  }
}

/**
 * The block to prepend when the prompt itself is the resume signal, or "".
 *
 * Uncached by construction: the caller applies it as decoration, beside the
 * self-update banner, so a stored result never carries a snapshot of a
 * repository that has since moved.
 *
 * @param {{ prompt?: string, cwd?: string, force?: boolean }} [options] - `force` ignores the once-per-process latch
 * @returns {string} Markdown block, or ""
 */
export function resumeAnnouncement({ prompt, cwd, force = false } = {}) {
  if (announced && !force) {
    return "";
  }

  if (!isResumeSignal(prompt)) {
    return "";
  }

  if (wasAnnouncedThisSession(cwd)) {
    return "";
  }

  const block = handoffBlock(cwd, "You were asked to resume, so");

  if (!block) {
    return "";
  }

  announced = true;
  markAnnounced(cwd);

  return block;
}
