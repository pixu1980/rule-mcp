

/**
 * opencode's agent module: install, uninstall, and the sweep of the
 * `mcp.json` an older installer wrote.
 *
 * opencode reads `~/.config/opencode/opencode.json` (and `.jsonc`, both
 * merged) and expects the server under `mcp` in the shape
 * `_writers-opencode.js` builds - the `mcpServers` shape the generic
 * installer wrote to `~/.config/opencode/mcp.json` was never read, which is
 * why the server stayed invisible to `/mcps`.
 * @module cli/installers/agents-opencode
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { HOME, readText, removeFile, writeText } from "./_paths.js";
import { commandConfig } from "./_env.js";
import { removeJsonServer } from "./_writers-json.js";
import { appendInstruction, removeInstruction } from "./_writers-text.js";
import { upsertOpencode, removeOpencode } from "./_writers-opencode.js";

/**
 * Sweep this server from a file an older install wrote, deleting it when
 * emptied. A file that does not exist is never created.
 *
 * @param {string} file
 * @param {boolean} dryRun
 * @returns {string|null}
 */
const sweepJsonServer = (file, dryRun) => {
  if (!existsSync(file)) {
    return null;
  }

  const cleaned = removeJsonServer(readText(file));

  if (cleaned === "") {
    if (!dryRun) {
      removeFile(file);
    }

    return file;
  }

  return writeText({ file, content: cleaned, dryRun });
};

/**
 * Installs rule-mcp into opencode. The instruction file is registered in
 * `instructions`, because opencode only reads the files that array names.
 *
 * @param {{ entrypoint: string, dryRun?: boolean, global?: boolean, mode?: string }} opts
 * @returns {Array<{ file: string, action: string }>}
 */
const installOpencode = ({ entrypoint, dryRun = false, global = false, mode = "stdio" }) => {
  const dir = join(HOME, ".config", "opencode");
  const file = join(dir, "opencode.json");
  const instructionsFile = join(dir, "instructions.md");
  const results = [
    writeText({
      file,
      content: upsertOpencode(readText(file), commandConfig(entrypoint, { global, mode, agentName: "opencode" }), instructionsFile),
      dryRun,
    }),
    writeText({ file: instructionsFile, content: appendInstruction(readText(instructionsFile)), dryRun }),
  ];
  const legacy = sweepJsonServer(join(dir, "mcp.json"), dryRun);

  if (legacy) {
    results.push(legacy);
  }

  return results;
};

/**
 * Remove opencode entries only: the `mcp` entry, the instruction registration
 * and its block, and the sweep of the legacy `mcp.json`.
 *
 * @param {{ dryRun?: boolean }} opts
 * @returns {Array<{ file: string, action: string }>}
 */
const uninstallOpencode = ({ dryRun }) => {
  const dir = join(HOME, ".config", "opencode");
  const file = join(dir, "opencode.json");
  const instructionsFile = join(dir, "instructions.md");
  const results = [writeText({ file, content: removeOpencode(readText(file), instructionsFile), dryRun })];

  if (existsSync(instructionsFile)) {
    const stripped = removeInstruction(readText(instructionsFile));

    if (stripped === "") {
      if (!dryRun) {
        removeFile(instructionsFile);
      }

      results.push(instructionsFile);
    } else {
      results.push(writeText({ file: instructionsFile, content: stripped, dryRun }));
    }
  }

  const legacy = sweepJsonServer(join(dir, "mcp.json"), dryRun);

  if (legacy) {
    results.push(legacy);
  }

  return results;
};

export { installOpencode, uninstallOpencode, sweepJsonServer };
