/**
 * Regression: remote mode must never silently fall back to stdio for an agent
 * whose HTTP/SSE configuration schema has not been verified.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Server code resolves `@src/*` through a hook (ADR 079); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

const fakeHome = mkdtempSync(join(tmpdir(), "rule-mcp--capability-"));
const installModule = new URL("../index.js", import.meta.url).href;
const output = execFileSync(
  process.execPath,
  [
    "--import",
    ALIAS_HOOK,
    "--input-type=module",
    "--eval",
    `import { installAgent } from ${JSON.stringify(installModule)}; console.log(JSON.stringify(installAgent({ agent: "claude", entrypoint: "/tmp/rule-mcp.js", mode: "daemon" })));`,
  ],
  { env: { ...process.env, HOME: fakeHome }, encoding: "utf8" },
);
const result = JSON.parse(output);

assert.equal(result.ok, false, "unsupported remote install must report failure");
assert.match(result.installed.claude.error, /daemon.*Pi.*VS Code/i);
assert.equal(existsSync(join(fakeHome, ".claude.json")), false, "must not write a misleading stdio config");

console.log("  ✅ unsupported remote agents fail instead of silently using stdio");
