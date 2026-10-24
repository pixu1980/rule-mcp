/**
 * rule_tool_process_adr through the router, and the auto-log hook beside it:
 * the English gate, the numbering, the index, and when auto-logging declines.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-adr-state-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { registerProcessAdrTool } = await import("../_register.js");
const { autoLog } = await import("../_auto-log.js");
const { callTool } = await import("../../router/index.js");

registerProcessAdrTool();

/** The single text body of a tool result. */
const text = (result) => result.content.map((part) => part.text).join("\n");

/** The ADR files a project directory holds, excluding the index. */
const adrs = (root) => readdirSync(join(root, "docs", "adr")).filter((name) => name !== "ADR.md");

test("an ADR written in another language is refused, with the offenses named", async () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-adr-"));

  try {
    const result = await callTool("rule_tool_process_adr", {
      title: "Usare PostgreSQL come database principale",
      context: "Il progetto ha bisogno di un database relazionale affidabile per i dati.",
      projectDir: root,
    });

    assert.equal(result.isError, true, "a non-English ADR is refused");
    assert.match(text(result), /written in English/i, "the refusal says why");
    assert.match(text(result), /- /, "and lists what offended");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an ADR is written, numbered, and added to the index", async () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-adr-"));

  try {
    const result = await callTool("rule_tool_process_adr", {
      title: "Use PostgreSQL as the primary database",
      context: "The project needs a relational database with strong transactional guarantees.",
      decision: "Adopt PostgreSQL 16 for every service that stores relational data.",
      consequences: "One database to operate, and one migration path to maintain.",
      alternatives: ["SQLite, rejected: no concurrent writers"],
      tags: ["database", "architecture"],
      projectDir: root,
    });

    assert.notEqual(result.isError, true, text(result));
    assert.match(text(result), /001 created/, "the first ADR is numbered 001");

    const [file] = adrs(root);
    assert.equal(file, "001-use-postgresql-as-the-primary-database.md", "the filename is the slugified title");

    const body = readFileSync(join(root, "docs", "adr", file), "utf8");
    assert.match(body, /^# 001: Use PostgreSQL as the primary database/, "the body opens with the numbered title");
    assert.match(body, /\*\*Status\*\*: accepted/, "the status defaults to accepted");
    assert.match(body, /SQLite, rejected/, "the alternatives are recorded");

    const index = readFileSync(join(root, "docs", "adr", "ADR.md"), "utf8");
    assert.match(index, /001/, "the index lists the new ADR");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the next ADR takes the next number", async () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-adr-"));

  try {
    await callTool("rule_tool_process_adr", { title: "Use PostgreSQL as the primary database", projectDir: root });
    const second = await callTool("rule_tool_process_adr", { title: "Serve the API over HTTP only", status: "proposed", projectDir: root });

    assert.match(text(second), /002 created/, "numbering continues from what is on disk");
    assert.match(text(second), /Status: proposed/, "the status the caller asked for is used");
    assert.equal(adrs(root).length, 2, "both ADRs are on disk");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("auto-logging declines every tool it was not asked to record", async () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-adr-auto-"));

  try {
    await autoLog("rule_tool_check", { projectDir: root });

    assert.throws(() => adrs(root), /ENOENT/, "an unlisted tool writes no ADR directory at all");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("auto-logging records a routed call as an informational entry", async () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-adr-auto-"));

  try {
    await autoLog(
      "rule_tool",
      { prompt: "build a react button", projectDir: root },
      { content: [{ type: "text", text: JSON.stringify({ route: "rule-frontend-react", confidence: 0.9 }) }] },
    );

    const [file] = adrs(root);
    assert.ok(file, "a routed call is recorded");

    const body = readFileSync(join(root, "docs", "adr", file), "utf8");
    assert.match(body, /Skill routing: build a react button/, "the title says what was routed");
    assert.match(body, /\*\*Author\*\*: rule-mcp/, "an auto entry is attributed to the server");
    assert.match(body, /None - informational entry\./, "and it claims no consequences");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("auto-logging is off when the environment turns it off", async () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-adr-auto-"));
  process.env.RULE_MCP_DISABLE_AUTO_ADR = "1";

  try {
    await autoLog("rule_tool", { prompt: "anything", projectDir: root });

    assert.throws(() => adrs(root), /ENOENT/, "the kill switch writes nothing");
  } finally {
    delete process.env.RULE_MCP_DISABLE_AUTO_ADR;
    rmSync(root, { recursive: true, force: true });
  }
});
