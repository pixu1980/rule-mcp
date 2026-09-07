import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../..", import.meta.url).pathname;
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert.ok(packageJson.files.includes("prompts/"), "Published package must include Pi prompt templates");

const fakeHome = mkdtempSync(join(tmpdir(), "rule-mcp-pi-"));
const piDir = join(fakeHome, ".pi", "agent");
const installModule = new URL("../../src/cli/install/index.js", import.meta.url).href;

execFileSync(
  process.execPath,
  ["--input-type=module", "--eval", `import { installAgent } from ${JSON.stringify(installModule)}; installAgent({ agent: "pi", entrypoint: "/tmp/rule-mcp.js" });`],
  { cwd: root, env: { ...process.env, HOME: fakeHome, PI_CODING_AGENT_DIR: piDir } },
);

const mcpConfig = join(piDir, "mcp.json");
const prompt = join(piDir, "prompts", "rule.md");
assert.ok(existsSync(mcpConfig), "Pi MCP config must be installed");
assert.ok(readFileSync(mcpConfig, "utf8").includes("rule-mcp"), "Pi MCP config must register server");
assert.ok(existsSync(prompt), "Pi slash-command prompt must be installed");
assert.ok(readFileSync(prompt, "utf8").includes("$ARGUMENTS"), "Installed Pi prompt must forward arguments");

console.log("  ✅ Pi MCP config and /rule-mcp prompt installed");
