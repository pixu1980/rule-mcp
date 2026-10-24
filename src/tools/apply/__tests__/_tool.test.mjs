/**
 * rule_tool_apply end to end through the router: the receipt gate, the root
 * gate, the path gate, the dry run and the write.
 *
 * The containment primitives are pinned in `./_containment.test.mjs`; this
 * covers the tool that calls them, in the order it calls them.
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-apply-state-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { registerApplyTool } = await import("../_tool.js");
const { issueFilesReceipt } = await import("../../gateway/index.js");
const { callTool } = await import("../../router/index.js");

await registerApplyTool();

/** A scratch directory that reads as a project root. */
function project() {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-apply-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "probe" }));
  mkdirSync(join(root, "src"), { recursive: true });

  return root;
}

/** The single text body of a tool result. */
const text = (result) => result.content.map((part) => part.text).join("\n");

/** A receipt that authorizes writing exactly these files. */
const receiptFor = (files) => issueFilesReceipt(files, "rule-mcp-styleguide-javascript", true);

test("a project root that is not one is rejected before anything else", async () => {
  const files = [{ path: "src/_Probe.js", content: "export const probe = 1;\n" }];
  const result = await callTool("rule_tool_apply", { files, receipt: receiptFor(files), path: "/", dryRun: false });

  assert.equal(result.isError, true, "the filesystem root is not a project");
  assert.match(text(result), /root REJECTED/i, "the refusal names the gate that fired");
  assert.equal(result._meta.ruleApply.filesWritten, 0, "nothing is written when the root is refused");
});

test("a receipt that does not cover the files is rejected", async () => {
  const root = project();
  const files = [{ path: "src/_Probe.js", content: "export const probe = 1;\n" }];

  try {
    const missing = await callTool("rule_tool_apply", { files, receipt: "not-a-receipt", path: root, dryRun: false });
    assert.equal(missing.isError, true, "an invented receipt is refused");
    assert.match(text(missing), /Receipt validation FAILED/i);
    assert.equal(missing._meta.ruleApply.receiptValid, false);

    const tampered = [{ path: "src/_Probe.js", content: "export const probe = 2;\n" }];
    const stale = await callTool("rule_tool_apply", { files: tampered, receipt: receiptFor(files), path: root, dryRun: false });
    assert.equal(stale.isError, true, "a receipt does not cover content edited after it was issued");
    assert.equal(existsSync(join(root, "src", "_Probe.js")), false, "and nothing reaches disk");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a path that escapes the project is rejected after the receipt passes", async () => {
  const root = project();
  const files = [{ path: "../outside.js", content: "export const probe = 1;\n" }];

  try {
    const result = await callTool("rule_tool_apply", { files, receipt: receiptFor(files), path: root, dryRun: false });

    assert.equal(result.isError, true, "an escaping path is refused");
    assert.match(text(result), /Path validation FAILED/i);
    assert.equal(result._meta.ruleApply.receiptValid, true, "the receipt was valid; the destination was not");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a dry run reports every file and writes none", async () => {
  const root = project();
  const files = [
    { path: "src/_One.js", content: "export const one = 1;\n" },
    { path: "src/_Two.js", content: "export const two = 2;\n" },
  ];

  try {
    const result = await callTool("rule_tool_apply", { files, receipt: receiptFor(files), path: root, dryRun: true });

    assert.notEqual(result.isError, true, text(result));
    assert.match(text(result), /dry.run/i, "the result says it was a preview");
    assert.equal(existsSync(join(root, "src", "_One.js")), false, "no file is written");
    assert.equal(existsSync(join(root, "src", "_Two.js")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("dryRun defaults to true, so a caller never writes by omission", async () => {
  const root = project();
  const files = [{ path: "src/_Probe.js", content: "export const probe = 1;\n" }];

  try {
    await callTool("rule_tool_apply", { files, receipt: receiptFor(files), path: root });

    assert.equal(existsSync(join(root, "src", "_Probe.js")), false, "omitting dryRun must not write");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a real run writes the files, creating the directories they need", async () => {
  const root = project();
  const files = [
    { path: "src/_Probe.js", content: "export const probe = 1;\n" },
    { path: "src/deep/nested/_Leaf.js", content: "export const leaf = 2;\n" },
  ];

  try {
    const result = await callTool("rule_tool_apply", { files, receipt: receiptFor(files), path: root, dryRun: false });

    assert.notEqual(result.isError, true, text(result));
    assert.match(readFileSync(join(root, "src", "_Probe.js"), "utf8"), /export const probe/, "the content lands");
    assert.ok(existsSync(join(root, "src", "deep", "nested", "_Leaf.js")), "a nested destination gets its directories");
    assert.match(text(result), /_Probe\.js/, "and the result lists what it wrote");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
