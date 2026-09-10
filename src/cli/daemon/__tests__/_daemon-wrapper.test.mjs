

/**
 * @module test/daemon-wrapper.test
 *
 * Regression test for the macOS LaunchAgent wrapper script.
 * The wrapper is installed as `rule-mcpd`: with no args it starts the
 * SSE daemon, but with args it must behave like the normal CLI binary.
 */

import { strict as assert } from "node:assert";
import { generateWrapperScript } from "../index.js";

console.log("rule daemon wrapper test");

const script = generateWrapperScript({
  node: "/usr/local/bin/node",
  script: "/opt/rule-mcp/bin/rule-mcp.js",
});

assert.ok(script.includes("if [[ $# -gt 0 ]]; then"), "wrapper must branch when CLI args are provided");
assert.ok(script.includes('exec /usr/local/bin/node /opt/rule-mcp/bin/rule-mcp.js "$@"'), "wrapper must forward CLI args");
assert.ok(script.includes("serve --transport sse"), "wrapper must still default to SSE daemon with no args");
assert.ok(script.indexOf('"$@"') < script.indexOf("serve --transport sse"), "arg forwarding must happen before daemon fallback");

console.log("  ✅ wrapper forwards explicit CLI args and keeps daemon fallback");
