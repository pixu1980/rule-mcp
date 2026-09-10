

/**
 * renderGatewayReply: every reply shape - truncated evidence, pass/fail
 * verdicts, content vs files receipts, next-tool dedupe - driven by crafted
 * cores so no router or skills are involved.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { renderGatewayReply } from "../_render.js";

/** A passing core with one matched section and a long evidence block. */
const fullCore = (overrides = {}) => ({
  effectiveRoute: "rule-frontend-react",
  confidence: 0.5,
  matchedSections: ["layout"],
  routeNextTools: ["rule_tool_react", "rule_tool_check"],
  originalRoute: undefined,
  evidence: "rule: " + "x".repeat(8500),
  checkResult: { allPass: true, failCount: 0, passCount: 9, total: 9, failed: [] },
  ...overrides,
});

test("a passing core with files renders evidence, truncation and a files receipt", () => {
  const { lines, receipt, response } = renderGatewayReply(
    fullCore(),
    { code: "x" },
    [
      { path: "a.js", content: "1" },
      { path: "b.js", content: "2" },
    ],
    [],
  );

  assert.match(lines.join("\n"), /## Route: rule-frontend-react \(confidence: 50%\)/, "the route line renders the rounded confidence");
  assert.match(lines.join("\n"), /Matched sections:/, "the matched sections render");
  assert.match(lines.join("\n"), /## Evidence/, "evidence shows for a primary skill");
  assert.match(lines.join("\n"), /truncated/, "evidence over 8000 chars is truncated");
  assert.match(lines.join("\n"), /across 2 file\(s\)/, "the pass line names the file count");
  assert.match(lines.join("\n"), /Bound to these exact paths/, "files receipts bind paths");
  assert.ok(receipt, "a receipt is minted");
  assert.equal(response.receipt_binding, "files", "the binding is files");
  assert.equal(response.evidence_loaded, true, "evidence loaded flag is set");
});

test("a short evidence block is not truncated", () => {
  const { lines } = renderGatewayReply(fullCore({ evidence: "short" }), {}, null, []);
  assert.doesNotMatch(lines.join("\n"), /truncated/, "short evidence passes through");
});

test("a passing code-only core mints a content receipt", () => {
  const { lines, receipt, response } = renderGatewayReply(fullCore(), { code: "const a = 1;" }, null, []);

  assert.doesNotMatch(lines.join("\n"), /across /, "no file count without files");
  assert.match(lines.join("\n"), /Content-only receipt/, "content receipts are explained");
  assert.ok(receipt, "a receipt is still minted");
  assert.equal(response.receipt_binding, "content", "the binding is content");
});

test("a failing verdict renders every failure with and without file labels", () => {
  const core = fullCore({
    checkResult: {
      allPass: false,
      failCount: 2,
      passCount: 0,
      total: 2,
      failed: [
        { id: "fp-no-emdash", label: "no em dashes", suggestion: "replace with a hyphen", file: "src/x.js" },
        { id: "js-if-braces", label: "braces on if", suggestion: "add braces" },
      ],
    },
  });
  const { lines, receipt, response } = renderGatewayReply(core, { code: "bad" }, [{ path: "src/x.js", content: "bad" }], []);
  const ui = lines.join("\n");
  assert.match(ui, /2 guardrails FAIL/, "the fail line names the count");
  assert.match(ui, /\(src\/x\.js\)/, "a file-named failure renders its path");
  assert.match(ui, /js-if-braces/, "a nameless failure still renders the rule id");
  assert.equal(receipt, null, "no receipt on failure");
  assert.equal(response.receipt_binding, undefined, "no binding without a receipt");
  assert.match(ui, /Fix failures, then run pix_gateway/, "the next-steps hint asks for a recheck");
});

test("an unrouteable core renders no evidence and a fallback check title", () => {
  const core = {
    effectiveRoute: undefined,
    confidence: 0,
    matchedSections: [],
    routeNextTools: [],
    evidence: "",
    checkResult: { allPass: true, failCount: 0, passCount: 1, total: 1, failed: [] },
  };
  const { lines } = renderGatewayReply(core, { code: "const a = 1;" }, null, []);

  assert.doesNotMatch(lines.join("\n"), /## Evidence/, "no evidence without a primary skill");
  assert.match(lines.join("\n"), /## Guardrail Check/, "the check still renders");
  assert.match(lines.join("\n"), /Route: undefined/, "the unrouteable route is reported as-is");
});

test("next tools dedupe and cap at five, with an empty tool list tolerated", () => {
  const core = (next, overrides = {}) => ({ ...fullCore(), routeNextTools: next, ...overrides });
  const { response: withList } = renderGatewayReply(core(["pix_gateway", "pix_gateway", "pix_apply", "pix_search", "rule_tool_check", "rule_tool_render"]), {}, null, []);
  const { response: withoutList } = renderGatewayReply(core(), {}, null, []);

  assert.equal(withList.next_tools.length, 5, "the list is capped");
  assert.deepEqual(withList.next_tools.slice(0, 2), ["pix_gateway", "pix_apply"], "duplicates collapse");
  assert.ok(withoutList.next_tools.includes("pix_apply"), "a missing tool list still carries the defaults");
});
