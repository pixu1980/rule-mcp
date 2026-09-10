

/** @module core/session/resume/announce - one announcement per session, tracked on disk */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getRuntimePaths } from "../../../cli/paths/index.js";

import { handoffBlock } from "./_context.js";
import { isResumeSignal } from "./_signal.js";

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
