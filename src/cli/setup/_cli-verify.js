/**
 * @module cli/setup/cli-verify
 *
 * The install's own proof: the `rule-mcp` on PATH answers.
 *
 * A shim that exists is not a shim that works - it pins the absolute path of
 * the checkout it was written from, so moving the repository leaves one on PATH
 * that crashes on launch (ADR 046). This runs the CLI for real: `--version`
 * first, then a full `tools list` and a `doctor`, so an install that would
 * leave a dead launcher fails instead of reporting success.
 */

import { tryExec } from "../../shared/index.js";
import { shimPath, shimWorks, skipGlobalLink } from "./_shim.js";

/**
 * Verify the global CLI.
 *
 * @param {{ path?: string, works?: Function, exec?: Function, skip?: boolean }} [options]
 * @returns {{ status: "ok"|"missing"|"broken"|"skipped", path?: string, reason?: string, lines?: string[] }}
 */
export function verifyGlobalCli({ path = shimPath(), works = shimWorks, exec = tryExec, skip = skipGlobalLink() } = {}) {
  if (skip) {
    return { status: "skipped", reason: "RULE_MCP_SKIP_GLOBAL_LINK=1" };
  }

  if (!path) {
    return { status: "missing", reason: "rule-mcp is not on PATH after the install" };
  }

  if (!works()) {
    return { status: "broken", path, reason: "the rule-mcp on PATH does not answer --version" };
  }

  const tools = exec("rule-mcp tools list", { timeout: 60_000 }).trim();

  if (!tools) {
    return { status: "broken", path, reason: "rule-mcp tools list answered nothing" };
  }

  const doctor = exec("rule-mcp doctor", { timeout: 120_000 }).trim();

  if (!doctor) {
    return { status: "broken", path, reason: "rule-mcp doctor answered nothing" };
  }

  return { status: "ok", path, lines: [`tools list: ${tools.split("\n", 1)[0]}`, `doctor: ${doctor.split("\n", 1)[0]}`] };
}
