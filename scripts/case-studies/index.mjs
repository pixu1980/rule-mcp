#!/usr/bin/env node


/**
 * @module scripts/case-studies
 *
 * Start the six case-study apps in parallel, each on its own port.
 *
 * Three bookmarks apps (React + Express) run their own `pnpm dev` pipeline;
 * three phonebook apps (React + Electron) run Vite, then attach Electron to
 * the Vite dev server. Ports are picked from a per-app base at runtime, so the
 * apps never fight over 3000/5173. Every app reads its port from the
 * environment: `VITE_PORT`, `PORT`/`VITE_API_ORIGIN`/`VITE_API_URL`/CORS vars
 * for the web apps, `ELECTRON_RENDERER_URL` for the Electron renderers.
 *
 * Usage:
 *   pnpm case-studies
 *
 * @see case-studies/*\/vite.config.* - env-aware port and proxy target
 * @see case-studies/phonebook/*\/electron/main.* - env-aware renderer URL
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CASES = join(HERE, "..", "..", "case-studies");

/** How far past each base port the allocator will look before giving up. */
const PORT_WINDOW = 100;
/** How long to wait for a Vite dev server before assuming its app is broken. */
const READY_TIMEOUT_MS = 60_000;
/** The loopback name Vite binds by default and Electron is told to load. */
const HOST = "localhost";

/** Ports already handed out in this run. */
const claimed = new Set();
/** Every long-running child, so one Ctrl-C stops the whole fleet. */
const children = new Set();

/** Env shared by the three phonebook Electron apps. */
function electronEnv(web) {
  return {
    VITE_PORT: String(web),
    ELECTRON_RENDERER_URL: `http://localhost:${web}`,
    NODE_ENV: "development",
  };
}

/** The six apps: port bases to search from, and the env each one needs. */
const APPS = [
  {
    id: "bookmarks-ds4-flash",
    label: "bm-ds4",
    kind: "web",
    dir: join(CASES, "bookmarks-manager", "bookmarks-manager-ds4-flash"),
    webBase: 3000,
    apiBase: 4000,
    env: ({ web, api }) => ({
      VITE_PORT: String(web),
      VITE_API_ORIGIN: `http://127.0.0.1:${api}`,
      PORT: String(api),
      ALLOWED_ORIGINS: `http://localhost:${web}`,
    }),
  },
  {
    id: "bookmarks-gpt56-luna",
    label: "bm-gpt",
    kind: "web",
    dir: join(CASES, "bookmarks-manager", "bookmarks-manager-gpt56-luna"),
    webBase: 3010,
    apiBase: 4010,
    env: ({ web, api }) => ({
      VITE_PORT: String(web),
      VITE_API_URL: `http://127.0.0.1:${api}`,
      PORT: String(api),
      WEB_ORIGIN: `http://localhost:${web}`,
    }),
  },
  {
    id: "bookmarks-sonnet5",
    label: "bm-sonnet",
    kind: "web",
    dir: join(CASES, "bookmarks-manager", "bookmarks-manager-sonnet5"),
    webBase: 3020,
    apiBase: 4020,
    env: ({ web, api }) => ({
      VITE_PORT: String(web),
      VITE_API_ORIGIN: `http://127.0.0.1:${api}`,
      PORT: String(api),
      ALLOWED_ORIGINS: `http://localhost:${web}`,
    }),
  },
  {
    id: "phonebook-ds4-flash",
    label: "pb-ds4",
    kind: "electron",
    dir: join(CASES, "phonebook", "phonebook-ds4-flash"),
    webBase: 3030,
    env: ({ web }) => electronEnv(web),
  },
  {
    id: "phonebook-gpt56-luna",
    label: "pb-gpt",
    kind: "electron",
    dir: join(CASES, "phonebook", "phonebook-gpt56-luna"),
    webBase: 3040,
    env: ({ web }) => electronEnv(web),
  },
  {
    id: "phonebook-sonnet46",
    label: "pb-sonnet",
    kind: "electron",
    dir: join(CASES, "phonebook", "phonebook-sonnet46"),
    webBase: 3050,
    env: ({ web }) => electronEnv(web),
  },
];

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
async function pickPort(base) {
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
 * Prefix a child's stdout and stderr with its label, line by line.
 *
 * @param {import("node:child_process").ChildProcess} child - the child to pipe
 * @param {string} label - the short label to prefix each line with
 */
function prefix(child, label) {
  for (const stream of [child.stdout, child.stderr]) {
    let pending = "";

    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      pending += chunk;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";

      for (const line of lines) {
        process.stdout.write(`[${label}] ${line}\n`);
      }
    });
    stream.on("end", () => {
      if (pending) {
        process.stdout.write(`[${label}] ${pending}\n`);
      }
    });
  }
}

/**
 * Spawn a pnpm command inside an app, detached so its whole tree can be killed.
 *
 * @param {string[]} args - pnpm arguments
 * @param {{ dir: string, label: string }} app - the app to run in
 * @param {Record<string, string>} env - extra environment variables
 * @returns {import("node:child_process").ChildProcess} the child process
 */
function run(args, app, env) {
  const child = spawn("pnpm", args, {
    cwd: app.dir,
    env: { ...process.env, ...env },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.add(child);
  prefix(child, app.label);
  child.on("exit", (code, signal) => {
    children.delete(child);

    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      process.stdout.write(`[${app.label}] exited with code ${code ?? signal}\n`);
    }
  });

  return child;
}

/**
 * Resolve once something accepts TCP connections on the port, or reject.
 *
 * @param {number} port - the port to watch
 * @param {import("node:child_process").ChildProcess} [server] - the dev server,
 *   so an early exit fails fast instead of waiting out the timeout
 * @returns {Promise<void>} resolves when the port is open
 */
function waitForPort(port, server) {
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

/**
 * Install an app's dependencies, blocking until pnpm finishes.
 *
 * @param {{ dir: string, label: string }} app - the app to install
 * @returns {Promise<void>} resolves when the install succeeds
 */
function install(app) {
  process.stdout.write(`[${app.label}] node_modules missing, running pnpm install…\n`);

  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["install", "--ignore-workspace", "--prefer-offline"], { cwd: app.dir, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`pnpm install failed in ${app.dir}`))));
  });
}

/**
 * Start a web app through its own dev pipeline.
 *
 * @param {object} app - the app definition
 * @param {{ web: number, api?: number }} ports - the ports it should use
 */
function startWeb(app, ports) {
  run(["dev"], app, app.env(ports));
}

/**
 * Start an Electron app: Vite first, then Electron once the renderer answers.
 *
 * @param {object} app - the app definition
 * @param {{ web: number }} ports - the ports it should use
 * @returns {Promise<void>} resolves once Electron is attached
 */
async function startElectron(app, ports) {
  const env = app.env(ports);
  const server = run(["exec", "vite"], app, env);

  await waitForPort(ports.web, server);
  run(["exec", "electron", "."], app, env);
}

/** Send SIGTERM to every detached child process group. */
function stopAll() {
  for (const child of children) {
    if (!child.pid) {
      continue;
    }

    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      try {
        child.kill("SIGTERM");
      } catch {
        // Already gone.
      }
    }
  }
}

/** Install missing deps, allocate ports, then start the fleet. */
async function main() {
  for (const app of APPS) {
    if (!existsSync(app.dir)) {
      throw new Error(`Missing app directory: ${app.dir}`);
    }
  }

  for (const app of APPS) {
    if (!existsSync(join(app.dir, "node_modules"))) {
      await install(app);
    }
  }

  const plan = [];

  for (const app of APPS) {
    const web = await pickPort(app.webBase);
    const api = app.apiBase ? await pickPort(app.apiBase) : undefined;

    plan.push({ app, ports: { web, api } });
  }

  process.stdout.write("\nStarting 6 case-study apps:\n");

  for (const { app, ports } of plan) {
    const target =
      app.kind === "electron" ? `renderer http://localhost:${ports.web}` : `web http://localhost:${ports.web}${ports.api ? `  api http://localhost:${ports.api}` : ""}`;

    process.stdout.write(`  ${app.id.padEnd(24)} ${target}\n`);
  }

  process.stdout.write("\nPress Ctrl-C to stop everything.\n\n");

  for (const { app, ports } of plan) {
    if (app.kind === "electron") {
      await startElectron(app, ports);
    } else {
      startWeb(app, ports);
    }
  }
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});

await main().catch((error) => {
  process.stderr.write(`[case-studies] ${error.message}\n`);
  stopAll();
  process.exit(1);
});
