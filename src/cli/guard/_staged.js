/** @module cli/guard/staged - guardrail failures over the staged files */

import { execFileSync } from "node:child_process";
import { CHECKABLE, skillForPath } from "./_decide.js";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { checkCode } from "../../core/guardrails/index.js";

/** @returns {string[]} staged files worth checking */
export function stagedFiles() {
  try {
    // Bounded: this runs inside a PreToolUse hook, so a git that blocks - an
    // index lock held by another process, a filesystem that stops answering -
    // would hang the agent's tool call rather than this helper.
    return execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM"], {
      encoding: "utf8",
      timeout: 5000,
      killSignal: "SIGKILL",
      maxBuffer: 4 * 1024 * 1024,
    })
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && CHECKABLE.has(extname(line)));
  } catch {
    return [];
  }
}

/** @returns {Array<{ file: string, failures: string[] }>} */
export function stagedFailures() {
  const results = [];

  for (const file of stagedFiles()) {
    let code;
    try {
      code = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const report = checkCode(skillForPath(file), code, { fileName: file });

    if (!report.allPass) {
      results.push({ file, failures: report.failed.map((f) => f.id) });
    }
  }

  return results;
}
