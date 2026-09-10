

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
import { commandsTask, dockerTask, doctorTask, gitHookTask, rulesTask, serviceTask, skillsTask } from "./_task-extras.js";

/**
 * @param {{ agents?: string[], mode?: string, extras?: object, force?: boolean, context?: object }} answers
 * @returns {Array<{ id: string, title: string, detail: string, run: Function }>}
 */
export function buildInstallPlan({ agents = [], mode = "stdio", extras = {}, force = false, context = {} } = {}) {
  const plan = [runtimeHomeTask()];

  if (context.hasLocalBin) {
    plan.push(shimTask(context.localBin));
  }

  plan.push(...agents.map((agent) => agentInstallTask(agent, mode, force)));

  if (extras.rules) {
    plan.push(rulesTask());
  }

  if (extras.commands) {
    plan.push(commandsTask(force));
  }

  if (extras.skills) {
    plan.push(skillsTask());
  }

  if (extras.gitHook) {
    plan.push(gitHookTask());
  }

  if (mode === "daemon" && extras.service) {
    plan.push(serviceTask());
  }

  if (mode === "docker") {
    plan.push(dockerTask());
  }

  if (extras.doctor) {
    plan.push(doctorTask());
  }

  return plan;
}
