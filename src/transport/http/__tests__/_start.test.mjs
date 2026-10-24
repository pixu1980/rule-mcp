/** startHttpServer: the HTTPS path, a failed cert generation, and an occupied port. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import https from "node:https";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { startHttpServer, stopHttpServer } from "../index.js";

process.env.RULE_MCP_SSE_TOKEN = "c".repeat(64);

test("an https server boots with generated self-signed certificates", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-http-tls-"));
  try {
    const certPath = join(dir, "cert.pem");
    const keyPath = join(dir, "key.pem");

    const { port, token } = await startHttpServer({ port: 0, sslCert: certPath, sslKey: keyPath });
    assert.equal(token, process.env.RULE_MCP_SSE_TOKEN, "the token is propagated");
    assert.ok(port > 0, "the server bound a port");

    const body = await new Promise((resolve, reject) => {
      https
        .request({ host: "127.0.0.1", port, path: "/health", rejectUnauthorized: false }, (res) => {
          let text = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            text += chunk;
          });
          res.on("end", () => resolve(text));
        })
        .on("error", reject)
        .end();
    });
    assert.match(body, /"ok":true/, "health works over TLS");
  } finally {
    await stopHttpServer();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unusable certificate path fails loudly instead of booting plaintext", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-http-tls-"));
  try {
    writeFileSync(join(dir, "blocker"), "a file, not a directory", "utf8");
    await assert.rejects(
      () => startHttpServer({ port: 0, sslCert: join(dir, "blocker", "cert.pem"), sslKey: join(dir, "blocker", "key.pem") }),
      /Failed to generate self-signed cert/,
      "the caller learns the TLS boot failed",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an occupied port rejects the start", async () => {
  const blocker = createServer();
  const port = await new Promise((resolve) => {
    blocker.listen(0, "127.0.0.1", () => resolve(blocker.address().port));
  });
  try {
    await assert.rejects(() => startHttpServer({ port, host: "127.0.0.1" }), /EADDRINUSE|couldn't be reached|error/i, "the caller learns the port is taken");
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
    await stopHttpServer();
  }
});
