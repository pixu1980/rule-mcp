import { strict as assert } from "node:assert";
import { readdirSync } from "node:fs";
import { checkCode } from "../../src/core/guardrails.js";
import { loadAllSkills } from "../../src/core/skills.js";
import { addBeforeToolHook, addPostToolHook, callTool, listTools, registerTool } from "../../src/tools/router.js";

// Hermetic: this suite asserts deterministic tool behavior and side effects,
// not the result cache (which has its own test). Disable caching here.
process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1"; // hermetic: no real git ops in tests

console.log("enforcement pipeline test");

const adrCount = () => readdirSync("docs/adr").filter((name) => /^\d{3}-/.test(name)).length;
const adrsBefore = adrCount();

let isHandlerCalled = false;
registerTool({
  name: "test_enforced",
  description: "Test-only tool for mandatory preprocessing and postprocessing.",
  handler: async (arguments_) => {
    isHandlerCalled = true;
    return { content: [{ type: "text", text: arguments_.value }] };
  },
});
addBeforeToolHook("test_enforced", async (_name, arguments_) => ({ ...arguments_, value: arguments_.value.trim() }));
addPostToolHook("test_enforced", async (_name, _arguments, result) => ({
  ...result,
  content: [...result.content, { type: "text", text: "postprocessed" }],
}));

const processed = await callTool("test_enforced", { value: "  clean  " });
assert.ok(isHandlerCalled, "preprocessing must continue into handler");
assert.equal(processed.content[0].text, "clean", "preprocessor must transform arguments before handler");
assert.equal(processed.content[1].text, "postprocessed", "postprocessor must transform result before return");

let isBlockedHandlerCalled = false;
registerTool({
  name: "test_blocked",
  description: "Test-only tool that mandatory preprocessing must block.",
  handler: async () => {
    isBlockedHandlerCalled = true;
    return { content: [{ type: "text", text: "unsafe" }] };
  },
});
addBeforeToolHook("test_blocked", async () => {
  throw new Error("policy denied");
});
const blocked = await callTool("test_blocked", {});
assert.equal(blocked.isError, true, "preprocessor failure must fail closed");
assert.equal(isBlockedHandlerCalled, false, "blocked handler must never execute");
assert.match(blocked.content[0].text, /policy denied/, "blocked response must explain policy failure");

await loadAllSkills();
const routed = await callTool("pix_tool", { prompt: "React accessible form" });
assert.equal(routed.isError, undefined, "valid router request must pass enforcement");
assert.equal(routed._meta?.pixEnforcement?.preprocessed, true, "result metadata must prove preprocessing");
assert.equal(routed._meta?.pixEnforcement?.postprocessed, true, "result metadata must prove postprocessing");
assert.ok(
  routed.content.some((item) => item.text?.includes("PIX WORKFLOW REMINDER")),
  "model-visible contract must be appended",
);
const route = JSON.parse(routed.content[0].text);
assert.ok(route.route === "none" || route.skills_available.includes(route.route), "router must not invent skill names");
await new Promise((resolve) => setTimeout(resolve, 50));
assert.equal(adrCount(), adrsBefore, "test tool calls must not create ADR files");
for (const toolName of route.next_tools) {
  assert.ok(
    listTools().some((tool) => tool.name === toolName),
    `router must not invent tool ${toolName}`,
  );
}

const emptyPrompt = await callTool("pix_tool", { prompt: " ".repeat(3) });
assert.equal(emptyPrompt.isError, true, "blank routing prompt must fail closed before execution");

const placeholderReport = checkCode("rule-frontend-react", "export function Demo() { /* TODO */ }");
assert.ok(
  placeholderReport.failed.some((item) => item.id === "no-placeholder-implementation"),
  "TODO code must fail guardrails",
);

const suppressedReport = checkCode("rule-frontend-react", "// @ts-ignore\ntry { work(); } catch {}\n");
assert.ok(
  suppressedReport.failed.some((item) => item.id === "no-suppressed-errors"),
  "suppressed errors must fail guardrails",
);

const dependencyReport = checkCode(
  "rule-frontend-react",
  'import invented from "invented-sdk";\nexport function Demo() { return invented; }',
  { allowedDependencies: ["react"] },
);
assert.ok(
  dependencyReport.failed.some((item) => item.id === "verified-dependencies-only"),
  "unknown dependency must fail when manifest context exists",
);

const failedCheck = await callTool("rule_tool_check", {
  skill: "rule-frontend-react",
  code: "export function Demo() { /* TODO */ }",
});
assert.equal(failedCheck.isError, true, "rule_tool_check must block downstream use when guardrails fail");

const dependencyCheck = await callTool("rule_tool_check", {
  skill: "rule-frontend-react",
  code: 'import invented from "invented-sdk";\nexport function Demo() { return invented; }',
  allowedDependencies: ["react"],
});
assert.ok(
  dependencyCheck._meta?.pixGuardrails?.failed?.some((item) => item.id === "verified-dependencies-only"),
  "rule_tool_check MCP schema must pass manifest dependencies into guardrail context",
);

// ── Token-saving: workflow reminder is full once per tool, terse thereafter, and
//    fully suppressible via RULE_MCP_NO_REMINDER (Phase 4.1). ──
const secondRoute = await callTool("pix_tool", { prompt: "Vue button component" });
const secondReminder = secondRoute.content.find((item) => item.text?.includes("PIX WORKFLOW REMINDER"));
assert.ok(secondReminder, "repeat call must still carry a (terse) reminder");
assert.ok(
  !secondReminder.text.includes("Missing evidence means unknown"),
  "repeat call reminder must be the terse one-liner, not the full contract",
);

process.env.RULE_MCP_NO_REMINDER = "1";
const suppressed = await callTool("pix_tool", { prompt: "React accessible form" });
assert.ok(
  suppressed.content.every((item) => !item.text?.includes("PIX WORKFLOW REMINDER")),
  "RULE_MCP_NO_REMINDER=1 must suppress the model-visible reminder",
);
assert.equal(
  suppressed._meta?.pixEnforcement?.postprocessed,
  true,
  "suppression must not disable enforcement metadata",
);
delete process.env.RULE_MCP_NO_REMINDER;

console.log("  ✅ preprocessing and postprocessing fail closed; hallucination guardrails enforced");
console.log("  ✅ workflow reminder is full-once-then-terse and suppressible");
