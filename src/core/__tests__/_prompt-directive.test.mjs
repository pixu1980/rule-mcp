

/**
 * @module test/prompt-directive.test
 *
 * The three rules a session cannot be trusted to remember on turn 50:
 *   - call `rule` before implementing anything
 *   - never spawn a subagent to do what a deterministic tool already does
 *   - keep the output compressed, because every token saved is a token earned
 *
 * These live in the harness: SessionStart carries the full directive once,
 * UserPromptSubmit re-anchors it on every prompt in one short line.
 *
 * The CLI `guard` contract (T7) and the generated agent commands (T8) land with
 * cli/guard.js and the agent-integrations merge in later phases; the pure text,
 * the hook entries, and the settings merge are covered here.
 *
 * Ported upstream behavior with the tool names rebranded to rule-native.
 */

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

console.log("=== Per-prompt directive ===\n");

import { MANTRA, NO_SUBAGENTS, directiveEnabled, promptDirective, sessionDirective } from "../index.js";
import { HOOK_MARKER, hasHooks, hookEntries, withHooks, withoutHooks } from "../agents/_hooks.js";

const LAUNCHER = { command: "/usr/local/bin/rule-mcp", args: [] };
const EVENTS = ["PreToolUse", "PostToolUse", "SessionStart", "UserPromptSubmit"];

// ── T1: one canonical wording, reused verbatim everywhere ──
check("T1 the no-subagent rule names the cost", /subagent/i.test(NO_SUBAGENTS) && /token/i.test(NO_SUBAGENTS));
check("T1.1 it names the replacements", /rule/i.test(NO_SUBAGENTS) && /tokensave/i.test(NO_SUBAGENTS));
check("T1.2 the mantra is the agreed sentence", MANTRA === "Every token saved is a token earned.");

// ── T2: the session directive carries all four rules ──
const session = sessionDirective();
check("T2 rule first", /\bpix\b/.test(session) && /before any implementation/i.test(session));
check("T2.1 no subagents, verbatim", session.includes(NO_SUBAGENTS));
check("T2.2 compression output", /compression/i.test(session));
check("T2.3 the mantra closes it", session.includes(MANTRA));
check("T2.4 plain ASCII only", /^[ -~\n]*$/.test(session));
check("T2.5 flight rides along under rule-area-process-flight", /rule-area-process-flight/.test(session) && /telemetry/i.test(session));

// ── T3: the per-prompt line is one short line, or it is not worth sending ──
const line = promptDirective();
check("T3 a single line", !line.includes("\n"));
check("T3.1 short enough to ride on every prompt", line.length <= 120);
check("T3.2 it still names all three rules", /rule/i.test(line) && /compression/i.test(line) && /subagent/i.test(line) && /token/i.test(line));
check("T3.3 it re-anchors flight when costing", /flight/i.test(line));

// ── T4: one opt-out, honored by both forms ──
const previous = process.env.RULE_MCP_NO_PROMPT_DIRECTIVE;
process.env.RULE_MCP_NO_PROMPT_DIRECTIVE = "1";
check("T4 the opt-out disables the directive", directiveEnabled() === false);
check("T4.1 disabled means empty, not partial", sessionDirective() === "" && promptDirective() === "");
if (previous === undefined) {
  delete process.env.RULE_MCP_NO_PROMPT_DIRECTIVE;
} else {
  process.env.RULE_MCP_NO_PROMPT_DIRECTIVE = previous;
}
check("T4.2 enabled by default", directiveEnabled() === true);

// ── T4b: flight can opt out alone without silencing the rest of the directive ──
import { FLIGHT_CONCEPT, flightEnabled, sessionFlight } from "../directive/_flight.js";
const previousFlight = process.env.RULE_MCP_NO_FLIGHT;
process.env.RULE_MCP_NO_FLIGHT = "1";
check("T4b NO_FLIGHT disables flight alone", flightEnabled() === false && sessionFlight() === "");
check("T4b.1 the rest of the directive still injects", /rule first/i.test(promptDirective()) && !/flight/i.test(promptDirective()));
check("T4b.2 SessionStart keeps the session rules without the flight block", sessionDirective().includes(NO_SUBAGENTS) && !sessionDirective().includes(FLIGHT_CONCEPT));
if (previousFlight === undefined) {
  delete process.env.RULE_MCP_NO_FLIGHT;
} else {
  process.env.RULE_MCP_NO_FLIGHT = previousFlight;
}
check("T4b.3 flight is on by default", flightEnabled() === true && sessionFlight().includes(FLIGHT_CONCEPT));

// ── T5: four hook events; PreToolUse carries bash + structure ──
const entries = hookEntries(LAUNCHER);
check("T5 PreToolUse has bash and structure", entries.PreToolUse.length === 2);
check("T5 PostToolUse reports writes", entries.PostToolUse.length === 1);
for (const event of ["SessionStart", "UserPromptSubmit"]) {
  check(`T5 ${event} entry exists`, Array.isArray(entries[event]) && entries[event].length === 1);
  check(`T5.1 ${event} is marked as ours`, entries[event][0].hooks[0].command.includes(HOOK_MARKER));
}
check("T5.2 PreToolUse still matches Bash first", entries.PreToolUse[0].matcher === "Bash");
check("T5.2b structural gate matches Write|Edit|MultiEdit", entries.PreToolUse[1].matcher === "Write|Edit|MultiEdit");
check(
  "T5.3 each event calls its own guard subcommand",
  entries.SessionStart[0].hooks[0].command.includes("guard session-start") &&
    entries.UserPromptSubmit[0].hooks[0].command.includes("guard prompt-submit") &&
    entries.PostToolUse[0].hooks[0].command.includes("guard write") &&
    entries.PreToolUse[1].hooks[0].command.includes("guard structure"),
);

// ── T6: the merge stays additive, idempotent and reversible across all events ──
const foreign = {
  model: "opus",
  hooks: {
    PreToolUse: [{ matcher: "Write", hooks: [{ type: "command", command: "prettier" }] }],
    SessionStart: [{ hooks: [{ type: "command", command: "load-context" }] }],
  },
};
const installed = withHooks(foreign, LAUNCHER);
check("T6 ours are installed on every event", hasHooks(installed) && EVENTS.every((event) => installed.hooks[event]?.some((e) => e.hooks[0].command.includes(HOOK_MARKER))));
check(
  "T6.1 foreign hooks survive on a shared event",
  installed.hooks.SessionStart.some((e) => e.hooks[0].command === "load-context") && installed.hooks.PreToolUse.some((e) => e.matcher === "Write"),
);
check("T6.2 unrelated settings survive", installed.model === "opus");
check(
  "T6.3 reinstall does not duplicate",
  EVENTS.every((event) => withHooks(installed, LAUNCHER).hooks[event].length === installed.hooks[event].length),
);
const removed = withoutHooks(installed);
check("T6.4 uninstall removes only ours", !hasHooks(removed) && removed.hooks.PreToolUse.length === 1 && removed.hooks.SessionStart.length === 1);
check("T6.5 empty containers are dropped", withoutHooks(withHooks({}, LAUNCHER)).hooks === undefined);

// ── T7: the CLI contract the harness actually invokes (cli/guard.js) ──
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../../../bin/rule-mcp.js", import.meta.url));
const run = (subcommand, input = "{}", env = {}) =>
  JSON.parse(
    execFileSync(process.execPath, [BIN, "guard", subcommand], {
      input,
      encoding: "utf8",
      env: { ...process.env, ...env },
    }),
  );
const start = run("session-start");
check("T7 session-start answers on its own event", start.hookSpecificOutput.hookEventName === "SessionStart");
check("T7.1 it injects the full directive", start.hookSpecificOutput.additionalContext.includes(NO_SUBAGENTS));
const submit = run("prompt-submit", JSON.stringify({ prompt: "add a button" }));
check("T7.2 prompt-submit answers on its own event", submit.hookSpecificOutput.hookEventName === "UserPromptSubmit");
check("T7.3 it injects the one-liner", submit.hookSpecificOutput.additionalContext === promptDirective());
check("T7.4 a malformed payload never blocks the prompt", run("prompt-submit", "not json").hookSpecificOutput.hookEventName === "UserPromptSubmit");
check("T7.5 the opt-out silences the hook", !run("prompt-submit", "{}", { RULE_MCP_NO_PROMPT_DIRECTIVE: "1" }).hookSpecificOutput.additionalContext);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
