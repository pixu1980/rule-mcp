

/** @module scripts/case-studies/ports - free-port probing, claiming and waiting. */

import { createConnection } from "node:net";

import { HOST } from "./_apps.data.mjs";

/** How far past each base port the allocator will look before giving up. */
const PORT_WINDOW = 100;
/** How long to wait for a Vite dev server before assuming its app is broken. */
const READY_TIMEOUT_MS = 60_000;

/** Ports already handed out in this run. */
const claimed = new Set();

/**
 * Probe a loopback port: resolves true when nothing answers a TCP connect.
 *
 * @param {number} port - the port to probe
 * @returns {Promise<boolean>} true when the port is free
 */
function isFree(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: HOST });
    const finish = (free) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(free);
    };

    socket.once("connect", () => finish(false));
    socket.once("error", () => finish(true));
    socket.setTimeout(750, () => finish(true));
  });
}

/**
 * Claim the first free port at or after `base`.
 *
 * @param {number} base - the first port to try
 * @returns {Promise<number>} a free, claimed port
 */
export async function pickPort(base) {
  for (let port = base; port < base + PORT_WINDOW; port++) {
    if (claimed.has(port)) {
      continue;
    }

    if (await isFree(port)) {
      claimed.add(port);

      return port;
    }
  }

  throw new Error(`No free port in [${base}, ${base + PORT_WINDOW})`);
}

/**
 * Resolve once something accepts TCP connections on the port, or reject.
 *
 * @param {number} port - the port to watch
 * @param {import("node:child_process").ChildProcess} [server] - the dev server,
 *   so an early exit fails fast instead of waiting out the timeout
 * @returns {Promise<void>} resolves when the port is open
 */
export function waitForPort(port, server) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = createConnection({ port, host: HOST });

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();

        if (server && server.exitCode !== null) {
          reject(new Error(`dev server exited before port ${port} opened`));

          return;
        }

        if (Date.now() - started > READY_TIMEOUT_MS) {
          reject(new Error(`port ${port} did not open within ${READY_TIMEOUT_MS}ms`));

          return;
        }

        setTimeout(attempt, 250);
      });
    };

    attempt();
  });
}
