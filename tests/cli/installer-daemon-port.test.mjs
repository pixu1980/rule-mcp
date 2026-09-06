/** Regression: remote MCP config must honor a caller-selected SSE port. */
import { strict as assert } from "node:assert";
import { mcpServerConfig } from "../../src/cli/install/index.js";

const config = mcpServerConfig("/tmp/rule-mcp.js", { mode: "daemon", port: 38_123 });
assert.equal(config["rule-mcp"].url, "http://127.0.0.1:38123/sse");

console.log("  ✅ daemon config honors explicit SSE port");
