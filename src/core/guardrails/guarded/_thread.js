

/**
 * @module core/guardrails-worker-thread
 *
 * Worker side of the guarded checkCode path (hardening 1.2). Loads the skill
 * set once, then answers { id, skillName, code, context } messages with
 * { id, result }. The host owns the timeout: a runaway pattern here is
 * terminated from outside, which is the whole point of the thread boundary.
 *
 * RULE_MCP_TEST_SLOW_CHECK_MS busy-waits before checking - the kill
 * switch tests need a deterministic runaway without shipping one in a rule.
 */

import { parentPort } from "node:worker_threads";

import { checkCode } from "../engine/index.js";
import { loadAllSkills } from "../../skills/index.js";

await loadAllSkills();

parentPort.on("message", ({ id, skillName, code, context }) => {
  const slow = Number(process.env.RULE_MCP_TEST_SLOW_CHECK_MS);

  if (Number.isFinite(slow) && slow > 0) {
    const end = Date.now() + slow;

    while (Date.now() < end) {
      /* deliberate busy-wait: simulates catastrophic backtracking */
    }
  }

  let result;

  try {
    result = checkCode(skillName, code, context);
  } catch (error) {
    result = { workerError: error.message };
  }

  parentPort.postMessage({ id, result });
});

parentPort.postMessage({ ready: true });
