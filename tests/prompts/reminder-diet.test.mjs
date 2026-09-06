/**
 * Hardening 4.2: the workflow reminder is put on a diet.
 *
 * The flight recorder measured the contradiction this suite locks down: the
 * reminder appended to every result cost ~460 tokens a session while caveman
 * compression measurably saved ~0. A rule the model has already read nine times
 * is not worth re-sending on the tenth call, so the full contract is emitted
 * once per session and re-anchored every Nth call after that.
 *
 * Every case runs in its own process: the cadence counter is module state, and
 * a suite that shared it would assert on whatever the previous case left behind.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ENFORCEMENT = fileURLToPath(new URL("../../src/core/enforcement.js", import.meta.url));

/**
 * The pre-diet cost of this exact session, measured on the decoration path
 * before the change: 30 calls over 8 distinct tools, a reminder on every one of
 * them, 3820 tokens, ~127 per call. The target in the plan is a reduction above
 * 60 %, so this is the number the budget case divides.
 */
const BASELINE_TOKENS = 3820;
const SESSION_CALLS = 30;
const SESSION_TOOLS = [
  "pix_tool",
  "rule_tool_component",
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
function runSession(calls, environment = {}) {
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
          : (text.includes("## PIX WORKFLOW REMINDER") ? "terse" : "none"),
      );
    }
    process.stdout.write(JSON.stringify({ kinds, overhead }));
  `;

  return JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      env: { ...process.env, RULE_MCP_NO_AUTOUPDATE: "1", ...environment },
    }),
  );
}

test("the full contract is emitted once a session, not once per tool", () => {
  const { kinds } = runSession(12);
  assert.equal(kinds[0], "full", "the first result a session sees carries the whole contract");
  assert.equal(
    kinds.filter((kind) => kind === "full").length,
    1,
    "a rule already read does not become new again because a different tool answered",
  );
});

test("between re-anchors the reminder costs nothing at all", () => {
  const { kinds } = runSession(12);
  assert.deepEqual(
    kinds.slice(1, 4),
    ["none", "none", "none"],
    "the calls after the first carry no reminder until the cadence comes round",
  );
});

test("the reminder is re-anchored every Nth call, in its terse form", () => {
  const { kinds } = runSession(12);
  assert.equal(kinds[4], "terse", "the 5th call re-anchors");
  assert.equal(kinds[9], "terse", "and the 10th");
  assert.equal(kinds.filter((kind) => kind === "terse").length, 2, "twelve calls buy two re-anchors, not twelve");
});

test("the cadence is configurable, including down to every call and off", () => {
  const dense = runSession(6, { RULE_MCP_REMINDER_EVERY: "2" });
  assert.deepEqual(dense.kinds, ["full", "terse", "none", "terse", "none", "terse"], "N=2 re-anchors on even calls");

  const once = runSession(6, { RULE_MCP_REMINDER_EVERY: "0" });
  assert.deepEqual(
    once.kinds.slice(1),
    ["none", "none", "none", "none", "none"],
    "N=0 keeps the opening contract and never repeats it",
  );

  const bogus = runSession(6, { RULE_MCP_REMINDER_EVERY: "not-a-number" });
  assert.equal(bogus.kinds[4], "terse", "an unreadable value falls back to the default cadence, not to silence");
});

test("the opt-out still suppresses the reminder entirely", () => {
  const { kinds, overhead } = runSession(8, { RULE_MCP_NO_REMINDER: "1" });
  assert.ok(
    kinds.every((kind) => kind === "none"),
    "RULE_MCP_NO_REMINDER=1 means no reminder on any call",
  );
  assert.equal(overhead, 0, "suppressed means free");
});

test("a session pays less than 40 % of what the reminder used to cost", () => {
  const { overhead } = runSession(SESSION_CALLS);
  const reduction = (BASELINE_TOKENS - overhead) / BASELINE_TOKENS;
  assert.ok(
    reduction > 0.6,
    `reminder overhead must drop more than 60 % (was ${BASELINE_TOKENS}, now ${overhead}, ${Math.round(reduction * 100)} %)`,
  );
});

test("the diet cuts repetition, not substance", () => {
  const script = String.raw`
    import { decorateWorkflowReminder } from ${JSON.stringify(ENFORCEMENT)};
    const decorated = decorateWorkflowReminder("pix_tool", { content: [{ type: "text", text: "routed" }] });
    process.stdout.write(decorated.content.map((part) => part.text).join("\n"));
  `;
  const full = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    encoding: "utf8",
    env: { ...process.env, RULE_MCP_NO_AUTOUPDATE: "1" },
  });

  for (const rule of [
    /source of truth/i,
    /missing evidence means unknown/i,
    /minimal change/i,
    /rule_tool_process_adr/,
    /without being asked/i,
    /never spawn subagents/i,
    /rule_tool_check/,
    /every token saved is a token earned/i,
  ]) {
    assert.match(full, rule, `the opening contract must still carry ${rule}`);
  }
});
