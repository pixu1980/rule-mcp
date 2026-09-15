

/**
 * Regression: VS Code installs are user-global by default. Daemon installs
 * must use VS Code's HTTP MCP schema and migrate only this server's earlier
 * mcpServers entry without creating a workspace .vscode/mcp.json.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Server code resolves `@src/*` through a hook (ADR 079); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

const fakeHome = mkdtempSync(join(tmpdir(), "rule-vscode-install-"));
const fakeProject = join(fakeHome, "project");
const globalFile =
  process.platform === "darwin" ? join(fakeHome, "Library", "Application Support", "Code", "User", "mcp.json") : join(fakeHome, ".config", "Code", "User", "mcp.json");
mkdirSync(join(fakeProject, ".vscode"), { recursive: true });
mkdirSync(join(globalFile, ".."), { recursive: true });
writeFileSync(
  join(fakeProject, ".vscode", "mcp.json"),
  JSON.stringify(
    {
      servers: { "other-workspace-server": { type: "stdio", command: "other" } },
    },
    null,
    2,
  ),
);
writeFileSync(
  globalFile,
  JSON.stringify(
    {
      servers: { "other-global-server": { type: "stdio", command: "other" } },
      mcpServers: { other_server: { command: "keep-me" } },
    },
    null,
    2,
  ),
);

const installModule = new URL("../index.js", import.meta.url).href;
execFileSync(
  process.execPath,
  [
    "--import",
    ALIAS_HOOK,
    "--input-type=module",
    "--eval",
    `import { installAgent } from ${JSON.stringify(installModule)}; installAgent({ agent: "vscode", entrypoint: "/tmp/rule-mcp.js", mode: "daemon" });`,
  ],
  { cwd: fakeProject, env: { ...process.env, HOME: fakeHome } },
);

const globalConfig = JSON.parse(readFileSync(globalFile, "utf8"));
const globalServer = globalConfig.servers["rule-mcp"];
// The daemon serves the HTTP+SSE transport at /sse, so the declared
// client type must be "sse" (VS Code's "http" type speaks Streamable HTTP and
// would POST to /sse, which the SSE transport does not accept).
assert.equal(globalServer.type, "sse");
assert.equal(globalServer.url, "http://127.0.0.1:37999/sse");
assert.match(globalServer.headers?.Authorization ?? "", /^Bearer [a-f0-9]{64}$/i);
assert.equal(globalConfig.servers["other-global-server"].command, "other", "must preserve other global servers");
assert.equal(globalConfig.mcpServers?.other_server.command, "keep-me", "must preserve other mcpServers entries");

const workspaceConfig = JSON.parse(readFileSync(join(fakeProject, ".vscode", "mcp.json"), "utf8"));
assert.equal(workspaceConfig.servers["rule-mcp"], undefined, "must not create a workspace rule server");
assert.equal(workspaceConfig.servers["other-workspace-server"].command, "other", "must preserve workspace config");
assert.ok(existsSync(globalFile), "must write the user-global VS Code config");

console.log("  ✅ VS Code daemon install targets global HTTP config only");
