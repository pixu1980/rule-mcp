/**
 * Hardening 4.1 (F-A1): the guardrails must not fail idiomatic code.
 *
 * The 2026-09-03 baseline: 79 of 79 files under src/ failed, every one of them
 * on the same handful of rules. A guardrail product whose own source cannot
 * pass its checks teaches everyone downstream to ignore the output, so each
 * case below is paired - the idiom must pass, the real violation must still
 * fail. A fix that only silences the rule would pass the first assertion and
 * fail the second.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { checkCode } from "../src/core/guardrails.js";

const rule = (id, code, fileName = "sample.js") =>
  checkCode("rule-styleguide-javascript", code, { fileName }).failed.find((f) => f.id === id);

test("jsdoc-required sees a JSDoc block longer than 200 characters", () => {
  const documented = `/**
 * Start the MCP server.
 * Loads skills then starts the server with the chosen transport, which is a
 * sentence written here purely to push this block past two hundred characters
 * so the detector has to look at adjacency instead of a fixed window.
 *
 * @param {{ transport?: string, port?: number }} [opts] - transport and port
 * @returns {Promise<void>}
 */
export async function serveCommand(opts = {}) {
  return opts;
}
`;
  assert.equal(rule("jsdoc-required", documented), undefined, "a documented export must pass");
  assert.ok(rule("jsdoc-required", "export function bare() {\n  return 1;\n}\n"), "an undocumented export must fail");
});

test("js-blank-lines-blocks accepts block scaffolding as a separator", () => {
  const idiomatic = `function f(previous) {
  try {
    return work();
  } finally {
    if (previous === undefined) {
      cleanup();
    } else {
      restore(previous);
    }
  }
}
`;
  assert.equal(rule("js-blank-lines-blocks", idiomatic), undefined, "} finally { is not code needing separation");
  const crowded = `function f() {
  const a = compute();
  if (a) {
    use(a);
  }
}
`;
  assert.ok(rule("js-blank-lines-blocks", crowded), "a block glued to a statement still fails");
});

test("js-if-braces ignores a call inside the condition", () => {
  const idiomatic = `function f(n) {
  if (Number.isFinite(n) && n > 0) {
    return n;
  }

  return 0;
}
`;
  assert.equal(rule("js-if-braces", idiomatic), undefined, "a call in the condition is not a missing brace");
  assert.ok(rule("js-if-braces", "if (a) return 1;\n"), "a braceless if still fails");
});

test("js-no-inline-blocks ignores destructuring in a for header", () => {
  const idiomatic = `function f(targets) {
  for (const { label, format, dir } of targets) {
    install(label, format, dir);
  }
}
`;
  assert.equal(rule("js-no-inline-blocks", idiomatic), undefined, "destructuring is not an inline block");
  assert.ok(rule("js-no-inline-blocks", "if (a) { b(); }\n"), "a real inline block still fails");
});

test("js-single-line-method does not treat if as a method", () => {
  const idiomatic = `class A {
  run(x) {
    if (x) {
      return 1;
    }

    return 0;
  }
}
`;
  assert.equal(rule("js-single-line-method", idiomatic), undefined, "if is a keyword, not a method name");
  assert.ok(rule("js-single-line-method", "class A {\n  run() { return 1; }\n}\n"), "a real one-liner still fails");
});

test("js-const-top accepts a group of arrow-function constants", () => {
  const idiomatic = `const print = (v) => process.stdout.write(v);
const printJson = (v) => print(JSON.stringify(v));
const parseJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

export function use() {
  return parseJson("{}");
}
`;
  assert.equal(rule("js-const-top", idiomatic), undefined, "a function body is not code after the declarations");
});

test("barrel-file-tree accepts an index that exports its own API", () => {
  const named = `/** @module prompts */
export function listPrompts() {
  return [];
}
`;
  assert.equal(rule("barrel-file-tree", named, "index.js"), undefined, "named exports are a public API too");
  assert.ok(rule("barrel-file-tree", "const x = 1;\n", "index.js"), "an index that exports nothing still fails");
});

test("a11y-test-required does not demand Playwright from a server module", () => {
  const server = `/** @module core/telemetry */
export function record(event) {
  return event;
}
`;
  assert.equal(rule("a11y-test-required", server, "telemetry.js"), undefined, "a module with no UI is not a UI test");
});

test("data-part-naming ignores markup that lives inside a string", () => {
  const generator = `/** @module gen */
export function template(name) {
  return \`<div>\${name}</div>\`;
}
`;
  assert.equal(rule("data-part-naming", generator, "gen.js"), undefined, "a generated sample is data, not markup");
});
