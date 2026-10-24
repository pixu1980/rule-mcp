/**
 * The surface map and the code agree, in both directions.
 *
 * An undeclared call is a dependency nobody audited; a declared entry nobody
 * calls is a document that lies. Both are one rename away, so the check reads
 * the module sources and compares.
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { TOKENSAVE_SURFACE } from "../_surface.js";

const ROOT = new URL("../../../", import.meta.url).pathname;

/** The tool names one module passes to the client, or declares as a check. */
function callsIn(file) {
  const source = readFileSync(`${ROOT}${file}`, "utf8");

  return [...source.matchAll(/(?:client|callToolSync|callTool|read)\(\s*(?:projectDir?,?\s*)?"([a-z_]+)"|\btool:\s*"([a-z_]+)"/g)].map((match) => match[1] ?? match[2]);
}

test("every call the adapter makes is declared in the surface map", () => {
  for (const [file, declared] of Object.entries(TOKENSAVE_SURFACE)) {
    for (const name of callsIn(file)) {
      assert.ok(declared.includes(name), `${file} calls "${name}", which the surface map does not declare`);
    }
  }
});

test("every declared tool is still called", () => {
  for (const [file, declared] of Object.entries(TOKENSAVE_SURFACE)) {
    const called = callsIn(file);

    for (const name of declared) {
      assert.ok(called.includes(name), `the surface map declares "${name}" in ${file}, which no longer calls it`);
    }
  }
});
