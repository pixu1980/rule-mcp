/** Docker mode contract: the client config and container share one SSE token. */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const compose = readFileSync("docker-compose.yml", "utf8");
const shell = readFileSync("scripts/install.sh", "utf8");
const powershell = readFileSync("scripts/install.ps1", "utf8");

assert.match(compose, /RULE_MCP_SSE_TOKEN:/, "Compose must pass the daemon token into the container");
assert.match(compose, /\$\{RULE_MCP_SSE_TOKEN/, "Compose must require the caller-provided token");
assert.match(shell, /SSE_TOKEN_FILE=/, "shell installer must locate the persistent token");
assert.match(shell, /docker compose up -d/, "shell installer must start Docker mode");
assert.match(powershell, /\$env:RULE_MCP_SSE_TOKEN/, "PowerShell installer must pass the token to Docker");
assert.match(powershell, /docker compose up -d/, "PowerShell installer must start Docker mode");

console.log("  ✅ Docker mode shares authenticated SSE configuration with clients");
