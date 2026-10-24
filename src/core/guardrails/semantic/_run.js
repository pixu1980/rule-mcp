

/**
 * @module core/guardrails/semantic/run
 *
 * Run the advisory semantic rules over one body of code.
 *
 * The model is consulted only when there is a literal error message to judge.
 * Without an endpoint the family is skipped, not failed: a missing model is not
 * a code defect, and an advisory that blocks would train the caller to ignore
 * it. Every finding carries the model's probability in the message.
 */

import { decisionRuntime } from "../../decision/_runtime.js";
import { SEMANTIC_GUARDRAILS } from "./_rule.js";

const total = SEMANTIC_GUARDRAILS.length;

function skipped(skill, reason) {
  return {
    skill,
    enabled: false,
    total,
    advisoryCount: 0,
    advisory: [],
    allPass: true,
    summary: `⏩ Semantic guardrails skipped: ${reason}.`,
  };
}

/**
 * @param {string} code
 * @param {{ skill?: string }} [options]
 * @returns {Promise<{
 *   skill: string,
 *   enabled: boolean,
 *   total: number,
 *   advisoryCount: number,
 *   advisory: Array<object>,
 *   allPass: true,
 *   summary: string,
 * }>}
 */
export async function checkSemantic(code, { skill = "rule-mcp-process-ai" } = {}) {
  const candidates = SEMANTIC_GUARDRAILS.flatMap((rule) => rule.messages(code).map((message) => ({ rule, message })));

  if (candidates.length === 0) {
    return {
      skill,
      enabled: true,
      total,
      advisoryCount: 0,
      advisory: [],
      allPass: true,
      summary: "✅ No error message to judge.",
    };
  }

  let runtime;

  try {
    runtime = await decisionRuntime(candidates.map((candidate) => candidate.message).join("\n"));
  } catch {
    runtime = null;
  }

  if (!runtime) {
    return skipped(skill, "no decision endpoint configured");
  }

  const advisory = [];

  try {
    for (const rule of SEMANTIC_GUARDRAILS) {
      const messages = rule.messages(code);

      if (messages.length === 0) {
        continue;
      }

      const answer = await runtime.supervisor.ask(messages.join("\n"), {
        message: { type: "noul", instructions: rule.question },
      });
      const outcome = rule.evaluate(answer);

      if (!outcome.pass) {
        advisory.push({
          id: rule.id,
          label: rule.label,
          failCount: 1,
          detail: [`model probability ${outcome.probability.toFixed(2)} that ${rule.claim}`, ...messages.slice(0, 3)],
          suggestion: rule.suggestion,
        });
      }
    }
  } catch {
    return skipped(skill, "decision endpoint unavailable");
  }

  return {
    skill,
    enabled: true,
    total,
    advisoryCount: advisory.length,
    advisory,
    allPass: true,
    summary: advisory.length > 0 ? `✅ No failing checks; ${advisory.length} advisory finding(s) - reported, not failing.` : "✅ All semantic guardrails pass.",
  };
}
