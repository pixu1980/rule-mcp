

/** Docker mode contract: the client config and container share one SSE token. */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const compose = readFileSync("docker-compose.yml", "utf8");
// The installer's Docker step lives in the setup wizard (ADR 080); the shell
// and PowerShell entry points only forward to it.
const dockerStep = readFileSync("src/cli/setup/_docker.js", "utf8");

assert.match(compose, /RULE_MCP_SSE_TOKEN:/, "Compose must pass the daemon token into the container");
assert.match(compose, /\$\{RULE_MCP_SSE_TOKEN/, "Compose must require the caller-provided token");
assert.match(dockerStep, /sseTokenPath/, "the installer must locate the persistent token");
assert.match(dockerStep, /RULE_MCP_SSE_TOKEN/, "the installer must pass the token to Docker");
assert.match(dockerStep, /docker compose up -d/, "the installer must start Docker mode");

console.log("  ✅ Docker mode shares authenticated SSE configuration with clients");
