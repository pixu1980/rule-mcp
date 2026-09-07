/**
 * @module test/session-resume.test
 *
 * Resuming a session should not require remembering to resume it.
 *
 * `rule_tool_process_handoff` writes the snapshot and `rule_tool_process_handon`
 * verifies it, but both are typed by hand: the one session that most needs the
 * handoff is the one where the user reopened the agent hours later and started
 * asking questions, and nothing reminded either side that a handoff exists.
 *
 * The harness knows. SessionStart carries `source: "resume"`, so the hook that
 * already injects the session directive can inject the verified handoff too, in
 * the same process, before the first prompt.
 *
 * The CLI `guard` path (inject(), the stdin contract) lands with cli/guard.js
 * in the CLI phase; the router decoration (resumeAnnouncement on a `resume`
 * prompt) lands when the gateway wires the output layer. The module semantics
 * are pinned here.
 *
 * Ported upstream behavior with the tool names rebranded to rule-native.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export * from "../../../src/core/session/resume/index.js";

let pass = 0;
let fail = 0;

/** Print-style assertion; exit code handled by finish(). */
export const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  \u{2705} ${label}`);
  } else {
    fail++;
    console.log(`  \u{274C} ${label}`);
  }
};

/** Print the tally and set the exit code. */
export function finish() {
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) {
    process.exit(1);
  }
}

/** A project with one handoff, and a git repository so handon has something to verify. */
export function project({ handoff = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rule-resume-"));
  execFileSync("git", ["init", "-q", "-b", "feat/x"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "t@t.t"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "t"], { cwd: dir, stdio: "ignore" });
  writeFileSync(join(dir, "README.md"), "# t\n");
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-qm", "chore(test): seed"], { cwd: dir, stdio: "ignore" });
  if (handoff) {
    mkdirSync(join(dir, "docs", "handoff"), { recursive: true });
    writeFileSync(
      join(dir, "docs", "handoff", "01-cache-tiers.md"),
      [
        "# Handoff: cache tiers",
        "",
        "- **Date**: 2026-08-30",
        "- **Branch**: `feat/x`",
        "",
        "## Open",
        "",
        "- [ ] Wire the normalized key into `rule_tool_gateway`",
        "- [ ] Run `pnpm run ci` before the commit",
        "",
      ].join("\n"),
    );
  }

  return dir;
}
