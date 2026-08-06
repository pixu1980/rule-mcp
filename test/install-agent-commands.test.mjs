/**
 * @module test/install-agent-commands
 *
 * Verifies explicit /rule-mcp command installation for supported agents.
 */

import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const sandbox = mkdtempSync(join(tmpdir(), "rule-agent-commands-"));
const home = join(sandbox, "home");
const project = join(sandbox, "project");
const installer = join(root, "scripts", "install-agent-commands.sh");

console.log("agent slash command installer test");

try {
  for (const path of [
    join(home, ".pi", "agent"),
    join(home, ".claude"),
    join(home, ".gemini"),
    join(home, ".config", "windsurf"),
    join(home, ".config", "cline"),
    join(project, ".cursor"),
    join(project, ".windsurf"),
    join(project, ".clinerules"),
  ]) {
    mkdirSync(path, { recursive: true });
  }

  const result = spawnSync("bash", [installer], {
    cwd: project,
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const commandFiles = [
    join(home, ".pi", "agent", "prompts", "rule-mcp.md"),
    join(home, ".claude", "commands", "rule-mcp.md"),
    join(home, ".gemini", "commands", "rule-mcp.toml"),
    join(home, ".codeium", "windsurf", "global_workflows", "rule-mcp.md"),
    join(home, ".cline", "data", "workflows", "rule-mcp.md"),
    join(project, ".cursor", "commands", "rule-mcp.md"),
    join(project, ".windsurf", "workflows", "rule-mcp.md"),
    join(project, ".clinerules", "workflows", "rule-mcp.md"),
  ];

  for (const file of commandFiles) {
    assert.ok(existsSync(file), `missing command file: ${file}`);
    const content = readFileSync(file, "utf8");
    assert.ok(content.includes("rule-mcp"), `${file} must name rule-mcp`);
    assert.ok(content.includes("rule"), `${file} must explicitly route through rule`);
  }

  const installScript = readFileSync(join(root, "scripts", "install.sh"), "utf8");
  assert.ok(installScript.includes("install-agent-commands.sh"), "install.sh must install explicit agent commands");
  assert.ok(
    installScript.includes("if [[ ${#COMMAND_ARGS[@]} -gt 0 ]]"),
    "install.sh must handle an empty command argument array on Bash 3",
  );

  console.log(`  ✅ ${commandFiles.length} explicit agent command integrations installed`);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}
