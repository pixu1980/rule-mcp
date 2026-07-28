/**
 * @module test/install-agent-commands
 *
 * Verifies explicit /pix-galaxy-mcp command installation for supported agents.
 */

import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const sandbox = mkdtempSync(join(tmpdir(), "pix-agent-commands-"));
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
    join(home, ".pi", "agent", "prompts", "pix-galaxy-mcp.md"),
    join(home, ".claude", "commands", "pix-galaxy-mcp.md"),
    join(home, ".gemini", "commands", "pix-galaxy-mcp.toml"),
    join(home, ".codeium", "windsurf", "global_workflows", "pix-galaxy-mcp.md"),
    join(home, ".cline", "data", "workflows", "pix-galaxy-mcp.md"),
    join(project, ".cursor", "commands", "pix-galaxy-mcp.md"),
    join(project, ".windsurf", "workflows", "pix-galaxy-mcp.md"),
    join(project, ".clinerules", "workflows", "pix-galaxy-mcp.md"),
  ];

  for (const file of commandFiles) {
    assert(existsSync(file), `missing command file: ${file}`);
    const content = readFileSync(file, "utf8");
    assert(content.includes("pix-galaxy-mcp"), `${file} must name pix-galaxy-mcp`);
    assert(content.includes("pix"), `${file} must explicitly route through pix`);
  }

  const installScript = readFileSync(join(root, "scripts", "install.sh"), "utf8");
  assert(installScript.includes("install-agent-commands.sh"), "install.sh must install explicit agent commands");
  assert(
    installScript.includes('if [[ ${#COMMAND_ARGS[@]} -gt 0 ]]'),
    "install.sh must handle an empty command argument array on Bash 3",
  );

  console.log(`  ✅ ${commandFiles.length} explicit agent command integrations installed`);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}
