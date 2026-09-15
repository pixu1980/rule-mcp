/**
 * @module core/tokensave/deps
 *
 * The project manifest provider: TokenSave `config` when the graph is
 * available, a direct package.json read otherwise.
 *
 * The detector wants four keys, and `config` answers one key per call, so the
 * provider only earns its cost where detection is asked for on purpose (the
 * `rule_tool_detect` tool), not on the routing hot path.
 *
 * @see module:core/tokensave/client-sync - the synchronous CLI call
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { callToolSync } from "./_client-sync.js";
import { probeFilesystem } from "./_probe.js";

/**
 * Read package.json directly, or null when it is missing or unreadable.
 *
 * @param {string} projectDir
 * @returns {object|null}
 */
export function readManifest(projectDir) {
  try {
    return JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8"));
  } catch (error) {
    // A missing file or malformed JSON is "no manifest"; an invalid path
    // argument is a caller bug and must keep throwing, as it always did.
    if (error?.code === "ENOENT" || error instanceof SyntaxError) {
      return null;
    }

    throw error;
  }
}

/** One dotted key from package.json, through TokenSave `config`. */
function configValue(projectDir, key, client) {
  const result = client("config", { path: "package.json", key }, { projectDir });

  return result.ok ? (result.value?.matches?.[0]?.value ?? null) : null;
}

/**
 * The project manifest with the keys the detector needs.
 *
 * @param {string} [projectDir]
 * @param {{ probe?: Function, client?: Function }} [options]
 * @returns {object|null}
 */
export function projectManifest(projectDir = process.cwd(), { probe = probeFilesystem, client = callToolSync } = {}) {
  if (!probe(projectDir).available) {
    return readManifest(projectDir);
  }

  const name = configValue(projectDir, "name", client);
  const dependencies = configValue(projectDir, "dependencies", client);
  const devDependencies = configValue(projectDir, "devDependencies", client);
  const nodeVersion = configValue(projectDir, "engines.node", client);

  if (name === null && dependencies === null && devDependencies === null && nodeVersion === null) {
    return readManifest(projectDir);
  }

  return {
    name: name ?? "unknown",
    dependencies: dependencies ?? {},
    devDependencies: devDependencies ?? {},
    engines: nodeVersion === null ? {} : { node: nodeVersion },
  };
}
