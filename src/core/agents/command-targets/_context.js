

/** @module core/agents/command-targets/context - injectable filesystem/platform resolution */

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Default resolution context - real filesystem, real HOME. */
export const defaultContext = () => ({
  home: homedir(),
  cwd: process.cwd(),
  platform: process.platform,
  env: process.env,
  exists: (path) => existsSync(path),
  listDir: (path) => {
    try {
      return readdirSync(path, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch {
      return [];
    }
  },
});

/** Roaming application-data root for editors that follow the VS Code layout. */
export const editorDataRoot = ({ home, platform, env }) => {
  if (platform === "darwin") {
    return join(home, "Library", "Application Support");
  }

  if (platform === "win32") {
    return env.APPDATA || join(home, "AppData", "Roaming");
  }

  return join(home, ".config");
};

/**
 * VS Code user-data directories, stable variant first. Prompt files are
 * profile-scoped, so each existing `profiles/<id>` gets its own dir too.
 */
export const VSCODE_VARIANTS = ["Code", "Code - Insiders", "Code - OSS", "VSCodium"];

/** Prompt-file directories for each installed VS Code variant. */
export const vscodePromptDirs = (ctx) => {
  const root = editorDataRoot(ctx);
  const dirs = [];

  for (const [index, variant] of VSCODE_VARIANTS.entries()) {
    const userDir = join(root, variant, "User");
    // The stable channel is always targeted (it is the default install); other
    // variants only when the editor actually has a user-data directory.
    if (index > 0 && !ctx.exists(userDir)) {
      continue;
    }

    dirs.push(join(userDir, "prompts"));

    for (const profile of ctx.listDir(join(userDir, "profiles"))) {
      dirs.push(join(userDir, "profiles", profile, "prompts"));
    }
  }

  return dirs;
};

/**
 * First existing directory from a list of candidates. `ctx.force` (an explicit
 * `install --agent <name>`) falls back to the first candidate so the user gets
 * the commands they asked for even on a fresh machine.
 */
export const firstExisting = (ctx, candidates) => {
  const found = candidates.find(({ gate }) => ctx.exists(gate));

  if (found) {
    return [found.dir];
  }

  return ctx.force ? [candidates[0].dir] : [];
};

/** Directory used only when its parent already exists (or the install is explicit). */
export const ifParentExists = (ctx, parent, dir) => (ctx.force || ctx.exists(parent) ? [dir] : []);
