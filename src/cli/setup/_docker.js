/**
 * @module cli/setup/docker
 *
 * Bringing the containerized SSE service up.
 *
 * Every precondition is reported as its own reason rather than a single
 * failure: the shell version printed one warning for four different causes,
 * which told the user nothing about what to fix.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { tryExecResult } from "../../shared/index.js";
import { getRuntimePaths } from "../paths/index.js";

/** Where the daemon writes the token the container has to share. */
export const sseTokenPath = () => join(getRuntimePaths().stateDir, "sse-token");

/**
 * Why Docker mode cannot run here, or "" when it can.
 *
 * @param {{ cwd?: string }} [options]
 */
export function dockerBlockers({ cwd = process.cwd() } = {}) {
  if (!tryExecResult("docker compose version").ok) {
    return "Docker Compose v2 is required for Docker mode";
  }

  if (!existsSync(join(cwd, "docker-compose.yml"))) {
    return "docker-compose.yml not found - run the wizard from the project directory";
  }

  if (!existsSync(sseTokenPath())) {
    return `missing daemon token: ${sseTokenPath()}`;
  }

  return "";
}

/**
 * Start the compose stack with the local SSE token in its environment.
 *
 * @param {{ cwd?: string, dryRun?: boolean }} [options]
 * @returns {{ status: "started"|"planned"|"blocked", reason?: string }}
 */
export function dockerComposeUp({ cwd = process.cwd(), dryRun = false } = {}) {
  const blocker = dockerBlockers({ cwd });

  if (blocker) {
    return { status: "blocked", reason: blocker };
  }

  if (dryRun) {
    return { status: "planned" };
  }

  const token = readFileSync(sseTokenPath(), "utf8").replaceAll(/[\r\n]/g, "");
  const result = tryExecResult("docker compose up -d", {
    cwd,
    env: { ...process.env, RULE_MCP_SSE_TOKEN: token },
    timeout: 120_000,
  });

  if (result.ok) {
    return { status: "started" };
  }

  return {
    status: "blocked",
    reason: result.capped ? "docker compose up -d passed the output capture limit" : "docker compose up -d failed",
  };
}
