

/** Agent-command target resolution, printing and syncing helpers. */

import { FORMAT_EXT, commandNames, renderAgentCommandFiles } from "../../core/agents/commands/index.js";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { print } from "./_shared.js";
import { resolve } from "node:path";
import { resolveCommandTargets } from "../../core/agents/command-targets/index.js";
import { syncCommandTargets } from "./_targets-sync.js";
/** Resolve the command targets for these options, detected-only by default. */
export function resolvedTargets(opts) {
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
 * Generate (or remove) the clean `/rule-mcp-*` agent slash-command files for one
 * agent directory. Registry-driven (see {@link module:core/agent-commands}) so
 * the same ordered set is written for every agent.
 *
 * @param {{ dir?: string, format?: string, remove?: boolean, list?: boolean, force?: boolean, dryRun?: boolean, only?: string[] }} opts
 */
function agentCommandsCommand(opts = {}) {
  if (opts.list) {
    // The selection applies here too: listing is how a person previews what an
    // install would write before writing it.
    print((opts.only ?? commandNames()).join("\n"));

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
  const files = renderAgentCommandFiles(format, opts.only ?? undefined);

  let written = 0;
  let skipped = 0;

  if (opts.remove) {
    let removed = 0;

    for (const { filename } of files) {
      const file = resolve(dir, filename);

      if (!existsSync(file)) {
        continue;
      }

      if (!opts.dryRun) {
        rmSync(file, { force: true });
      }

      removed += 1;
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

export { printCommandTargets, agentCommandsCommand };
export { syncCommandTargets } from "./_targets-sync.js";
