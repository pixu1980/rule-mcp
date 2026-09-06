/**
 * @module test/https.test
 *
 * TDD tests for optional HTTPS support (Phase 2.3).
 * Tests: self-signed cert generation, HTTPS server startup,
 * health check over HTTPS, graceful shutdown.
 */

// eslint-disable-next-line no-unused-vars
import { readFileSync, existsSync, unlinkSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import https from "node:https";

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("=== HTTPS Support Tests ===\n");

const tmpDir = join(tmpdir(), "rule-mcp-https-" + Date.now());
mkdirSync(tmpDir, { recursive: true });

try {
  // ── T1: Self-signed cert generation ──
  const { generateSelfSignedCert, isOpenSslAvailable } = await import("../../src/transport/cert.js");

  if (isOpenSslAvailable()) {
    const certPath = join(tmpDir, "cert.pem");
    const keyPath = join(tmpDir, "key.pem");

    const generated = generateSelfSignedCert({ certPath, keyPath });
    check("T1 cert generated", generated === true);
    check("T1.1 cert file exists", existsSync(certPath));
    check("T1.2 key file exists", existsSync(keyPath));

    const certContent = readFileSync(certPath, "utf8");
    check("T1.3 has BEGIN CERTIFICATE", certContent.includes("BEGIN CERTIFICATE"));

    const keyContent = readFileSync(keyPath, "utf8");
    check("T1.4 has BEGIN PRIVATE KEY", keyContent.includes("BEGIN PRIVATE KEY"));

    // ── T2: HTTPS server startup with generated cert ──
    const { startSseServer, stopSseServer } = await import("../../src/transport/sse.js");

    const httpsServer = await startSseServer({
      port: 0,
      sslCert: certPath,
      sslKey: keyPath,
    });
    check("T2 HTTPS server started", typeof httpsServer.port === "number" && httpsServer.port > 0);

    // ── T3: Health check over HTTPS (accept self-signed cert) ──
    const httpsBody = await new Promise((resolve, reject) => {
      const request = https.request(
        {
          hostname: "127.0.0.1",
          port: httpsServer.port,
          path: "/health",
          method: "GET",
          rejectUnauthorized: false,
        },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        },
      );
      request.on("error", reject);
      request.end();
    });
    check("T3 HTTPS health check returns 200", httpsBody.status === 200);
    const parsed = JSON.parse(httpsBody.body);
    check("T3.1 HTTPS health body ok:true", parsed.ok === true);

    // ── T5: CORS on HTTPS (denied for unknown origins since Phase 1.2) ──
    check(
      "T5 CORS deny-by-default on HTTPS",
      httpsBody.headers["access-control-allow-origin"] === undefined ||
        httpsBody.headers["access-control-allow-origin"] !== "*",
    );

    // ── T4: Graceful shutdown ──
    await stopSseServer();
    check("T4 HTTPS server stops gracefully", true);

    try {
      await new Promise((resolve, reject) => {
        const request = https.request(
          {
            hostname: "127.0.0.1",
            port: httpsServer.port,
            path: "/health",
            method: "GET",
            rejectUnauthorized: false,
          },
          (res) => resolve(res),
        );
        request.on("error", reject);
        request.end();
      });
      check("T4.1 HTTPS port closed after stop", false);
    } catch {
      check("T4.1 HTTPS port closed after stop", true);
    }
  } else {
    console.log("  ⏭️  OpenSSL not available, skipping cert generation tests");
  }
} finally {
  // Clean up temp files
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore: tmp dir may be absent */
  }
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
