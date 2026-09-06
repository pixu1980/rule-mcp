// Auto-split from src/cli/commands.js - see ./commands/index.js
/** Doctor, skills reload, self-update, fix and completions commands. */

import { callTool } from "../../tools/router.js";
import { formatDoctorTerminal, runDoctor } from "../doctor.js";
import { generateCompletions } from "../completions.js";
import { loadAllSkills } from "../../core/skills.js";
import { print, printJson } from "./shared.js";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
async function doctorCommand(options = {}) {
  await loadAllSkills();
  const telemetry = typeof options === "boolean" ? options : !!options.telemetry;
  const isJson = typeof options === "object" && !!options.json;
  const jsonOut = typeof options === "object" ? options.jsonOut : undefined;
  const report = await runDoctor(telemetry);

  if (jsonOut) {
    writeFileSync(resolve(jsonOut), JSON.stringify(report, null, 2) + "\n");
  }

  if (isJson) {
    printJson(report);

    return;
  }

  print(formatDoctorTerminal(report));

  if (jsonOut) {
    print(`JSON exported to ${resolve(jsonOut)}`);
  }
}

/**
 * Reload skills from disk (force flush the cache).
 */
async function skillsReloadCommand() {
  await loadAllSkills(true);
  print("Skills reloaded");
}

/**
 * Force a self-update from the upstream git repo (fast-forward only).
 * Prints a human-readable report.
 */
async function updateCommand() {
  const { runSelfUpdate, buildBanner, scheduleRestartIfNeeded } = await import("../core/self-update.js");
  const result = await runSelfUpdate({ reloadSkills: false });
  const banner = buildBanner(result);

  if (banner) {
    print(banner);
  } else if (result.updated === false && !result.skipped) {
    print("✅ Already up to date.");
  }

  if (result.skipped) {
    print(`Skipped: ${result.reason}${result.note ? ` - ${result.note}` : ""}`);
  }

  const restart = scheduleRestartIfNeeded(result, () => {});

  if (restart) {
    print(restart);
  }
}

/**
 * Validate and auto-fix project file tree structure.
 * Delegates to the pix_fix MCP tool.
 *
 * @param {{ dir?: string, srcDir?: string, mode?: string, dryRun?: boolean }} opts
 */
async function fixCommand(opts = {}) {
  await loadAllSkills();
  const result = await callTool("pix_fix", {
    path: opts.dir || ".",
    srcDir: opts.srcDir || "src",
    mode: opts.mode || "lint",
    dryRun: opts.dryRun !== false,
  });
  print(result.content[0].text);
}

/**
 * Generate shell completion script.
 *
 * @param {{ shell?: string }} opts
 */
function completionsCommand(opts = {}) {
  const shell = opts.shell || "zsh";
  const script = generateCompletions(shell);

  print(script);
}

export { doctorCommand, skillsReloadCommand, updateCommand, fixCommand, completionsCommand };
