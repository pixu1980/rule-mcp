// test/architect-web-generator-parity.test.mjs
// Guards that server.mjs no longer carries its own generator: its exported
// generation must be the shared one. We assert by importing the module's
// generation indirectly is not possible (server has no exports), so instead
// assert the source no longer defines an inline generator.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../skills/rule-architect-web/server.mjs", import.meta.url), "utf-8");

test("architect-web server imports the canonical generator", () => {
  assert.match(SRC, /from\s+["']\.\.\/rule-architect\/generator\.mjs["']/);
});

test("architect-web server has no inline generator copy", () => {
  assert.doesNotMatch(SRC, /function\s+generateContextContent\s*\(/, "inline generateContextContent must be removed");
  assert.doesNotMatch(SRC, /function\s+generateContext\s*\(/, "inline generateContext must be removed");
});

// ---------------------------------------------------------------------------
// Phase 5: both servers must hand the generator the SAME wizard spec.
// ---------------------------------------------------------------------------
// context-server.mjs — the server the MCP `pix_architect` tool actually
// spawns — passed `null` as the spec. normalizeAnswers needs it to resolve
// select option keys to human labels (and for DERIVED's STACK_NAME), and
// shouldEmit needs it to accept a gate value in either spelling. Passing null
// silently produced a different, worse pack than architect-web for the same
// answers, which is exactly the drift the shared generator exists to prevent.
const CONTEXT_SERVER_SRC = readFileSync(
  new URL("../skills/rule-architect/assets/context-server.mjs", import.meta.url),
  "utf-8"
);

test("neither server passes a null spec to the generator", () => {
  for (const [name, src] of [["architect-web", SRC], ["context-server", CONTEXT_SERVER_SRC]]) {
    assert.doesNotMatch(
      src,
      /generateContext(Content)?\([^)]*,\s*null\s*[,)]/,
      `${name} must pass the loaded wizardSpec, not null`
    );
    assert.match(
      src,
      /generateContext\(values \|\| \{\}, wizardSpec/,
      `${name}: /api/generate must pass wizardSpec`
    );
    assert.match(
      src,
      /generateContextContent\(values \|\| \{\}, wizardSpec\)/,
      `${name}: /api/download must pass wizardSpec`
    );
  }
});
