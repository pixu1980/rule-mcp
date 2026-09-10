/**
 * @module cli/setup/plan-uninstall
 *
 * Assembling the uninstall plan from the groups the user kept selected.
 *
 * Reverse order of the install plan: agents lose their config first and the
 * shim goes last, so nothing is left pointing at a launcher that has already
 * been deleted.
 */

import { agentRemovalTask, shimRemovalTask } from "./_task-core.js";
import { commandsRemovalTask, gitHookRemovalTask, profilesTask, purgeTask, rulesRemovalTask, serviceRemovalTask } from "./_task-remove.js";

const GROUP_TASKS = {
  rules: rulesRemovalTask,
  commands: commandsRemovalTask,
  "git-hook": gitHookRemovalTask,
  service: serviceRemovalTask,
  profiles: profilesTask,
  shim: shimRemovalTask,
};

/** The order removal groups run in, whatever order they were selected. */
const GROUP_ORDER = ["rules", "commands", "git-hook", "service", "profiles", "shim"];

/**
 * @param {{ agents?: string[], groups?: string[], purgeIds?: string[] }} answers
 * @returns {Array<{ id: string, title: string, detail: string, run: Function }>}
 */
export function buildUninstallPlan({ agents = [], groups = [], purgeIds = [] } = {}) {
  const selected = new Set(groups);
  const plan = selected.has("agents") ? agents.map((agent) => agentRemovalTask(agent)) : [];

  for (const group of GROUP_ORDER) {
    if (selected.has(group)) {
      plan.push(GROUP_TASKS[group]());
    }
  }

  if (purgeIds.length > 0) {
    plan.push(purgeTask(purgeIds));
  }

  return plan;
}
