/** Regression: doctor validates VS Code's `servers` schema, not mcpServers. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Server code resolves `@src/*` through a hook (ADR 089); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

const fakeHome = mkdtempSync(join(tmpdir(), "rule-mcp-doctor-vscode-"));
const fakeProject = join(fakeHome, "project");
mkdirSync(fakeProject, { recursive: true });
const installModule = new URL("../index.js", import.meta.url).href;
const doctorModule = new URL("../../doctor/index.js", import.meta.url).href;
const output = execFileSync(
  process.execPath,
  [
    "--import",
    ALIAS_HOOK,
    "--input-type=module",
    "--eval",
    [
      `import { installAgent } from ${JSON.stringify(installModule)};`,
      `import { runDoctor } from ${JSON.stringify(doctorModule)};`,
      'installAgent({ agent: "vscode", entrypoint: "/tmp/rule.js", mode: "daemon" });',
      'runDoctor().then((r) => console.log(JSON.stringify(r.agents.find(({ name }) => name === "vscode"))));',
    ].join(" "),
  ],
  { cwd: fakeProject, env: { ...process.env, HOME: fakeHome }, encoding: "utf8" },
);
const vscode = JSON.parse(output);

assert.equal(vscode.configured, true);
assert.equal(vscode.validated, true);
assert.equal(vscode.url, "http://127.0.0.1:37999/sse");

console.log("  ✅ doctor validates global VS Code HTTP configuration");
