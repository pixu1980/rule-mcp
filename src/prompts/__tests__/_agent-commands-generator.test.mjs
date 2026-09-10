

/**
 * @module test/agent-commands-generator
 *
 * Validates the registry-driven agent slash-command generator
 * (src/core/agents/commands/index.js):
 *   - canonical order: rule-mcp router pinned first, rest alphabetical
 *   - coverage: one command per MCP prompt + the router
 *   - render formats: args (md frontmatter), workflow (md heading), gemini (toml)
 *   - handoff command drives atomic scoped commits and never pushes
 *   - every command routes through rule and closes with a scoped commit
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { listPrompts } from "../index.js";
import { ROUTER_COMMAND, FORMAT_EXT, commandNames, listAgentCommands, renderAgentCommand, renderAgentCommandFiles } from "../../core/agents/commands/index.js";

console.log("agent-commands generator test");

const names = commandNames();
const promptNames = listPrompts().map((p) => p.name);

test("router is pinned first and the rest are alphabetical", () => {
  assert.equal(names[0], ROUTER_COMMAND, "rule-mcp must be first");
  const rest = names.slice(1);
  const sorted = [...rest].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(rest, sorted, "commands after the router must be locale-alphabetical");
});

test("coverage: one clean command per prompt, plus the router, no duplicates", () => {
  assert.equal(new Set(names).size, names.length, "command names must be unique");
  for (const p of promptNames) {
    assert.ok(names.includes(p), `missing command for prompt ${p}`);
  }
  // router + every prompt (router itself is never a prompt name)
  assert.ok(!promptNames.includes(ROUTER_COMMAND), "router must not also be a prompt");
  assert.equal(names.length, promptNames.length + 1, "exactly router + all prompts");
});

test("every command routes through rule and proposes a scoped commit", () => {
  for (const cmd of listAgentCommands()) {
    assert.ok(/rule/i.test(cmd.body), `${cmd.name}: body must route through rule`);
    assert.ok(/commit/i.test(cmd.body) && /scope/i.test(cmd.body), `${cmd.name}: body must propose a commit with scope`);
    assert.ok(cmd.description && cmd.description.length > 0, `${cmd.name}: description required`);
  }
});

test("args format renders frontmatter, safely quoted description, and $ARGUMENTS", () => {
  for (const cmd of listAgentCommands()) {
    const out = renderAgentCommand(cmd, "args");
    assert.ok(out.startsWith("---\n"), `${cmd.name}: args output must open with YAML frontmatter`);
    assert.match(out, /\ndescription: ".*"\n/, `${cmd.name}: description must be a quoted YAML scalar (colons are safe)`);
    assert.match(out, /\nargument-hint: ".*"\n/, `${cmd.name}: argument-hint required`);
    assert.ok(out.includes("$ARGUMENTS"), `${cmd.name}: args body must carry the $ARGUMENTS placeholder`);
  }
});

test("gemini format uses {{args}} and toml, never $ARGUMENTS", () => {
  const out = renderAgentCommand(listAgentCommands()[0], "gemini");
  assert.match(out, /^description = ".*"/m, "gemini needs a toml description");
  assert.match(out, /prompt = """/, "gemini needs a prompt block");
  assert.ok(out.includes("{{args}}"), "gemini must use {{args}}");
  assert.ok(!out.includes("$ARGUMENTS"), "gemini must not leak $ARGUMENTS");
});

test("workflow format uses a heading", () => {
  const cmd = listAgentCommands()[0];
  const out = renderAgentCommand(cmd, "workflow");
  assert.ok(out.startsWith(`# ${cmd.name}\n`), "workflow output must open with the command heading");
});

test("handoff command drives atomic scoped commits, a separate docs commit, and never pushes", () => {
  const handoff = listAgentCommands().find((c) => c.name === "rule-handoff");
  assert.ok(handoff, "rule-handoff command must exist");
  const body = handoff.body;
  assert.match(body, /pix_process_handoff/, "must run the handoff tool");
  assert.match(body, /atomic/i, "must describe atomic commits");
  assert.match(body, /docs\(handoff\)|docs\(adr\)/, "must make a separate docs commit");
  assert.match(body, /never push/i, "must never push");
  assert.match(body, /separate/i, "docs commit must be separate from the code commits");
});

test("handoff command persists the generated handoff and commits it on its own", () => {
  // A handoff that only ever exists in the chat is lost when the session ends -
  // the next session has to reconstruct it from git log and ADRs.
  const body = listAgentCommands().find((c) => c.name === "rule-handoff").body;
  assert.match(body, /docs\/handoff\//, "must say where the handoff file is written");
  assert.match(body, /chore\(handoff\)/, "must commit the written handoff under a chore(handoff) scope");
  assert.match(body, /next free|next available/i, "must state how the file number is chosen");
});

test("the MCP handoff prompt persists the handoff too", async () => {
  // Hosts that use the MCP prompt instead of the generated user command must get
  // the same instruction, or the behaviour depends on the client.
  const { getPrompt } = await import("../index.js");
  const text = getPrompt("rule-handoff", {})
    .messages.map((m) => m.content.text)
    .join("\n");
  assert.match(text, /docs\/handoff\//, "prompt must say where the handoff file is written");
  assert.match(text, /chore\(handoff\)/, "prompt must ask for the chore(handoff) commit");
});

test("renderAgentCommandFiles emits router-first files with the format extension", () => {
  for (const [format, ext] of Object.entries(FORMAT_EXT)) {
    const files = renderAgentCommandFiles(format);
    assert.equal(files[0].name, ROUTER_COMMAND, `${format}: router file must be first`);
    assert.equal(files[0].filename, `${ROUTER_COMMAND}${ext}`, `${format}: router filename`);
    assert.equal(files.length, names.length, `${format}: one file per command`);
    for (const f of files) {
      assert.ok(f.filename.endsWith(ext), `${format}: ${f.filename} must end with ${ext}`);
    }
  }
});

console.log(`\nagent-commands generator: all checks passed (${names.length} commands)`);
