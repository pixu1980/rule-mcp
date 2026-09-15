

/**
 * Personas B.5: the roles CLI.
 *
 * Overlays were hand-written JSON, which meant the first thing a new role hit
 * was the validator, after the file was already on disk and already wrong. The
 * CLI writes the file, so what lands is valid by construction, and it prints the
 * merged catalog with the layer each entry came from - the one question a stack
 * of three layers makes hard to answer by reading files.
 *
 * Every case runs the real binary against a temporary HOME, because the overlay
 * loader resolves the user layer from the home directory and a test that stubbed
 * that would not be testing the path anyone uses.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export { parsePersonaFile } from "../../persona-file/index.js";
export { validateRole } from "../../roles/index.js";

const BIN = fileURLToPath(new URL("../../../../../bin/rule-mcp.js", import.meta.url));

/** A home and a project of their own, so cases cannot see each other's roles. */
export function sandbox() {
  const home = mkdtempSync(join(tmpdir(), "rule-roles-home-"));
  const project = mkdtempSync(join(tmpdir(), "rule-roles-project-"));
  mkdirSync(join(project, ".git"), { recursive: true });

  return { home, project };
}

export function roles(box, ...args) {
  return spawnSync(process.execPath, [BIN, "roles", ...args], {
    cwd: box.project,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: box.home,
      RULE_MCP_NO_AUTOUPDATE: "1",
      RULE_MCP_STATE_DIR: join(box.home, ".rule-mcp", "state"),
    },
  });
}

export const overlayFile = (box, id) => join(box.home, ".rule-mcp", "config", "roles", `${id}.md`);
