/**
 * @module transport/cert
 *
 * Self-signed TLS certificate generator for local development.
 * Uses OpenSSL (available on macOS, Linux, Windows) to generate
 * proper X.509 certificates.
 *
 * Certificates are valid for 2 years (730 days) with the
 * subject CN "rule-mcp.local" and SAN DNS:localhost,127.0.0.1.
 *
 * @see module:transport/sse - startSseServer imports cert generation
 */

import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Generate a self-signed TLS certificate and RSA private key.
 * Uses OpenSSL subprocess. Returns false if OpenSSL is not available.
 *
 * @param {{
 *   certPath: string,
 *   keyPath: string,
 *   commonName?: string,
 *   days?: number
 * }} options
 * @returns {boolean} - true on success, false on failure
 */
export function generateSelfSignedCert({ certPath, keyPath, commonName = "rule-mcp.local", days = 730 }) {
  // Config written to a real temp file (not /dev/stdin, which is POSIX-only) so
  // certificate generation works on Windows as well as macOS/Linux.
  const configPath = join(tmpdir(), `rule-cert-${process.pid}.cnf`);
  try {
    mkdirSync(dirname(certPath), { recursive: true });
    mkdirSync(dirname(keyPath), { recursive: true });

    // Check openssl is available by invoking it directly (cross-platform;
    // `which`/`where` differ per OS, but `openssl version` does not).
    if (!isOpenSslAvailable()) {
      console.error("openssl not found. Install openssl or provide --ssl-cert and --ssl-key manually.");

      return false;
    }

    // Generate RSA private key
    const keyResult = spawnSync("openssl", ["genrsa", "-out", keyPath, "2048"], { stdio: "pipe", encoding: "utf-8" });

    if (keyResult.status !== 0) {
      console.error("Failed to generate RSA key:", keyResult.stderr);

      return false;
    }

    // Generate self-signed certificate
    // Use a config file for SAN (Subject Alternative Name) support
    const certConfig = [
      "[req]",
      "distinguished_name = req_distinguished_name",
      "x509_extensions = v3_req",
      "prompt = no",
      "[req_distinguished_name]",
      `CN = ${commonName}`,
      "[v3_req]",
      "keyUsage = keyEncipherment, dataEncipherment",
      "extendedKeyUsage = serverAuth",
      "subjectAltName = @alt_names",
      "[alt_names]",
      "DNS.1 = localhost",
      "DNS.2 = 127.0.0.1",
      "DNS.3 = ::1",
    ].join("\n");
    writeFileSync(configPath, certConfig, { encoding: "utf-8", mode: 0o600 });

    const certResult = spawnSync("openssl", ["req", "-x509", "-new", "-nodes", "-key", keyPath, "-sha256", "-days", String(days), "-out", certPath, "-config", configPath], {
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
    });

    if (certResult.status !== 0) {
      console.error("Failed to generate certificate:", certResult.stderr);

      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to generate self-signed cert:", error.message);

    return false;
  } finally {
    try {
      unlinkSync(configPath);
    } catch {
      /* temp config already gone */
    }
  }
}

/**
 * Check if OpenSSL is available on this system.
 *
 * @returns {boolean}
 */
export function isOpenSslAvailable() {
  try {
    const result = spawnSync("openssl", ["version"], { stdio: "pipe", encoding: "utf-8" });

    return result.status === 0;
  } catch {
    return false;
  }
}
