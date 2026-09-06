/** Agent-command target resolution, printing and syncing helpers. */

import { FORMAT_EXT, commandNames, renderAgentCommandFiles } from "../../core/agents/commands/index.js";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { print } from "./_shared.js";
import { resolve } from "node:path";
import { resolveCommandTargets } from "../../core/agents/command-targets/index.js";
function resolvedTargets(opts) {
  return resolveCommandTargets(opts.agent ? { agent: opts.agent } : { detectedOnly: true });
}

/**
 * Print the resolved command targets - `agent<TAB>format<TAB>scope<TAB>dir`, or
 * JSON with `--json`. Installer/uninstaller scripts consume this so they can
 * never drift from the registry.
 *
 * @param {{ agent?: string, json?: boolean }} opts
 */
function printCommandTargets(opts) {
  const targets = resolvedTargets(opts);

  if (opts.json) {
    print(JSON.stringify(targets, null, 2));

    return;
  }

  print(targets.map((t) => [t.agent, t.format, t.scope, t.dir].join("\t")).join("\n"));
}

/**
 * Write (or remove with `--remove`) the whole clean command set in every resolved
 * target directory, so a single call covers every agent/IDE on this machine.
 *
 * @param {{ agent?: string, remove?: boolean, dryRun?: boolean, json?: boolean }} opts
 */
function syncCommandTargets(opts) {
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

  print(
    `agent-commands: ${opts.remove ? "removed" : "synced"} ${files} file(s) across ${targets.length} directory(ies)`,
  );
}

/**
 * Generate (or remove) the clean `/rule-*` agent slash-command files for one
 * agent directory. Registry-driven (see {@link module:core/agent-commands}) so
 * the same ordered set is written for every agent.
 *
 * @param {{ dir?: string, format?: string, remove?: boolean, list?: boolean, force?: boolean, dryRun?: boolean }} opts
 */

export { resolvedTargets, printCommandTargets, syncCommandTargets, agentCommandsCommand };

function agentCommandsCommand(opts = {}) {
  if (opts.list) {
    print(commandNames().join("\n"));

    return;
  }

  if (opts.targets) {
    printCommandTargets(opts);

    return;
  }

  if (opts.sync) {
    syncCommandTargets(opts);

    return;
  }

  const format = opts.format || "args";

  if (!FORMAT_EXT[format]) {
    throw new Error(`Unknown --format "${format}". Use one of: ${Object.keys(FORMAT_EXT).join(", ")}.`);
  }

  if (!opts.dir) {
    throw new Error("agent-commands requires --dir <dir> (or --list).");
  }

  const dir = resolve(opts.dir);
  const files = renderAgentCommandFiles(format);

  let written = 0;
  let skipped = 0;
  let removed = 0;

  if (opts.remove) {
    for (const { filename } of files) {
      const file = resolve(dir, filename);

      if (existsSync(file)) {
        if (!opts.dryRun) {
          rmSync(file, { force: true });
        }

        removed += 1;
      }
    }

    print(`agent-commands: removed ${removed} file(s) from ${dir}`);

    return;
  }

  if (!opts.dryRun) {
    mkdirSync(dir, { recursive: true });
  }

  for (const { filename, content } of files) {
    const file = resolve(dir, filename);

    if (existsSync(file) && !opts.force) {
      skipped += 1;
      continue;
    }

    if (!opts.dryRun) {
      writeFileSync(file, content);
    }

    written += 1;
  }

  print(`agent-commands: wrote ${written}, skipped ${skipped} (${format}) → ${dir}`);
}
