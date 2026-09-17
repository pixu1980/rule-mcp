

/** @module core/agents/command-targets/resolve */

import { defaultContext } from "./_context.js";
import { COMMAND_TARGETS } from "./_registry.data.js";

/** Agents that receive clean command files, sorted. */
export function agentsWithCleanCommands() {
  return [...new Set(COMMAND_TARGETS.map((target) => target.agent))].sort((a, b) => a.localeCompare(b));
}

/**
 * Whether this agent's host namespaces MCP prompts AND gets clean command files
 * instead - i.e. whether the server should hide its prompts for that host.
 *
 * @param {string} agent
 * @returns {boolean}
 */
export function suppressesMcpPrompts(agent) {
  return COMMAND_TARGETS.some((target) => target.agent === agent && target.namespacedPrompts);
}

/**
 * The agents a filter names: one name, or the comma-separated list the install
 * plan builds from its selected agents. Null when no filter was given.
 *
 * @param {string|string[]} [agent]
 * @returns {Set<string>|null}
 */
const requestedAgents = (agent) => {
  if (!agent) {
    return null;
  }

  return new Set(
    String(agent)
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );
};

/**
 * Resolve command targets to concrete directories.
 *
 * @param {object} [options]
 * @param {string|string[]} [options.agent] - only these agents (a
 *   comma-separated list or an array); their gates are skipped, because an
 *   explicit install targets the agent even if nothing is detected yet
 * @param {boolean} [options.detectedOnly] - only agents present on this machine
 * @param {string} [options.home] @param {string} [options.cwd]
 * @param {string} [options.platform] @param {object} [options.env]
 * @param {(path: string) => boolean} [options.exists]
 * @param {(path: string) => string[]} [options.listDir]
 * @returns {Array<{ agent: string, label: string, format: string, scope: string, dir: string }>}
 */
export function resolveCommandTargets(options = {}) {
  const base = { ...defaultContext(), ...options };
  const wanted = requestedAgents(options.agent);
  const resolved = [];

  for (const target of COMMAND_TARGETS) {
    if (wanted && !wanted.has(target.agent)) {
      continue;
    }
    // An explicit install forces the named agents' user-level directories into
    // existence; project directories are never created on spec, and a sweep over
    // every agent (detectedOnly) only fills what is already there.
    const ctx = { ...base, force: Boolean(options.agent) && !options.detectedOnly && target.scope === "global" };

    if (options.detectedOnly && !target.detect(ctx)) {
      continue;
    }

    for (const dir of target.dirs(ctx)) {
      resolved.push({ agent: target.agent, label: target.label, format: target.format, scope: target.scope, dir });
    }
  }

  return resolved;
}
