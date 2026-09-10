// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** Regression: remote MCP config must honor a caller-selected SSE port. */
import { strict as assert } from "node:assert";
import { mcpServerConfig } from "../index.js";

const config = mcpServerConfig("/tmp/pix-galaxy-mcp.js", { mode: "daemon", port: 38_123 });
assert.equal(config["pix-galaxy-mcp"].url, "http://127.0.0.1:38123/sse");

console.log("  ✅ daemon config honors explicit SSE port");
