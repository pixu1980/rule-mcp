/**
 * Hardening 4.2: the workflow reminder is put on a diet.
 *
 * The flight recorder measured the contradiction this suite locks down: the
 * reminder appended to every result cost ~460 tokens a session while compression
 * compression measurably saved ~0. A rule the model has already read nine times
 * is not worth re-sending on the tenth call, so the full contract is emitted
 * once per session and re-anchored every Nth call after that.
 *
 * Every case runs in its own process: the cadence counter is module state, and
 * a suite that shared it would assert on whatever the previous case left behind.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Server code resolves `@src/*` through a hook (ADR 089); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../scripts/alias-hook.mjs", import.meta.url));

export const ENFORCEMENT = fileURLToPath(new URL("../../../src/core/enforcement/index.js", import.meta.url));

/**
 * The pre-diet cost of this exact session, measured on the decoration path
 * before the change: 30 calls over 8 distinct tools, a reminder on every one of
 * them, 3820 tokens, ~127 per call. The target in the plan is a reduction above
 * 60 %, so this is the number the budget case divides.
 */
export const BASELINE_TOKENS = 3820;
export const SESSION_CALLS = 30;
export const SESSION_TOOLS = [
  "rule_tool",
  "rule_tool_styleguide",
  "rule_tool_check",
  "rule_tool_search",
  "rule_tool_plan",
  "rule_tool_gateway",
  "rule_tool_detect",
  "rule_tool_process_adr",
];

/**
 * Run one session in a fresh process and report what the model would have read.
 *
 * @param {number} calls - how many tool results to decorate
 * @param {object} [environment] - env overrides for this session
 * @returns {{kinds: string[], overhead: number}} per-call reminder kind and the token cost
 */
export function runSession(calls, environment = {}) {
  const script = String.raw`
    import { decorateWorkflowReminder } from ${JSON.stringify(ENFORCEMENT)};
    const tools = ${JSON.stringify(SESSION_TOOLS)};
    const core = "routed: rule-frontend-react\nsections: forms, a11y\n".repeat(8);
    const kinds = [];
    let overhead = 0;
    for (let index = 0; index < ${calls}; index += 1) {
      const decorated = decorateWorkflowReminder(tools[index % tools.length], {
        content: [{ type: "text", text: core }],
      });
      const text = decorated.content.map((part) => part.text).join("");
      overhead += Math.ceil((text.length - core.length) / 4);
      kinds.push(
        text.includes("Missing evidence means unknown")
          ? "full"
          : (text.includes("## RULE-MCP WORKFLOW REMINDER") ? "terse" : "none"),
      );
    }
    process.stdout.write(JSON.stringify({ kinds, overhead }));
  `;

  return JSON.parse(
    execFileSync(process.execPath, ["--import", ALIAS_HOOK, "--input-type=module", "-e", script], {
      encoding: "utf8",
      env: { ...process.env, RULE_MCP_NO_AUTOUPDATE: "1", ...environment },
    }),
  );
}
