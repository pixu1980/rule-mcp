/**
 * A flag the narrow install cannot honor says so.
 *
 * `install` without a wizard writes the mcp.json entry and the router command
 * file; the instruction files, the slash commands, the skills, the service and
 * the health check belong to the wizard's plan (ADR 090). Dropping a flag that
 * asks for one of those in silence is the failure the commands step exists to
 * remove - a question asked, answered, and ignored.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { warnWizardOnly } from "../_register-setup.js";

/** Collect what the warning said, instead of writing it to stderr. */
const said = (options) => {
  const lines = [];

  return { flags: warnWizardOnly(options, (text) => lines.push(text)), lines };
};

test("a plan-only flag is named, and the command that honors it is too", () => {
  const { flags, lines } = said({ commandsPreset: "minimal", agent: "claude" });

  assert.deepEqual(flags, ["--commands-preset"]);
  assert.match(lines[0], /rule-mcp setup/);
});

test("an install that asks for nothing extra is not warned at", () => {
  assert.deepEqual(said({ agent: "claude", mode: "stdio", dryRun: true }).lines, []);
});

test("a negation is honored by a path that does none of it", () => {
  assert.deepEqual(said({ rules: false, commands: false, doctor: false }).flags, []);
});

test("every plan step is covered, not just the selection", () => {
  const { flags } = said({ rules: true, commands: true, hooks: true, skills: true, service: true, doctor: true });

  assert.deepEqual(flags, ["--rules", "--commands", "--hooks", "--skills", "--service", "--doctor"]);
});
