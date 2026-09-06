/** Regression: global VS Code uninstall must not create a workspace config. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fakeHome = mkdtempSync(join(tmpdir(), "rule-vscode-uninstall-"));
const fakeProject = join(fakeHome, "project");
const globalFile =
  process.platform === "darwin"
    ? join(fakeHome, "Library", "Application Support", "Code", "User", "mcp.json")
    : join(fakeHome, ".config", "Code", "User", "mcp.json");
mkdirSync(fakeProject, { recursive: true });
mkdirSync(join(globalFile, ".."), { recursive: true });
writeFileSync(
  globalFile,
  JSON.stringify(
    {
      servers: {
        "rule-mcp": { type: "http", url: "http://127.0.0.1:37999/sse" },
        other: { type: "stdio", command: "other" },
      },
    },
    null,
    2,
  ),
);

const installModule = new URL("../../src/cli/install/index.js", import.meta.url).href;
execFileSync(
  process.execPath,
  [
    "--input-type=module",
    "--eval",
    `import { uninstallAgent } from ${JSON.stringify(installModule)}; uninstallAgent({ agent: "vscode" });`,
  ],
  { cwd: fakeProject, env: { ...process.env, HOME: fakeHome } },
);

assert.equal(existsSync(join(fakeProject, ".vscode", "mcp.json")), false, "must not create workspace mcp.json");
const config = JSON.parse(readFileSync(globalFile, "utf8"));
assert.equal(config.servers["rule-mcp"], undefined);
assert.equal(config.servers.other.command, "other");

console.log("  ✅ VS Code uninstall changes only existing global config");
