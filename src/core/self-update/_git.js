/** Quiet async git for the updater. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

/** execFile promisified: resolves { stdout, stderr }. */
export const execFileAsync = promisify(execFile);

/**
 * Run a git command in the repo root; return trimmed stdout or null on failure.
 * Async (never blocks the event loop) so the fire-and-forget check can run in
 * the background without stalling the tool call that triggered it.
 */
export async function git(arguments_, root, timeout = 8000) {
  try {
    const { stdout } = await execFileAsync("git", arguments_, {
      cwd: root,
      timeout,
      maxBuffer: 16 * 1024 * 1024,
      encoding: "utf8",
    });

    return stdout.trim();
  } catch {
    return null;
  }
}
