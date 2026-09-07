/** The prompt path: resume signals, the announcement decision, and the one-door latch. */
import { rmSync } from "node:fs";

import { check, clearAnnounced, finish, isResumeSignal, markAnnounced, project, resumeAnnouncement, resumeContext, wasAnnouncedThisSession } from "./_resume.fixture.mjs";

console.log("=== Resuming a session picks up the handoff: prompt path ===\n");

const withHandoff = project();
const withoutHandoff = project({ handoff: false });

// ── T7: `resume` typed as the first message ──
check("T7 the bare word is a resume signal", isResumeSignal("resume"));
check(
  "T7.1 so are the phrasings people actually type",
  ["Resume.", "resume work", "resume the session", "riprendi", "riprendi il lavoro", "continue where we left off", "where did we leave off", "where were we", "handon"].every(
    (prompt) => isResumeSignal(prompt),
  ),
);
check(
  "T7.2 a real request is not a resume signal",
  ["resume the video playback after a seek", "continue implementing the parser", "add a button to the header", "riprendi il video dopo il seek e aggiorna la barra"].every(
    (prompt) => !isResumeSignal(prompt),
  ),
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
check("T9.4 a normal prompt announces nothing", resumeAnnouncement({ prompt: "add a button", cwd: withHandoff, force: true }) === "");
check("T9.5 no handoff, no announcement", resumeAnnouncement({ prompt: "resume", cwd: withoutHandoff, force: true }) === "");
process.env.RULE_MCP_NO_RESUME_HANDON = "1";
check("T9.6 the same opt-out silences it", resumeAnnouncement({ prompt: "resume", cwd: withHandoff, force: true }) === "");
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
check("T10.1 the tool path then stays quiet", resumeAnnouncement({ prompt: "resume", cwd: withHandoff, force: true }) === "");
check(
  "T10.2 a record from a previous session does not suppress it",
  (() => {
    markAnnounced(withHandoff, Date.now() - 24 * 60 * 60 * 1000);

    return !wasAnnouncedThisSession(withHandoff) && resumeAnnouncement({ prompt: "resume", cwd: withHandoff, force: true }).includes("01-cache-tiers");
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

finish();
