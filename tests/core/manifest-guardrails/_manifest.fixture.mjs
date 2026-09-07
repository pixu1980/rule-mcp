/**
 * @module test/manifest-guardrails.test
 *
 * Two rules about `package.json`, both mandatory, both about the same thing:
 * an install that is reproducible without a second tool.
 *
 * **Exact versions.** `"prettier": "^3.9.4"` does not pin prettier and it does
 * not pin what prettier depends on. Two installs a week apart resolve different
 * subdependency trees, so a build that breaks breaks on one machine, and the
 * diff that explains it is in nobody's repository. `"prettier": "3.9.4"` plus a
 * lockfile is the whole fix.
 *
 * **No corepack.** `packageManager` and `devEngines.packageManager` hand control
 * of the package manager to corepack, which then decides whether the install
 * runs at all - a download on a machine that is offline, a signature check on a
 * machine behind a proxy, a shim that shadows the pnpm already installed. The
 * fields buy a version assertion that `.nvmrc` plus a lockfile already give.
 *
 * Gated on the file, not on the skill: whichever skill the check is routed to,
 * a `package.json` is checked and nothing else is.
 */

export { checkCode, getGuardrails } from "../../../src/core/guardrails/index.js";

const { checkCode } = await import("../../../src/core/guardrails/index.js");

let pass = 0;
let fail = 0;

/** Print-style assertion; exit code handled by finish(). */
export const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  \u{2705} ${label}`);
  } else {
    fail++;
    console.log(`  \u{274C} ${label}`);
  }
};

/** Print the tally and set the exit code. */
export function finish() {
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) {
    process.exit(1);
  }
}

/** Run the manifest guardrails over one manifest body. */
export const run = (manifest, fileName = "package.json") =>
  checkCode("rule-toolchain-pnpm", typeof manifest === "string" ? manifest : JSON.stringify(manifest, undefined, 2), {
    fileName,
  });

/** @param {object|string} manifest @param {string} id @returns {boolean} */
export const fails = (manifest, id, fileName) => run(manifest, fileName).failed.some((failure) => failure.id === id);

export const EXACT = "pkg-exact-versions";
export const COREPACK = "pkg-no-corepack";
