import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Server code resolves `@src/*` through a hook (ADR 089); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

// eslint-disable-next-line no-unused-vars
const root = new URL("../../../..", import.meta.url).pathname;
const fakeHome = mkdtempSync(join(tmpdir(), "rule-mcp-agent-commands-"));
const fakeProject = join(fakeHome, "project");
const piDir = join(fakeHome, ".pi", "agent");
const installModule = new URL("../index.js", import.meta.url).href;
mkdirSync(fakeProject, { recursive: true });

execFileSync(
  process.execPath,
  [
    "--import",
    ALIAS_HOOK,
    "--input-type=module",
    "--eval",
    `import { installAgent } from ${JSON.stringify(installModule)}; for (const agent of ["pi", "claude", "gemini", "cursor", "copilot"]) installAgent({ agent, entrypoint: "/tmp/rule.js" });`,
  ],
  { cwd: fakeProject, env: { ...process.env, HOME: fakeHome, PI_CODING_AGENT_DIR: piDir } },
);

const expectations = [
  [join(piDir, "prompts", "rule.md"), "$ARGUMENTS", "Pi slash command"],
  [join(fakeHome, ".claude", "commands", "rule.md"), "$ARGUMENTS", "Claude command"],
  [join(fakeHome, ".gemini", "commands", "rule.toml"), "{{args}}", "Gemini custom command"],
  [join(fakeProject, ".cursor", "commands", "rule.md"), "$ARGUMENTS", "Cursor project command"],
  [join(fakeHome, ".copilot", "agents", "rule-mcp.agent.md"), "rule-mcp", "Copilot custom agent"],
];

for (const [file, marker, label] of expectations) {
  assert.ok(existsSync(file), `${label} must be installed at ${file}`);
  assert.ok(readFileSync(file, "utf8").includes(marker), `${label} must preserve argument/routing marker`);
}

execFileSync(
  process.execPath,
  [
    "--import",
    ALIAS_HOOK,
    "--input-type=module",
    "--eval",
    `import { uninstallAgent } from ${JSON.stringify(installModule)}; for (const agent of ["pi", "claude", "gemini", "cursor", "copilot"]) uninstallAgent({ agent });`,
  ],
  { cwd: fakeProject, env: { ...process.env, HOME: fakeHome, PI_CODING_AGENT_DIR: piDir } },
);
for (const [file, , label] of expectations) {
  assert.ok(!existsSync(file), `${label} must be removed during uninstall`);
}

console.log("  ✅ reusable rule-mcp command install/uninstall works for Pi, Claude, Gemini, Cursor, and Copilot");
