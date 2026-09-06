// Auto-split from src/cli/commands.js - see ./commands/index.js
/** Shared command runtime helpers: entry point, console printers, JSON parse, safe exec. */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const entrypoint = resolve(__dirname, "..", "..", "..", "bin", "rule-mcp.js");

export const print = (v) => process.stdout.write(`${v}\n`);
export const printJson = (v) => print(JSON.stringify(v, null, 2));
export const parseJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

/** Safely run a shell command, ignoring errors. */
export function tryExec(command, options = {}) {
  try {
    return execSync(command, { encoding: "utf8", timeout: 10_000, stdio: "pipe", ...options });
  } catch {
    return "";
  }
}
