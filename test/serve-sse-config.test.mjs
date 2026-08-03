/** End-to-end: serve --transport sse prints a matching remote MCP config. */
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const root = new URL("..", import.meta.url).pathname;
const reservePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });

const port = await reservePort();
const child = spawn(
  process.execPath,
  ["bin/rule-mcp.js", "serve", "--transport", "sse", "--port", String(port)],
  {
    cwd: root,
    stdio: ["ignore", "ignore", "pipe"],
  },
);
let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`SSE server did not start:\n${stderr}`)), 10_000);
    const poll = setInterval(() => {
      if (!stderr.includes("SSE server listening") || !stderr.includes('"Authorization"')) {return;}
      clearInterval(poll);
      clearTimeout(timer);
      resolve();
    }, 25);
    child.once("error", reject);
  });
  assert.match(stderr, new RegExp(String.raw`http://127\.0\.0\.1:${port}/sse`));
  assert.match(stderr, /"url": "http:\/\/127\.0\.0\.1:/);
  assert.match(stderr, /"Authorization": "Bearer [a-f0-9]{64}"/i);
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}

console.log("  ✅ serve --transport sse prints matching HTTP MCP config");
