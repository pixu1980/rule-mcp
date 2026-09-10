/** @module cli/commands/targets-sync - write the command files into every resolved target */

import { renderAgentCommandFiles } from "../../core/agents/commands/index.js";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { print } from "./_shared.js";
import { resolve } from "node:path";
import { resolvedTargets } from "./_targets.js";

/**
 * Write (or remove with `--remove`) the whole clean command set in every resolved
 * target directory, so a single call covers every agent/IDE on this machine.
 *
 * @param {{ agent?: string, remove?: boolean, dryRun?: boolean, json?: boolean }} opts
 */
export function syncCommandTargets(opts) {
  const targets = resolvedTargets(opts);

  if (targets.length === 0) {
    print("agent-commands: no agent command directories found on this machine");

    return;
  }

  let files = 0;

  for (const { label, format, dir } of targets) {
    const rendered = renderAgentCommandFiles(format);

    if (!opts.dryRun && !opts.remove) {
      mkdirSync(dir, { recursive: true });
    }

    // Remove sweeps the whole `rule-*` namespace in the target dir, so names
    // that left the registry (a rename, a deletion) are purged too instead of
    // lingering as stale commands next to the new set.
    if (opts.remove) {
      // A detected agent does not always have its command directory yet -
      // Pi is detected from ~/.pi/agent/mcp.json while the prompts dir is
      // created on first write. readdirSync would throw ENOENT and take the
      // whole removal down with it.
      if (!existsSync(dir)) {
        print(`  ${label}: no command directory → ${dir}`);
        continue;
      }

      const stale = readdirSync(dir)
        .filter((entry) => entry.startsWith("rule-"))
        .filter((entry) => entry.endsWith(".md") || entry.endsWith(".toml") || entry.endsWith(".prompt.md"));

      for (const entry of stale) {
        const file = resolve(dir, entry);

        if (!opts.dryRun) {
          rmSync(file, { force: true });
        }
      }

      files += stale.length;
      print(`  ${opts.dryRun ? "[dry-run] " : ""}${label}: removed ${stale.length} rule* command file(s) → ${dir}`);
      continue;
    }

    for (const { filename, content } of rendered) {
      const file = resolve(dir, filename);

      if (!opts.dryRun) {
        writeFileSync(file, content);
      }

      files += 1;
    }

    print(`  ${label}: wrote ${rendered.length} ${format} command file(s) → ${dir}`);
  }

  print(`agent-commands: ${opts.remove ? "removed" : "synced"} ${files} file(s) across ${targets.length} directory(ies)`);
}
