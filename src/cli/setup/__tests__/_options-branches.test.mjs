/**
 * Branch coverage for the option helpers: the four reasons a terminal cannot
 * host the wizard, and the agent flag's two meanings.
 *
 * The renderer check is pure, so every arm gets its own version string and
 * stream pair instead of waiting for a runtime old enough to trip it.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { canRenderWizard, resolveSetupOptions } from "../_options.js";

const tty = { isTTY: true };
const pipe = { isTTY: false };

test("a node older than the renderer cannot host the wizard", () => {
  assert.equal(canRenderWizard({}, tty, tty, "v20.9.0"), false, "the package floor is below the renderer's floor");
  assert.equal(canRenderWizard({}, tty, tty, "v21.7.3"), false, "21 is still not 22");
});

test("a clean TTY at the renderer's floor draws the wizard", () => {
  assert.equal(canRenderWizard({}, tty, tty, "v22.0.0"), true);
  assert.equal(canRenderWizard({}, tty, tty, "24.1.0"), true, "the v prefix is optional");
});

test("a pipe on either end declines the wizard", () => {
  assert.equal(canRenderWizard({}, pipe, tty, "v24.0.0"), false, "stdin piped");
  assert.equal(canRenderWizard({}, tty, pipe, "v24.0.0"), false, "stdout piped");
});

test("a CI job declines the wizard even on a TTY", () => {
  assert.equal(canRenderWizard({ CI: "1" }, tty, tty, "v24.0.0"), false);
});

test("a terminal that calls itself dumb declines the wizard", () => {
  assert.equal(canRenderWizard({ TERM: "dumb" }, tty, tty, "v24.0.0"), false);
});

test("a named agent narrows the run to that agent", () => {
  assert.deepEqual(resolveSetupOptions({ agent: "claude" }).agents, ["claude"]);
});

test("all and absent both mean whatever detection found", () => {
  assert.equal(resolveSetupOptions({ agent: "all" }).agents, null, "'all' is not an agent name");
  assert.equal(resolveSetupOptions({}).agents, null, "no flag also means detection");
});
