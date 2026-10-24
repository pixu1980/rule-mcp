

/**
 * Regression: daemon installs must connect clients to the running local SSE
 * service, using a stable bearer token shared with that service.
 */
import { strict as assert } from "node:assert";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";

// Server code resolves `@src/*` through a hook (ADR 089); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

const fakeHome = mkdtempSync(join(tmpdir(), "rule-mcp-daemon-install-"));
const installModule = new URL("../index.js", import.meta.url).href;
const source = [`import { mcpServerConfig } from ${JSON.stringify(installModule)};`, 'console.log(JSON.stringify(mcpServerConfig("/tmp/rule-mcp.js", { mode: "daemon" })));'].join(
  " ",
);
const output = execFileSync(process.execPath, ["--import", ALIAS_HOOK, "--input-type=module", "--eval", source], {
  env: { ...process.env, HOME: fakeHome },
  encoding: "utf8",
});
const config = JSON.parse(output)["rule-mcp"];
const tokenFile = join(fakeHome, ".rule-mcp", "state", "sse-token");

assert.equal(config.command, undefined, "daemon config must not spawn a stdio process");
assert.equal(config.url, "http://127.0.0.1:37999/sse", "daemon config must target local SSE");
// directTools + lifecycle are pi.dev-only; not added for generic daemon config
assert.equal(config.lifecycle, undefined);
assert.equal(config.directTools, undefined);
assert.match(config.headers?.Authorization ?? "", /^Bearer [a-f0-9]{64}$/i, "daemon config must authenticate to SSE");
assert.ok(existsSync(tokenFile), "daemon token must be persisted for service restarts");
assert.equal(config.headers.Authorization, `Bearer ${readFileSync(tokenFile, "utf8").trim()}`, "client and daemon must share the same persisted token");
if (process.platform !== "win32") {
  assert.equal(statSync(tokenFile).mode & 0o777, 0o600, "daemon token file must be owner-readable only");
}

console.log("  ✅ daemon installer config uses authenticated local SSE");
