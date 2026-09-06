/**
 * Regression: reinstalling must not drop per-server user keys from the pi
 * MCP config. Previously upsertJsonServer replaced the whole server entry,
 * silently wiping the user's `toolPrefix: "none"` - which is what made the
 * `/mcp__pix_galaxy_mcp__*` command prefixes come back after uninstall+install.
 *
 * Also asserts that fresh pi installs now default to `toolPrefix: "none"`,
 * i.e. bare `pix-tool-*` tools and `/pix-*` prompts instead of the
 * `mcp__pix_galaxy_mcp__*` form.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../..", import.meta.url).pathname;
const installModule = new URL("../../src/cli/install.js", import.meta.url).href;

const installForPi = (home, piDir) =>
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import { installAgent } from ${JSON.stringify(installModule)}; installAgent({ agent: "pi", entrypoint: "/tmp/pix-galaxy-mcp.js" });`,
    ],
    { cwd: root, env: { ...process.env, HOME: home, PI_CODING_AGENT_DIR: piDir } },
  );

// 1. Reinstall must preserve user-set toolPrefix and unrelated custom keys,
//    while still refreshing the managed connection fields.
const fakeHome = mkdtempSync(join(tmpdir(), "pix-galaxy-toolprefix-"));
const piDir = join(fakeHome, ".pi", "agent");
mkdirSync(piDir, { recursive: true });
const mcpConfig = join(piDir, "mcp.json");
writeFileSync(
  mcpConfig,
  JSON.stringify(
    {
      mcpServers: {
        "pix-galaxy-mcp": {
          command: "/old/bin/pix-galaxy-mcp",
          args: ["serve"],
          type: "stdio",
          toolPrefix: "none",
          idleTimeout: 42,
        },
      },
    },
    null,
    2,
  ) + "\n",
);

installForPi(fakeHome, piDir);

const entry = JSON.parse(readFileSync(mcpConfig, "utf8")).mcpServers["pix-galaxy-mcp"];
assert.ok(entry, "server entry must exist after reinstall");
assert.equal(entry.toolPrefix, "none", "reinstall must preserve user-set toolPrefix");
assert.equal(entry.idleTimeout, 42, "reinstall must preserve unrelated custom keys");
assert.equal(entry.directTools, true, "reinstall must refresh managed connection field");
assert.equal(entry.type, "stdio");
assert.ok(entry.args.includes("serve"), "reinstall must keep the serve command");

// 2. Fresh pi install defaults to toolPrefix "none" (clean /pix-* naming).
const fakeHome2 = mkdtempSync(join(tmpdir(), "pix-galaxy-fresh-"));
const piDir2 = join(fakeHome2, ".pi", "agent");
installForPi(fakeHome2, piDir2);

const fresh = JSON.parse(readFileSync(join(piDir2, "mcp.json"), "utf8")).mcpServers["pix-galaxy-mcp"];
assert.equal(fresh.toolPrefix, "none", "fresh pi install must default to toolPrefix none");
assert.equal(fresh.directTools, true);

// 3. Uninstall removes the whole entry (nothing left behind).
execFileSync(
  process.execPath,
  [
    "--input-type=module",
    "--eval",
    `import { uninstallAgent } from ${JSON.stringify(installModule)}; uninstallAgent({ agent: "pi" });`,
  ],
  { cwd: root, env: { ...process.env, HOME: fakeHome2, PI_CODING_AGENT_DIR: piDir2 } },
);
const afterUninstall = readFileSync(join(piDir2, "mcp.json"), "utf8").trim();
assert.ok(
  !afterUninstall || !JSON.parse(afterUninstall).mcpServers?.["pix-galaxy-mcp"],
  "uninstall must remove the pix-galaxy-mcp entry",
);

console.log("  ✅ pi reinstall preserves toolPrefix and defaults to clean /pix-* naming");
