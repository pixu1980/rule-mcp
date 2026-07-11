import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert(packageJson.files.includes("prompts/"), "Published package must include Pi prompt templates");

const fakeHome = mkdtempSync(join(tmpdir(), "pix-galaxy-pi-"));
const piDir = join(fakeHome, ".pi", "agent");
const installModule = new URL("../src/cli/install.js", import.meta.url).href;

execFileSync(
  process.execPath,
  [
    "--input-type=module",
    "--eval",
    `import { installAgent } from ${JSON.stringify(installModule)}; installAgent({ agent: "pi", entrypoint: "/tmp/pix-galaxy-mcp.js" });`,
  ],
  { cwd: root, env: { ...process.env, HOME: fakeHome, PI_CODING_AGENT_DIR: piDir } },
);

const mcpConfig = join(piDir, "mcp.json");
const prompt = join(piDir, "prompts", "pix-galaxy-mcp.md");
assert(existsSync(mcpConfig), "Pi MCP config must be installed");
assert(readFileSync(mcpConfig, "utf8").includes("pix_galaxy_mcp"), "Pi MCP config must register server");
assert(existsSync(prompt), "Pi slash-command prompt must be installed");
assert(readFileSync(prompt, "utf8").includes("$ARGUMENTS"), "Installed Pi prompt must forward arguments");

console.log("  ✅ Pi MCP config and /pix-galaxy-mcp prompt installed");
