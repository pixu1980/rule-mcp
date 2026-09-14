/**
 * @module test/install-agent-commands
 *
 * Verifies explicit /rule-mcp command installation for supported agents.
 */

import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../../..");
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
    env: { ...process.env, HOME: home, PNPM_HOME: join(home, ".pnpm") },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const commandFiles = [
    join(home, ".pi", "agent", "prompts", "rule.md"),
    join(home, ".claude", "commands", "rule.md"),
    join(home, ".gemini", "commands", "rule.toml"),
    join(home, ".codeium", "windsurf", "global_workflows", "rule.md"),
    join(home, ".cline", "data", "workflows", "rule.md"),
    join(project, ".cursor", "commands", "rule.md"),
    join(project, ".windsurf", "workflows", "rule.md"),
    join(project, ".clinerules", "workflows", "rule.md"),
  ];

  for (const file of commandFiles) {
    assert.ok(existsSync(file), `missing command file: ${file}`);
    const content = readFileSync(file, "utf8");
    assert.ok(content.includes("rule"), `${file} must route through rule`);
  }

  // The full registry set lands, not just the router: an area command, a
  // one-shot and a persona command.
  const piPrompts = join(home, ".pi", "agent", "prompts");
  for (const expected of ["rule-area-frontend.md", "rule-process-check.md", "rule-plan-security.md"]) {
    assert.ok(existsSync(join(piPrompts, expected)), `missing registry command: ${expected}`);
  }

  // Renamed/deleted commands never surface: the installer is registry-driven.
  const stale = [
    "rule-mcp.md",
    "rule-tdd.md",
    "rule-check.md",
    "rule-caveman.md",
    "rule-new-feature.md",
    "rule-a11y-audit.md",
    "rule-code-review.md",
    "rule-pull-request.md",
    "rule-setup-project.md",
    "rule-write-tests.md",
  ];
  for (const name of stale) {
    assert.ok(!existsSync(join(piPrompts, name)), `stale command must not be installed: ${name}`);
  }

  console.log(`  ✅ ${commandFiles.length} explicit agent command integrations installed`);

  // The bootstrap writes the same files through the wizard's plan, narrowed to
  // what the commands step chose: install.sh forwards to `setup`, the plan
  // spawns `agent-commands --sync`, and the preset reaches it as flags (ADR
  // 080). A chain that drops the selection writes 152 files per directory.
  const chainHome = join(sandbox, "chain");
  mkdirSync(join(chainHome, ".claude"), { recursive: true });

  const chain = spawnSync(
    "bash",
    [join(root, "scripts", "install.sh"), "--agent", "claude", "--no-wizard", "--no-rules", "--no-doctor", "--commands", "--commands-preset", "minimal"],
    {
      cwd: root,
      env: {
        ...process.env,
        HOME: chainHome,
        PNPM_HOME: join(chainHome, ".pnpm"),
        RULE_MCP_SKIP_GLOBAL_LINK: "1",
      },
      encoding: "utf8",
      timeout: 120_000,
    },
  );

  assert.equal(chain.status, 0, chain.stderr || chain.stdout);

  const written = readdirSync(join(chainHome, ".claude", "commands"));

  assert.ok(written.includes("rule.md"), "the router command is not optional");
  assert.ok(written.includes("rule-area-frontend.md"), "minimal keeps the area hubs");
  assert.ok(!written.includes("rule-area-frontend-react.md"), `minimal writes no command per skill: ${written.length} files`);

  console.log(`  ✅ install.sh --commands-preset minimal wrote ${written.length} command files`);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}
