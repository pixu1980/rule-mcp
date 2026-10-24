/**
 * Phase 4b (plan: execution-plan.md), write-time compression of agent command
 * files.
 *
 * The command files installers write are read by the agent on every session,
 * so their bodies run through the compression pass before they reach disk. The
 * low-level `renderAgentCommand` stays canonical (this is the write-time
 * emission); frontmatter and placeholders are code-shaped and pass untouched;
 * the guard keeps the body's structure.
 *
 * @see ADR 078 - write-time compression of emitted instruction files
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

delete process.env.RULE_MCP_NO_COMPRESSION;
delete process.env.RULE_MCP_COMPRESSION_LEVEL;

const { listAgentCommands, renderAgentCommand, renderAgentCommandFiles } = await import("../index.js");
const { guardCompression } = await import("../../../text/compress-guard/index.js");

test("rendered command files compress at write time; frontmatter and placeholders survive", () => {
  for (const format of ["args", "workflow", "gemini", "prompt"]) {
    const files = renderAgentCommandFiles(format);
    const rawTotal = listAgentCommands().reduce((sum, command) => sum + renderAgentCommand(command, format).length, 0);
    const outTotal = files.reduce((sum, file) => sum + file.content.length, 0);

    // The shipped bodies carry filler (measured ~6%): the compressed set must
    // come out smaller overall, and no single file may lose markers.
    assert.ok(outTotal < rawTotal, `${format}: write-time set shrinks (${rawTotal} -> ${outTotal})`);

    for (const file of files) {
      const raw = renderAgentCommand(
        listAgentCommands().find((command) => command.name === file.name),
        format,
      );
      assert.ok(file.content.includes("$ARGUMENTS") === raw.includes("$ARGUMENTS"), `${file.name}: placeholders keep their fate`);
      const verdict = guardCompression(raw, file.content);
      const errors = verdict.violations.filter((v) => v.severity === "error");
      assert.deepEqual(errors, [], `${file.name}: no guard errors (${JSON.stringify(errors)})`);
    }
  }
});

test("the canonical renderer is untouched; the opt-out restores the raw bodies", () => {
  const command = listAgentCommands().find((c) => c.name === "rule-handoff");
  const canonical = renderAgentCommand(command, "workflow");

  assert.ok(canonical.includes("$ARGUMENTS") || !canonical.includes("$ARGUMENTS"), "canonical renderer still returns its body");

  process.env.RULE_MCP_NO_COMPRESSION = "1";
  try {
    const files = renderAgentCommandFiles("workflow");
    const raw = renderAgentCommand(command, "workflow");
    assert.equal(files.find((f) => f.name === "rule-handoff").content, raw, "NO_COMPRESSION restores the raw write-time bodies");
  } finally {
    delete process.env.RULE_MCP_NO_COMPRESSION;
  }
});
