

/** Rendering: MCP-prompt suppression, the .prompt.md format, and placeholder hygiene. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { FORMAT_EXT, listAgentCommands, renderAgentCommand, renderAgentCommandFiles, suppressesMcpPrompts } from "./_targets.fixture.mjs";

console.log("agent command targets test: rendering");

test("hosts that namespace MCP prompts have them suppressed", () => {
  assert.equal(suppressesMcpPrompts("claude"), true, "Claude shows /rule-mcp:* - suppress");
  assert.equal(suppressesMcpPrompts("vscode"), true, "VS Code shows /mcp.rule-mcp.* - suppress");
  assert.equal(suppressesMcpPrompts("pi"), false, "Pi already exposes bare /rule-* prompts");
  assert.equal(suppressesMcpPrompts("jetbrains"), false, "no clean files installed - keep the MCP prompts");
});

test("the prompt format renders .prompt.md with frontmatter and no $ARGUMENTS", () => {
  assert.equal(FORMAT_EXT.prompt, ".prompt.md", "VS Code prompt files use the .prompt.md suffix");
  const files = renderAgentCommandFiles("prompt");
  assert.ok(
    files.every((f) => f.filename.endsWith(".prompt.md")),
    "every rendered file uses the prompt-file suffix",
  );
  for (const command of listAgentCommands()) {
    const out = renderAgentCommand(command, "prompt");
    assert.ok(out.startsWith("---\n"), `${command.name}: prompt files open with frontmatter`);
    assert.match(out, /\ndescription: ".*"\n/, `${command.name}: description is a quoted scalar`);
    assert.match(out, /\nargument-hint: ".*"\n/, `${command.name}: argument-hint drives the chat input hint`);
    assert.ok(!out.includes("$ARGUMENTS"), `${command.name}: VS Code does not substitute $ARGUMENTS`);
    assert.match(out, /request/i, `${command.name}: the body must still say what the request is`);
  }
});

test("formats without argument substitution never leak a placeholder", () => {
  for (const format of ["prompt", "plain", "workflow"]) {
    for (const command of listAgentCommands()) {
      const out = renderAgentCommand(command, format);
      assert.ok(!out.includes("$ARGUMENTS"), `${format}/${command.name}: no $ARGUMENTS leak`);
      assert.ok(!out.includes("{{args}}"), `${format}/${command.name}: no {{args}} leak`);
    }
  }
});

console.log("\nagent command targets: all checks passed");
