/**
 * @module test/auto-adr-flag.test
 *
 * One variable controls automatic ADR logging, and it carries the prefix every
 * other variable in this server carries.
 *
 * Two flags described this before, an enable and a disable, and the disable
 * could not do anything on its own: the hook it guarded was only registered
 * when the enable flag was already set. A pair where one half is unreachable is
 * a pair with a wrong half.
 */

import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("auto-ADR flag test");

const FLAG = "RULE_MCP_AUTO_ADR";

// Assembled rather than written out, so a sweep that deletes lines mentioning
// the retired names cannot empty the assertions that check they are gone.
const RETIRED_ENABLE = ["RETIRED", "AUTO", "ADR"].join("_");
const RETIRED_DISABLE = ["RETIRED", "DISABLE", "AUTO", "ADR"].join("_");

/**
 * Register the ADR tool with a given environment and report whether it hooked
 * itself into every tool call.
 *
 * @param {Record<string, string|undefined>} environment
 * @returns {Promise<boolean>}
 */
async function hooksAutoLog(environment) {
  const saved = {};
  for (const [key, value] of Object.entries(environment)) {
    saved[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "auto-adr-"));

  const { clearTools, countAfterHooks } = await import("../../src/tools/router/index.js");
  const { registerProcessAdrTool } = await import("../../src/tools/adr/index.js");
  clearTools();
  registerProcessAdrTool();
  const hooked = countAfterHooks("*") > 0;

  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return hooked;
}

check("T1 off by default", !(await hooksAutoLog({ [FLAG]: undefined })));
check("T2 on when the flag is 1", await hooksAutoLog({ [FLAG]: "1" }));
check("T3 off for any other value", !(await hooksAutoLog({ [FLAG]: "0" })));

// ── The names it replaced do nothing ──

check("T4 the unprefixed enable name is inert", !(await hooksAutoLog({ [FLAG]: undefined, [RETIRED_ENABLE]: "1" })));
check("T5 the separate disable name is inert", await hooksAutoLog({ [FLAG]: "1", [RETIRED_DISABLE]: "1" }));

// ── Nothing in the source still reads the old names ──

const { readdirSync, readFileSync } = await import("node:fs");
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name.endsWith(".js") ? [join(dir, entry.name)] : []));
const stragglers = walk(new URL("../../src", import.meta.url).pathname).filter((file) => {
  const text = readFileSync(file, "utf8");

  return text.includes(RETIRED_ENABLE) || text.includes(RETIRED_DISABLE);
});
check(`T6 no source file reads an old name (${stragglers.length} found)`, stragglers.length === 0);

// ── And it is documented under the name it has ──

const envDoc = readFileSync(new URL("../../docs/05-env-variables.md", import.meta.url), "utf8");
check("T7 the flag is documented", envDoc.includes(FLAG));
check("T8 and the names it replaced are not", !envDoc.includes(RETIRED_DISABLE) && !envDoc.includes(`\`${RETIRED_ENABLE}\``));

assert.ok(true);
console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
