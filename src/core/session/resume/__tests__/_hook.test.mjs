/** The hook path: SessionStart source decides, the handoff is verified, the opt-out works. */
import { rmSync } from "node:fs";
import { join } from "node:path";

import { check, finish, project, resumeContext } from "./_resume.fixture.mjs";

console.log("=== Resuming a session picks up the handoff: hook path ===\n");

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
check("T2 a project without a handoff injects nothing", resumeContext({ source: "resume", cwd: withoutHandoff }) === "");
check("T2.1 a directory that does not exist injects nothing", resumeContext({ source: "resume", cwd: join(withoutHandoff, "nope") }) === "");

// ── T3: verified, not restated ──
check("T3 the claims are verified, not repeated", resumed.includes("Still true"));
check("T3.1 the open items survive", resumed.includes("rule_tool_gateway"));
check("T3.2 it says the check was automatic", /rule_tool_handon/.test(resumed));

// ── T4: the opt-out ──
process.env.RULE_MCP_NO_RESUME_HANDON = "1";
check("T4 the opt-out silences it", resumeContext({ source: "resume", cwd: withHandoff }) === "");
delete process.env.RULE_MCP_NO_RESUME_HANDON;

rmSync(withHandoff, { recursive: true, force: true });
rmSync(withoutHandoff, { recursive: true, force: true });

finish();
