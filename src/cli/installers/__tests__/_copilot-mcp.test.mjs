/** The Copilot CLI reads ~/.copilot/mcp-config.json, not the extension's hosts.json. */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-copilot-"));

process.env.HOME = home;

const { installCopilot } = await import("../_agents-cli.js");
const { uninstallCopilot } = await import("../_uninstall-clis.js");

test("the Copilot CLI config carries rule-mcp in mcpServers", () => {
  installCopilot({ entrypoint: "/opt/rule-mcp/bin/rule-mcp.js", global: false });

  const config = JSON.parse(readFileSync(join(home, ".copilot", "mcp-config.json"), "utf8"));

  assert.equal(typeof config.mcpServers["rule-mcp"].command, "string");
  assert.ok(config.mcpServers["rule-mcp"].command.length > 0, "the command resolves");
  assert.ok(config.mcpServers["rule-mcp"].args.includes("serve"), "the serve argument is present");
  assert.equal(config.mcpServers["rule-mcp"].type, "stdio");
});

test("uninstall removes the server from the CLI config", () => {
  installCopilot({ entrypoint: "/opt/rule-mcp/bin/rule-mcp.js", global: false });
  uninstallCopilot({ dryRun: false });

  const raw = readFileSync(join(home, ".copilot", "mcp-config.json"), "utf8").trim();
  const config = raw ? JSON.parse(raw) : {};

  assert.equal(config.mcpServers?.["rule-mcp"], undefined);
});
