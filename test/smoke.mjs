/**
 * @module test/smoke
 *
 * Smoke test for rule-mcp.
 * Verifies that:
 * - The bin entry point exists
 * - package.json has correct structure
 * - All src files are present and non-empty (using SDK-based layout)
 * - SDK and Zod dependencies are importable
 */

import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Hermetic: exercise tool wiring, not the result cache.
process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1"; // hermetic: no real git ops in tests

console.log("rule-mcp smoke test");

let failures = 0;

// 1. Check bin entry point
const bin = join(root, "bin", "rule-mcp.js");
assert(existsSync(bin), `bin entry point missing: ${bin}`);
console.log("  ✅ bin/rule-mcp.js exists");

// 2. Check package.json
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert(pkg.name === "rule-mcp", `Wrong package name: ${pkg.name}`);
assert(pkg.bin["rule-mcp"], "Missing bin entry");
assert(pkg.dependencies["@modelcontextprotocol/sdk"], "Missing @modelcontextprotocol/sdk dependency");
assert(pkg.dependencies["zod"], "Missing zod dependency");
console.log("  ✅ package.json valid with SDK + Zod deps");

// 3. Check src files (SDK-based layout — no mcp/ directory)
const srcFiles = [
  "server.js",
  "index.js",
  "tools/router.js",
  "tools/skill.js",
  "tools/architect.js",
  "core/skills.js",
  "core/templates.js",
  "core/guardrails.js",
  "resources/index.js",
  "prompts/index.js",
  "cli/paths.js",
  "cli/install.js",
  "cli/commands.js",
  "cli/doctor.js",
  "cli/uninstall.js",
];
for (const f of srcFiles) {
  const p = join(root, "src", f);
  assert(existsSync(p), `Missing src/${f}`);
  const src = readFileSync(p, "utf8");
  assert(src.length > 50, `src/${f} too short`);
  assert(src.includes("/**"), `src/${f} missing JSDoc`);
}
console.log("  ✅ All src files present with JSDoc");

// 4. Check SDK is importable
try {
  await import("@modelcontextprotocol/sdk/server/index.js");
  console.log("  ✅ @modelcontextprotocol/sdk importable");
} catch (e) {
  console.log("  ❌ @modelcontextprotocol/sdk import failed:", e.message);
  failures++;
}

// 5. Check Zod is importable
try {
  await import("zod/v4");
  console.log("  ✅ zod importable");
} catch (e) {
  console.log("  ❌ zod import failed:", e.message);
  failures++;
}

// 6. Check server exports
try {
  const server = await import("../src/server.js");
  assert(typeof server.startServer === "function", "startServer not exported");
  assert(typeof server.stopServer === "function", "stopServer not exported");
  console.log("  ✅ src/server.js exports startServer + stopServer");
} catch (e) {
  console.log("  ❌ src/server.js export check failed:", e.message);
  failures++;
}

// 7. Check tool router exports
try {
  const router = await import("../src/tools/router.js");
  assert(typeof router.registerTool === "function", "registerTool not exported");
  assert(typeof router.listTools === "function", "listTools not exported");
  assert(typeof router.callTool === "function", "callTool not exported");
  console.log("  ✅ src/tools/router.js exports registerTool, listTools, callTool");
} catch (e) {
  console.log("  ❌ src/tools/router.js export check failed:", e.message);
  failures++;
}

if (failures > 0) {
  console.log(`\n❌ ${failures} failure(s) — see above`);
  process.exit(1);
} else {
  console.log("\n  ✅ All checks passed");
}
