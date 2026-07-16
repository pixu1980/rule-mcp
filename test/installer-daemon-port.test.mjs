/** Regression: remote MCP config must honor a caller-selected SSE port. */
import { strict as assert } from "node:assert";
import { mcpServerConfig } from "../src/cli/install.js";

const config = mcpServerConfig("/tmp/pix-galaxy-mcp.js", { mode: "daemon", port: 38123 });
assert.equal(config.pix_galaxy_mcp.url, "http://127.0.0.1:38123/sse");

console.log("  ✅ daemon config honors explicit SSE port");
