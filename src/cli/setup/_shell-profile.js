/**
 * @module cli/setup/shell-profile
 *
 * Removing this server's marked lines from shell startup files.
 *
 * Narrower than the shell uninstaller it replaces, deliberately. That one ran
 * `sed '/export OPENAI_API_KEY=".*"/d'` over every profile, which deleted the
 * user's own API keys whether or not this installer had ever written them -
 * an uninstall is not a license to edit lines it did not author. Only a
 * `# rule-mcp:` comment, and the single export it introduces, are ours
 * to remove.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** The startup files this installer is willing to edit. */
export function profilePaths(home = homedir()) {
  return [
    join(home, ".bashrc"),
    join(home, ".zshrc"),
    join(home, ".bash_profile"),
    join(home, ".profile"),
    join(home, ".config", "fish", "config.fish"),
    join(home, ".config", "elvish", "rc.elv"),
  ];
}

const OWNED_COMMENT = /^\s*#\s*rule-mcp:/;
const EXPORT_LINE = /^\s*(?:export|set -gx)\s+[A-Z_][\w]*\s*[= ]/;

/** Whether a profile carries anything this installer wrote. */
export const hasOwnedLines = (text) =>
  String(text ?? "")
    .split("\n")
    .some((line) => OWNED_COMMENT.test(line));

/**
 * Drop every `# rule-mcp:` line and the export it annotates.
 *
 * The export is only taken when it directly follows the comment: that is the
 * shape this installer writes, and anything else in the file belongs to the
 * user.
 */
export function cleanProfileText(text) {
  const lines = String(text ?? "").split("\n");
  const kept = [];

  for (let index = 0; index < lines.length; index++) {
    if (!OWNED_COMMENT.test(lines[index])) {
      kept.push(lines[index]);
      continue;
    }

    if (EXPORT_LINE.test(lines[index + 1] ?? "")) {
      index++;
    }
  }

  return kept.join("\n");
}

/**
 * Clean every profile that has owned lines.
 *
 * @param {{ home?: string, dryRun?: boolean }} [options]
 * @returns {Array<{ file: string, status: "cleaned"|"planned" }>}
 */
export function cleanShellProfiles({ home = homedir(), dryRun = false } = {}) {
  const results = [];

  for (const file of profilePaths(home)) {
    if (!existsSync(file)) {
      continue;
    }

    const current = readFileSync(file, "utf8");

    if (!hasOwnedLines(current)) {
      continue;
    }

    if (dryRun) {
      results.push({ file, status: "planned" });
      continue;
    }

    writeFileSync(file, cleanProfileText(current));
    results.push({ file, status: "cleaned" });
  }

  return results;
}
