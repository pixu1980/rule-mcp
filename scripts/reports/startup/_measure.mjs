

/**
 * @module scripts/reports/startup/measure
 *
 * The three ways this report measures a start: wall time of a repeated spawn,
 * a real MCP stdio handshake, and the in-process phase split from a cold child.
 */

import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("../../..", import.meta.url).pathname;
const BIN = join(ROOT, "bin/rule-mcp.js");
const PROBE = join(ROOT, "scripts/reports/startup/_probe.mjs");

export { BIN };

export const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export const round = (value) => Math.round(value * 10) / 10;

/**
 * Wall time of one spawn, repeated: the first run is cold, the rest are warm.
 *
 * @param {string[]} args
 * @param {object} env
 * @param {number} count
 * @returns {{ coldMs: number, warmMs: number, runs: number[] }}
 */
export function wall(args, env, count) {
  const runs = [];

  for (let index = 0; index < count; index += 1) {
    const startedAt = performance.now();
    spawnSync(process.execPath, [BIN, ...args], { env, stdio: "ignore" });
    runs.push(performance.now() - startedAt);
  }

  return { coldMs: round(runs[0]), warmMs: round(median(runs.slice(1))), runs: runs.map(round) };
}

/**
 * A real MCP stdio handshake: spawn the server, send `initialize`, wait for
 * the response. This is what a client waits for before its first tool call.
 *
 * @param {object} env
 * @returns {Promise<number>} milliseconds
 */
export function handshake(env) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const child = spawn(process.execPath, [BIN, "serve"], { env, stdio: ["pipe", "pipe", "ignore"] });
    let buffer = "";

    const done = (value) => {
      child.kill();
      resolve(value);
    };

    child.stdout.on("data", (chunk) => {
      buffer += chunk;

      if (buffer.includes('"id":1')) {
        done(round(performance.now() - startedAt));
      }
    });
    child.on("error", reject);
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "startup-report", version: "0" } },
      })}\n`,
    );
  });
}

/**
 * The in-process phase split, from a child so it is a cold process.
 *
 * @param {object} env
 * @returns {object}
 */
export function phases(env) {
  const result = spawnSync(process.execPath, [PROBE], { env, encoding: "utf8" });

  try {
    return JSON.parse(result.stdout.trim().split("\n").at(-1));
  } catch {
    return { error: (result.stderr || "probe failed").slice(0, 400) };
  }
}
