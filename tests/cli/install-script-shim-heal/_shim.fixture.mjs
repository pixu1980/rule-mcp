/**
 * install.sh ↔ uninstall.sh round-trip contract for the global shim and for
 * the terminal rendering gate.
 *
 * Regression: a `pnpm link --global` shim pins the repo's absolute path. After
 * the project moved (…/rule-mcp → …/ai/rule-mcp) the old shim
 * stayed on PATH but crashed on launch, so every `run_cli` call failed, the
 * stderr was swallowed (`>/dev/null 2>/dev/null`) and install.sh silently
 * marked pi as "skipped" — nothing was written to ~/.pi/agent/mcp.json.
 *
 * Contract guarded here:
 *   1. install.sh probes the shim with `--version`, warns + relinks when it is
 *      stale, and lets `run_cli` fall back to the local entrypoint instead of
 *      failing silently.
 *   2. install.sh surfaces CLI errors instead of swallowing them.
 *   3. uninstall.sh reverses the shim install: `pnpm unlink --global` + bin
 *      shim + global-store link removal.
 *   4. Colors/box-drawing are gated off when stdout is not a TTY.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const root = new URL("../../..", import.meta.url).pathname;

const readScript = (p) => readFileSync(join(root, p), "utf8");

export const installSh = readScript("scripts/install.sh");
export const uninstallSh = readScript("scripts/uninstall.sh");

/** Extract a `name() { ... }` bash function (brace-balanced) from script source. */
export function extractBashFunction(source, name) {
  const start = source.indexOf(`${name}() {`);
  if (start === -1) {
    return null;
  }
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") {
      depth++;
    } else if (source[index] === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  return null;
}
