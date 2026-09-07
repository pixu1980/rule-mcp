/**
 * @module core/git-hooks
 *
 * Removing the hook block earlier versions installed.
 *
 * The block existed for one purpose: to re-assert a `.gitignore` rule for a
 * recorder directory this server wrote into every project it observed. Nothing
 * is written into a project any more - a recording lives under
 * `the home state dir/projects/` (ADR 082) - so nothing installs a hook, and what
 * remains here is the cleanup an install that has one still needs.
 *
 * The block is marked, so removing it never touches tokensave's hooks, which
 * share the same directory, or anything the user wrote themselves.
 *
 * @see module:cli/paths - the init flow that keeps recordings out of the project
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** The events earlier versions hooked. Read only to clean them up. */
export const HOOKED_GIT_EVENTS = ["post-checkout", "post-merge"];

/** The marker that says a line is ours. */
export const GIT_HOOK_MARKER = "rule-mcp";

/** The second block earlier versions appended, which has no end marker. */
const CHAIN_MARKER = "chain";

/**
 * The hooks directory git is configured to read, or the conventional one.
 *
 * @returns {string}
 */
export function gitHooksDir() {
  try {
    const configured = execFileSync("git", ["config", "--global", "core.hooksPath"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (configured) {
      return configured.startsWith("~") ? join(homedir(), configured.slice(1)) : configured;
    }
  } catch {
    /* no global hooks path configured */
  }

  return join(homedir(), ".config", "git", "hooks");
}

/**
 * Remove our block, leaving everything else in the file.
 *
 * @param {{ dir?: string }} [options]
 * @returns {{ dir: string, removed: string[] }}
 */
export function uninstallGitHooks(options = {}) {
  const dir = options.dir ?? gitHooksDir();
  const removed = [];

  for (const event of HOOKED_GIT_EVENTS) {
    const file = join(dir, event);
    try {
      if (!existsSync(file)) {
        continue;
      }

      const body = readFileSync(file, "utf8");

      if (!body.includes(GIT_HOOK_MARKER)) {
        continue;
      }

      const kept = [];
      let skipping = false;

      for (const line of body.split("\n")) {
        if (line.includes(`${GIT_HOOK_MARKER}: begin`) || line.includes(`${GIT_HOOK_MARKER}: ${CHAIN_MARKER}`)) {
          skipping = true;
          continue;
        }

        if (skipping) {
          // The begin/end block ends at its marker; the chain block, which has
          // no end marker, ends at the first blank line after it.
          if (line.includes(`${GIT_HOOK_MARKER}: end`) || line.trim() === "") {
            skipping = false;
          }

          continue;
        }

        kept.push(line);
      }

      const stripped = kept.join("\n").replaceAll(/\n{3,}/g, "\n\n");

      writeFileSync(file, stripped.endsWith("\n") ? stripped : `${stripped}\n`);
      removed.push(event);
    } catch {
      /* a hook we cannot rewrite is one the user will have to edit */
    }
  }

  return { dir, removed };
}
