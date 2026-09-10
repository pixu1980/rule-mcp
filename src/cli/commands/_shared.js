

/** Shared command runtime helpers: entry point, console printers, JSON parse, safe exec. */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export { tryExec } from "../../shared/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path of the CLI binary, for subcommands that re-invoke it. */
export const entrypoint = resolve(__dirname, "..", "..", "..", "bin", "rule-mcp.js");

/** Print one line to stdout. */
export const print = (v) => process.stdout.write(`${v}\n`);

/** Print a value as pretty JSON. */
export const printJson = (v) => print(JSON.stringify(v, null, 2));

/** Parse JSON, returning {} on malformed input. */
export const parseJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};
