

/** The budget and the substance: over 60% cheaper, and the opening contract keeps every rule. */
import { strict as assert } from "node:assert";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

import { BASELINE_TOKENS, ENFORCEMENT, SESSION_CALLS, runSession } from "./_diet.fixture.mjs";

// Server code resolves `@src/*` through a hook (ADR 079); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../scripts/alias-hook.mjs", import.meta.url));

test("a session pays less than 40 % of what the reminder used to cost", () => {
  const { overhead } = runSession(SESSION_CALLS);
  const reduction = (BASELINE_TOKENS - overhead) / BASELINE_TOKENS;
  assert.ok(reduction > 0.6, `reminder overhead must drop more than 60 % (was ${BASELINE_TOKENS}, now ${overhead}, ${Math.round(reduction * 100)} %)`);
});

test("the diet cuts repetition, not substance", () => {
  const script = String.raw`
    import { decorateWorkflowReminder } from ${JSON.stringify(ENFORCEMENT)};
    const decorated = decorateWorkflowReminder("pix_tool", { content: [{ type: "text", text: "routed" }] });
    process.stdout.write(decorated.content.map((part) => part.text).join("\n"));
  `;
  const full = execFileSync(process.execPath, ["--import", ALIAS_HOOK, "--input-type=module", "-e", script], {
    encoding: "utf8",
    env: { ...process.env, RULE_MCP_NO_AUTOUPDATE: "1" },
  });

  for (const rule of [
    /source of truth/i,
    /missing evidence means unknown/i,
    /minimal change/i,
    /rule_tool_process_adr/,
    /without being asked/i,
    /never spawn subagents/i,
    /rule_tool_check/,
    /every token saved is a token earned/i,
  ]) {
    assert.match(full, rule, `the opening contract must still carry ${rule}`);
  }
});
