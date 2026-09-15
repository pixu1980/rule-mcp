

/**
 * @module cli/setup/exec
 *
 * Running this CLI's own subcommands in a child process.
 *
 * Steps like `skills install` and `doctor` write to stdout. Calling them
 * in-process would interleave their output with the wizard's frame and
 * corrupt the render, so they run out of process and their output is
 * captured as task log lines instead.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { entrypoint } from "../commands/_shared.js";

const execFileAsync = promisify(execFile);

/** Trim, split, and drop blank lines so a captured stream renders as log rows. */
const toLines = (text) =>
  String(text ?? "")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter(Boolean);

/**
 * Run `rule-mcp <args>` and capture what it printed.
 *
 * @param {string[]} args
 * @param {{ cwd?: string, timeout?: number, env?: object }} [options]
 * @returns {Promise<{ ok: boolean, lines: string[] }>}
 */
export async function runCliCommand(args, { cwd = process.cwd(), timeout = 120_000, env } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [entrypoint, ...args], {
      cwd,
      timeout,
      env: { ...process.env, ...env, NO_COLOR: "1" },
      maxBuffer: 8 * 1024 * 1024,
    });

    return { ok: true, lines: [...toLines(stdout), ...toLines(stderr)] };
  } catch (error) {
    return {
      ok: false,
      lines: [
        ...toLines(error.stdout),
        ...toLines(error.stderr),
        ...(error.stdout || error.stderr ? [] : [error.message]),
      ],
    };
  }
}
