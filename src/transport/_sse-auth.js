/**
 * @module transport/sse-auth
 *
 * Persistent authentication for the local SSE daemon.
 * The token survives daemon restarts so MCP client configurations remain valid.
 */

import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getRuntimePaths } from "../cli/paths/index.js";

/* ─── Persistent token configuration ─── */

/** Environment variable that overrides the persisted local SSE bearer token. */
export const SSE_TOKEN_ENV = "RULE_MCP_SSE_TOKEN";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

/** @returns {string} Path of the local daemon bearer-token file. */
export const getSseTokenFile = () => join(getRuntimePaths().stateDir, "sse-token");

/* ─── Token resolution ─── */

/**
 * Return the bearer token used by local daemon installations.
 * An explicitly supplied environment token takes precedence, otherwise a
 * random token is created once and stored with owner-only permissions.
 *
 * @returns {string}
 */
export function getOrCreateSseBearerToken() {
  const environmentToken = process.env[SSE_TOKEN_ENV];

  if (environmentToken !== undefined) {
    if (!TOKEN_PATTERN.test(environmentToken)) {
      throw new Error(`${SSE_TOKEN_ENV} must be a 64-character hexadecimal token`);
    }

    return environmentToken;
  }

  const tokenFile = getSseTokenFile();

  if (existsSync(tokenFile)) {
    const token = readFileSync(tokenFile, "utf8").trim();

    if (!TOKEN_PATTERN.test(token)) {
      throw new Error(`Invalid SSE bearer token at ${tokenFile}`);
    }

    return token;
  }

  const { stateDir } = getRuntimePaths();
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  try {
    chmodSync(stateDir, 0o700);
  } catch {
    /* Windows or unsupported filesystem */
  }

  const token = randomBytes(32).toString("hex");
  const temporaryFile = `${tokenFile}.${process.pid}.tmp`;

  writeFileSync(temporaryFile, `${token}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(temporaryFile, 0o600);
  } catch {
    /* Windows or unsupported filesystem */
  }

  renameSync(temporaryFile, tokenFile);
  try {
    chmodSync(tokenFile, 0o600);
  } catch {
    /* Windows or unsupported filesystem */
  }

  return token;
}
