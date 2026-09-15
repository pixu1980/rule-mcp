

/**
 * autoLogFields: one entry shape per logged tool, and what each arm falls back
 * to when the call it describes told it nothing.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { autoLogFields } from "../_auto-log-fields.js";

/** A tool result carrying one JSON text part, as the router returns it. */
const jsonResult = (value) => ({ content: [{ type: "text", text: JSON.stringify(value) }] });

test("a routing call records the prompt, the route and the runners-up", () => {
  const fields = autoLogFields(
    "pix_tool",
    { prompt: "build a react button" },
    jsonResult({
      route: "rule-frontend-react",
      confidence: 0.92,
      alternatives: [
        { route: "rule-frontend-vue", confidence: 0.4 },
        { route: "rule-ui-design-system", confidence: 0.3 },
        { route: "rule-styleguide-css", confidence: 0.2 },
        { route: "rule-styleguide-html", confidence: 0.1 },
      ],
    }),
  );

  assert.equal(fields.title, "Skill routing: build a react button");
  assert.equal(fields.tags, "tool, auto-log, routing");
  assert.deepEqual(fields.contextLines.slice(0, 2), ['Prompt: "build a react button"', "Routed to: **rule-frontend-react** (confidence: 0.92)"]);
  assert.match(fields.contextLines[2], /^Alternatives: /, "the runners-up are recorded");
  assert.equal(fields.contextLines[2].split(", ").length, 3, "only the top three runners-up are kept");
  assert.deepEqual(fields.decisionLines, ["Use `rule-frontend-react` for this task."]);
});

test("a routing call with nothing to parse falls back instead of throwing", () => {
  const unparseable = autoLogFields("pix_tool", {}, { content: [{ type: "text", text: "not json at all" }] });

  assert.equal(unparseable.title, "Skill routing: ", "an absent prompt leaves the title bare rather than undefined");
  assert.deepEqual(unparseable.contextLines, ['Prompt: ""', "Routed to: **unknown** (confidence: 0)"]);
  assert.equal(unparseable.contextLines.length, 2, "no alternatives line is invented");

  const empty = autoLogFields("pix_tool", {});
  assert.deepEqual(empty.contextLines, ['Prompt: ""', "Routed to: **unknown** (confidence: 0)"], "a missing result is the same as an empty one");

  const noAlternatives = autoLogFields("pix_tool", { prompt: "x" }, jsonResult({ route: "rule-ai", confidence: 1, alternatives: [] }));
  assert.equal(noAlternatives.contextLines.length, 2, "an empty alternatives list adds no line");
});

test("a long prompt is truncated in the body and again in the title", () => {
  const fields = autoLogFields("pix_tool", { prompt: "x".repeat(500) }, jsonResult({ route: "rule-ai" }));

  assert.equal(fields.contextLines[0].length, 'Prompt: ""'.length + 200, "the body keeps 200 characters");
  assert.equal(fields.title, `Skill routing: ${"x".repeat(80)}`, "the title keeps 80");
});

test("scaffold, detect and fix each record their own arguments", () => {
  const scaffold = autoLogFields("rule_tool_scaffold", { mode: "validate", file: "tsconfig.json" });
  assert.equal(scaffold.title, "Scaffold: validate tsconfig.json");
  assert.deepEqual(scaffold.contextLines, ["Scaffold operation: validate", "File: tsconfig.json"]);

  const detect = autoLogFields("rule_tool_detect", { path: "./app" }, jsonResult({ framework: "svelte" }));
  assert.equal(detect.title, "Framework detection for ./app");
  assert.deepEqual(detect.decisionLines, ["Use svelte tooling for this project."]);

  const fix = autoLogFields("rule_tool_fix", { mode: "apply", srcDir: "lib" });
  assert.equal(fix.title, "File tree fix: apply on .");
  assert.equal(fix.tags, "tool, auto-log, file-tree");
  assert.deepEqual(fix.contextLines, ["Mode: apply", "Source: lib"]);
});

test("each arm names its default when the call carried no arguments", () => {
  assert.equal(autoLogFields("rule_tool_scaffold", {}).title, "Scaffold: generate all files");
  assert.deepEqual(autoLogFields("rule_tool_scaffold", {}).contextLines, ["Scaffold operation: generate", "File: all"]);

  const detect = autoLogFields("rule_tool_detect", {}, { content: [{ type: "text", text: "<html>" }] });
  assert.equal(detect.title, "Framework detection for .", "the path defaults to the working directory");
  assert.deepEqual(detect.contextLines, ["Path: .", "Detected framework: unknown"], "an unparseable result is unknown, not a crash");

  assert.equal(autoLogFields("rule_tool_fix", {}).title, "File tree fix: lint on .");
});

test("any other tool gets the generic entry, with its arguments truncated", () => {
  const generic = autoLogFields("rule_tool_check", { action: "run" });

  assert.equal(generic.title, "Tool: rule_tool_check - run");
  assert.equal(generic.tags, "tool, auto-log");
  assert.deepEqual(generic.decisionLines, ["Tool executed successfully."]);

  assert.equal(autoLogFields("rule_tool_check", { mode: "strict" }).title, "Tool: rule_tool_check - strict", "mode stands in for action");
  assert.equal(autoLogFields("rule_tool_check", {}).title, "Tool: rule_tool_check - execute", "and execute stands in for both");

  const long = autoLogFields("rule_tool_check", { code: "y".repeat(500) });
  assert.equal(long.contextLines[1].length, "Args: ".length + 200, "the arguments are cut at 200 characters");
});
