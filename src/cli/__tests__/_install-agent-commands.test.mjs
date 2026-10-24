

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
const sandbox = mkdtempSync(join(tmpdir(), "rule-mcp-agent-commands-"));
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
    assert.ok(content.includes("rule-mcp"), `${file} must route through rule-mcp`);
  }

  // The full registry set lands, not just the router: an area command, a
  // one-shot, rule-mcp-check, and a persona command. ADR 116: no area *-check siblings.
  const piPrompts = join(home, ".pi", "agent", "prompts");
  for (const expected of ["rule-mcp-area-frontend.md", "rule-mcp-check.md", "rule-mcp-persona-security.md", "rule-mcp-handoff.md"]) {
    assert.ok(existsSync(join(piPrompts, expected)), `missing registry command: ${expected}`);
  }
  assert.ok(!existsSync(join(piPrompts, "rule-mcp-area-frontend-check.md")), "area check siblings are not installed");

  // Renamed/deleted commands never surface: the installer is registry-driven.
  const legacyRouter = ["p", "i", "x", ".md"].join("");
  const stale = [
    legacyRouter,
    "rule-mcp-tdd.md",
    "rule-mcp-compression.md",
    "rule-mcp-process-compression.md",
    "rule-mcp-flight.md",
    "rule-mcp-process-flight.md",
    "rule-mcp-area-process-handoff.md",
    "rule-mcp-area-process-handoff-check.md",
    "rule-mcp-area-process-compression.md",
    "rule-mcp-area-process-compression-check.md",
    "rule-mcp-area-process-flight.md",
    "rule-mcp-adr.md",
    "rule-mcp-process-check.md",
    "rule-mcp-area-frontend-check.md",
    "rule-mcp-area-frontend-react.md",
    "rule-mcp-area-toolchain-rspack.md",
    "rule-mcp-audit-security.md",
    "rule-mcp-plan-security.md",
    "rule-mcp-review-security.md",
    "rule-mcp-new-feature.md",
    "rule-mcp-a11y-audit.md",
    "rule-mcp-code-review.md",
    "rule-mcp-pull-request.md",
    "rule-mcp-setup-project.md",
    "rule-mcp-write-tests.md",
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

  assert.ok(written.includes("rule-mcp.md"), "the router command is not optional");
  assert.ok(written.includes("rule-mcp-area-frontend.md"), "minimal keeps the area hubs");
  assert.ok(!written.includes("rule-mcp-area-frontend-react.md"), `minimal writes no command per skill: ${written.length} files`);

  console.log(`  ✅ install.sh --commands-preset minimal wrote ${written.length} command files`);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}
