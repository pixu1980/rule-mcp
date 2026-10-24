

/**
 * @module cli/setup/plan-install
 *
 * Assembling the install plan from the wizard's answers.
 *
 * Order matters: the runtime home and the shim come first because the agent
 * writes reference the launcher, and the health check comes last because it
 * is the only step that reports on all the others.
 */

import { agentInstallTask, runtimeHomeTask, shimTask } from "./_task-core.js";
import { commandsTask, dockerTask, doctorTask, rulesTask, serviceTask, skillsTask } from "./_task-extras.js";
import { skillsRemovalTask } from "./_task-remove.js";
import { cliVerifyTask } from "./_task-cli.js";

/**
 * @param {{ agents?: string[], mode?: string, extras?: object, force?: boolean, context?: object, selection?: object|null, minimal?: boolean, surface?: object|null }} answers
 * @returns {Array<{ id: string, title: string, detail: string, run: Function }>}
 */
export function buildInstallPlan({ agents = [], mode = "stdio", extras = {}, force = false, context = {}, selection = null, minimal, surface } = {}) {
  const plan = [runtimeHomeTask()];

  if (context.hasLocalBin) {
    plan.push(shimTask(context.localBin));
  }

  // The guard hooks are not a step of their own: they are written by the
  // Claude installer, so declining them is an argument to that install rather
  // than a task the plan can leave out. `extras` only ever carries the steps
  // that were kept, so the test is presence - `!== false` was true for an
  // absent key, which made the hooks impossible to decline.
  plan.push(...agents.map((agent) => agentInstallTask(agent, mode, force, extras.hooks === true, minimal, surface)));

  if (extras.rules) {
    plan.push(rulesTask(agents));
  }

  if (extras.commands) {
    plan.push(commandsTask(force, agents, selection));
  }

  if (extras.skills) {
    plan.push(skillsTask());
  } else {
    // The step owns the skill directories, so not selecting it means absent:
    // reconcile away whatever an earlier install copied, or the host keeps
    // discovering `/skill:rule-mcp-*` the user did not ask for. The task reports
    // "nothing to remove" when there is nothing to reconcile.
    plan.push(skillsRemovalTask());
  }

  if (mode === "daemon" && extras.service) {
    plan.push(serviceTask());
  }

  if (mode === "docker") {
    plan.push(dockerTask());
  }

  // The install proves its own launcher before it reports success: a shim on
  // PATH that does not answer is an install that failed, not a warning.
  plan.push(cliVerifyTask());

  if (extras.doctor) {
    plan.push(doctorTask());
  }

  return plan;
}
