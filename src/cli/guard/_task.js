/**
 * @module cli/guard/_task
 *
 * The task the structural gate asks once per (ADR 129).
 *
 * A task runs from one user prompt to the next, which is the only boundary
 * every host agrees on: `UserPromptSubmit` fires at its start and nothing fires
 * at its end. The record is keyed by project rather than by session, because
 * the server process that carries the model's declaration never sees the
 * `session_id` the hook process is given, and both of them do see the project.
 *
 * @see module:cli/guard/_structure - what counts as structural
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { getRuntimePaths } from "../paths/index.js";

/** A task nobody has started, declared or confirmed. */
const FRESH = { startedAt: 0, declared: "", asked: false, confirmed: false };

/** Where a project's current task is recorded. */
function taskFile(cwd) {
  const key = createHash("sha256")
    .update(resolve(cwd ?? process.cwd()))
    .digest("hex")
    .slice(0, 16);

  return join(getRuntimePaths().stateDir, "task", `${key}.json`);
}

/**
 * The project's current task.
 *
 * @param {string} [cwd]
 * @returns {{ startedAt: number, declared: string, asked: boolean, confirmed: boolean }}
 */
export function readTask(cwd) {
  const file = taskFile(cwd);

  if (!existsSync(file)) {
    return { ...FRESH };
  }

  try {
    return { ...FRESH, ...JSON.parse(readFileSync(file, "utf8")) };
  } catch {
    return { ...FRESH };
  }
}

/**
 * Write the project's task record. A record that cannot be written costs a
 * second confirmation, never a crash.
 *
 * @param {string|undefined} cwd
 * @param {object} task
 */
function writeTask(cwd, task) {
  const file = taskFile(cwd);

  try {
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, JSON.stringify(task), "utf8");
  } catch {
    /* the gate asks again rather than failing the tool call */
  }
}

/**
 * Start a new task: a prompt arrived, so whatever the last one was confirmed
 * no longer covers this one.
 *
 * @param {string} [cwd]
 * @param {number} [at] - epoch ms, for tests that need a fixed clock
 */
export function startTask(cwd, at = Date.now()) {
  writeTask(cwd, { ...FRESH, startedAt: at });
}

/**
 * Record that the model called this task structural, and why. Said before the
 * first write, this is what the one confirmation of the task is asked about.
 *
 * @param {string} [cwd]
 * @param {string} [summary] - what the model is about to change, in its own words
 */
export function declareStructural(cwd, summary = "") {
  writeTask(cwd, { ...readTask(cwd), declared: String(summary).slice(0, 2000) });
}

/**
 * Record that the confirmation has been put to the person at the keyboard.
 *
 * @param {string} [cwd]
 */
export function markAsked(cwd) {
  writeTask(cwd, { ...readTask(cwd), asked: true });
}

/**
 * Record that the confirmation was given.
 *
 * A write landing after the question was asked is the answer: the harness only
 * runs the tool call the person allowed, so the file on disk is the yes. A
 * refusal leaves `asked` standing and the next structural write asks again,
 * which is the whole point of having refused.
 *
 * @param {string} [cwd]
 */
export function confirmIfAsked(cwd) {
  const task = readTask(cwd);

  if (task.asked && !task.confirmed) {
    writeTask(cwd, { ...task, confirmed: true });
  }
}

/**
 * Drop the record. Used by the tests, and harmless anywhere else.
 *
 * @param {string} [cwd]
 */
export function clearTask(cwd) {
  try {
    rmSync(taskFile(cwd), { force: true });
  } catch {
    /* nothing to drop */
  }
}
