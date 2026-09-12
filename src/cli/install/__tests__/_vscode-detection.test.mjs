/** Regression: installed-agent detection must look at VS Code's global config. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Server code resolves `@src/*` through a hook (ADR 079); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

const fakeHome = mkdtempSync(join(tmpdir(), "rule-vscode-detection-"));
const fakeProject = join(fakeHome, "project");
mkdirSync(fakeProject, { recursive: true });
const installModule = new URL("../index.js", import.meta.url).href;
const output = execFileSync(
  process.execPath,
  [
    "--import",
    ALIAS_HOOK,
    "--input-type=module",
    "--eval",
    [
      `import { installAgent, detectInstalledAgents } from ${JSON.stringify(installModule)};`,
      'installAgent({ agent: "vscode", entrypoint: "/tmp/rule-mcp.js" });',
      'console.log(JSON.stringify(detectInstalledAgents().find(({ name }) => name === "vscode")));',
    ].join(" "),
  ],
  { cwd: fakeProject, env: { ...process.env, HOME: fakeHome }, encoding: "utf8" },
);
const result = JSON.parse(output);

assert.equal(result.configured, true);
assert.match(result.configFile, /Code\/User\/mcp\.json$/);

console.log("  ✅ VS Code detection uses user-global mcp.json");
