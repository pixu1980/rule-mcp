/** @module scripts/case-studies/children - spawning, labeling and stopping the fleet. */

import { spawn } from "node:child_process";

/** Every long-running child, so one Ctrl-C stops the whole fleet. */
const children = new Set();

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
export function run(args, app, env) {
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
 * Install an app's dependencies, blocking until pnpm finishes.
 *
 * @param {{ dir: string, label: string }} app - the app to install
 * @returns {Promise<void>} resolves when the install succeeds
 */
export function install(app) {
  process.stdout.write(`[${app.label}] node_modules missing, running pnpm install…\n`);

  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["install", "--ignore-workspace", "--prefer-offline"], { cwd: app.dir, stdio: "inherit" });

    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`pnpm install failed in ${app.dir}`))));
  });
}

/** Send SIGTERM to every detached child process group. */
export function stopAll() {
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
