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

import { existsSync } from "node:fs";
import { join } from "node:path";

import { APPS } from "./_apps.data.mjs";
import { install, run, stopAll } from "./_children.mjs";
import { pickPort, waitForPort } from "./_ports.mjs";

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
