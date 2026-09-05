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
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  clearAnnounced,
  isResumeSignal,
  markAnnounced,
  resumeAnnouncement,
  resumeContext,
  wasAnnouncedThisSession,
} from "../src/core/resume.js";

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("=== Resuming a session picks up the handoff ===\n");

/** A project with one handoff, and a git repository so handon has something to verify. */
function project({ handoff = true } = {}) {
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

const withHandoff = project();
const withoutHandoff = project({ handoff: false });

// ── T1: the source decides ──
const resumed = resumeContext({ source: "resume", cwd: withHandoff });
check("T1 a resumed session gets the handoff", Boolean(resumed) && resumed.includes("01-cache-tiers"));
check("T1.1 startup gets nothing", resumeContext({ source: "startup", cwd: withHandoff }) === "");
check("T1.2 clear gets nothing: a wipe is deliberate", resumeContext({ source: "clear", cwd: withHandoff }) === "");
check("T1.3 fork gets nothing: it inherits the context", resumeContext({ source: "fork", cwd: withHandoff }) === "");
check("T1.4 a missing source gets nothing", resumeContext({ cwd: withHandoff }) === "");

// ── T2: no handoff, no injection ──
check(
  "T2 a project without a handoff injects nothing",
  resumeContext({ source: "resume", cwd: withoutHandoff }) === "",
);
check(
  "T2.1 a directory that does not exist injects nothing",
  resumeContext({ source: "resume", cwd: join(withoutHandoff, "nope") }) === "",
);

// ── T3: verified, not restated ──
check("T3 the claims are verified, not repeated", resumed.includes("Still true"));
check("T3.1 the open items survive", resumed.includes("rule_tool_gateway"));
check("T3.2 it says the check was automatic", /rule_tool_process_handon/.test(resumed));

// ── T4: the opt-out ──
process.env.RULE_MCP_NO_RESUME_HANDON = "1";
check("T4 the opt-out silences it", resumeContext({ source: "resume", cwd: withHandoff }) === "");
delete process.env.RULE_MCP_NO_RESUME_HANDON;

// ── T7: `resume` typed as the first message ──
check("T7 the bare word is a resume signal", isResumeSignal("resume"));
check(
  "T7.1 so are the phrasings people actually type",
  [
    "Resume.",
    "resume work",
    "resume the session",
    "riprendi",
    "riprendi il lavoro",
    "continue where we left off",
    "where did we leave off",
    "where were we",
    "handon",
  ].every((prompt) => isResumeSignal(prompt)),
);
check(
  "T7.2 a real request is not a resume signal",
  [
    "resume the video playback after a seek",
    "continue implementing the parser",
    "add a button to the header",
    "riprendi il video dopo il seek e aggiorna la barra",
  ].every((prompt) => !isResumeSignal(prompt)),
);
check("T7.3 an empty prompt is not a signal", !isResumeSignal("") && !isResumeSignal());

// ── T9 (unit half): the announcement decision, with the latch bypassed ──
clearAnnounced(withHandoff); // T1's hook-path injection recorded it; `force` only bypasses the module latch
check(
  "T9.3 a resume prompt produces the block",
  (() => {
    const text = resumeAnnouncement({ prompt: "resume", cwd: withHandoff, force: true });

    return Boolean(text) && text.includes("01-cache-tiers") && text.includes("Still true");
  })(),
);
check(
  "T9.4 a normal prompt announces nothing",
  resumeAnnouncement({ prompt: "add a button", cwd: withHandoff, force: true }) === "",
);
check(
  "T9.5 no handoff, no announcement",
  resumeAnnouncement({ prompt: "resume", cwd: withoutHandoff, force: true }) === "",
);
process.env.RULE_MCP_NO_RESUME_HANDON = "1";
check(
  "T9.6 the same opt-out silences it",
  resumeAnnouncement({ prompt: "resume", cwd: withHandoff, force: true }) === "",
);
delete process.env.RULE_MCP_NO_RESUME_HANDON;

// ── T10: the two doors do not both open ──
check(
  "T10 the hook path records what it injected",
  (() => {
    clearAnnounced(withHandoff);
    const injected = resumeContext({ source: "resume", cwd: withHandoff });

    return Boolean(injected) && wasAnnouncedThisSession(withHandoff);
  })(),
);
check(
  "T10.1 the tool path then stays quiet",
  resumeAnnouncement({ prompt: "resume", cwd: withHandoff, force: true }) === "",
);
check(
  "T10.2 a record from a previous session does not suppress it",
  (() => {
    markAnnounced(withHandoff, Date.now() - 24 * 60 * 60 * 1000);

    return (
      !wasAnnouncedThisSession(withHandoff) &&
      resumeAnnouncement({ prompt: "resume", cwd: withHandoff, force: true }).includes("01-cache-tiers")
    );
  })(),
);
check(
  "T10.3 the record is per project",
  (() => {
    clearAnnounced(withHandoff);
    markAnnounced(withHandoff);

    return wasAnnouncedThisSession(withHandoff) && !wasAnnouncedThisSession(withoutHandoff);
  })(),
);
clearAnnounced(withHandoff);

rmSync(withHandoff, { recursive: true, force: true });
rmSync(withoutHandoff, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
