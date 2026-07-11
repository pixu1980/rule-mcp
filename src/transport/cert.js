/**
 * @module transport/cert
 *
 * Self-signed TLS certificate generator for local development.
 * Uses OpenSSL (available on macOS, Linux, Windows) to generate
 * proper X.509 certificates.
 *
 * Certificates are valid for 2 years (730 days) with the
 * subject CN "pix-galaxy-mcp.local" and SAN DNS:localhost,127.0.0.1.
 *
 * @see module:transport/sse — startSseServer imports cert generation
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";

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
 * @returns {boolean} — true on success, false on failure
 */
export function generateSelfSignedCert({ certPath, keyPath, commonName = "pix-galaxy-mcp.local", days = 730 }) {
  try {
    mkdirSync(dirname(certPath), { recursive: true });
    mkdirSync(dirname(keyPath), { recursive: true });

    // First check if openssl is available
    const whichResult = spawnSync("which", ["openssl"], { stdio: "pipe", encoding: "utf-8" });
    if (whichResult.status !== 0) {
      console.error("openssl not found. Install openssl or provide --ssl-cert and --ssl-key manually.");
      return false;
    }

    // Generate RSA private key
    const keyResult = spawnSync("openssl", [
      "genrsa",
      "-out", keyPath,
      "2048",
    ], { stdio: "pipe", encoding: "utf-8" });

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

    const certResult = spawnSync("openssl", [
      "req", "-x509",
      "-new",
      "-nodes",
      "-key", keyPath,
      "-sha256",
      "-days", String(days),
      "-out", certPath,
      "-config", "/dev/stdin",
    ], {
      input: certConfig,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
    });

    if (certResult.status !== 0) {
      console.error("Failed to generate certificate:", certResult.stderr);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to generate self-signed cert:", err.message);
    return false;
  }
}

/**
 * Check if OpenSSL is available on this system.
 *
 * @returns {boolean}
 */
export function isOpenSslAvailable() {
  try {
    const result = spawnSync("which", ["openssl"], { stdio: "pipe", encoding: "utf-8" });
    return result.status === 0;
  } catch {
    return false;
  }
}
