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

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { checkCode, getGuardrails } from "../src/core/guardrails.js";

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

console.log("=== package.json guardrails ===\n");

/** Run the manifest guardrails over one manifest body. */
const run = (manifest, fileName = "package.json") =>
  checkCode("rule-toolchain-pnpm", typeof manifest === "string" ? manifest : JSON.stringify(manifest, undefined, 2), {
    fileName,
  });

/** @param {object|string} manifest @param {string} id @returns {boolean} */
const fails = (manifest, id, fileName) => run(manifest, fileName).failed.some((failure) => failure.id === id);

const EXACT = "pkg-exact-versions";
const COREPACK = "pkg-no-corepack";

// ── T0: the guardrails exist and are shared, not skill-specific ──
const ids = new Set(getGuardrails("rule-styleguide-javascript").map((g) => g.id));
check("T0 both guardrails are shared", ids.has(EXACT) && ids.has(COREPACK));
check(
  "T0.1 they are shared for every skill",
  ["rule-frontend-react", "rule-backend-node", "rule-data-sql"].every((skill) =>
    getGuardrails(skill).some((g) => g.id === EXACT),
  ),
);

// ── T1: ranges are rejected, wherever they hide ──
check("T1 a caret range fails", fails({ dependencies: { prettier: "^3.9.4" } }, EXACT));
check("T1.1 a tilde range fails", fails({ devDependencies: { eslint: "~10.8.0" } }, EXACT));
check("T1.2 a comparator fails", fails({ dependencies: { zod: ">=4.0.0" } }, EXACT));
check("T1.3 an alternation fails", fails({ dependencies: { react: "18.0.0 || 19.0.0" } }, EXACT));
check("T1.4 a wildcard fails", fails({ dependencies: { lodash: "*" } }, EXACT));
check("T1.5 a dist-tag fails", fails({ dependencies: { next: "latest" } }, EXACT));
check("T1.6 an x-range fails", fails({ dependencies: { vite: "7.x" } }, EXACT));
check("T1.7 optionalDependencies are checked too", fails({ optionalDependencies: { fsevents: "^2.3.3" } }, EXACT));
check(
  "T1.8 the offender is named",
  (() => {
    const failure = run({ dependencies: { prettier: "^3.9.4", zod: "4.1.13" } }).failed.find((f) => f.id === EXACT);

    return (
      failure?.detail?.some((line) => line.includes("prettier")) &&
      failure.detail.every((line) => !line.includes("zod"))
    );
  })(),
);

// ── T2: what is not a range stays legal ──
check("T2 an exact version passes", !fails({ dependencies: { prettier: "3.9.4" } }, EXACT));
check("T2.1 a prerelease passes", !fails({ dependencies: { vite: "8.0.0-beta.3" } }, EXACT));
check("T2.2 a workspace protocol passes", !fails({ dependencies: { ui: "workspace:*" } }, EXACT));
check("T2.3 a catalog reference passes", !fails({ dependencies: { react: "catalog:" } }, EXACT));
check("T2.4 file and link protocols pass", !fails({ dependencies: { a: "file:../a", b: "link:../b" } }, EXACT));
check(
  "T2.5 a git dependency passes",
  !fails({ dependencies: { tool: "git+https://example.com/t.git#v1.2.3" } }, EXACT),
);
check("T2.6 an aliased exact version passes", !fails({ dependencies: { react: "npm:react@19.2.0" } }, EXACT));
check(
  "T2.7 peerDependencies may declare a range: it states compatibility, not an install",
  !fails({ peerDependencies: { react: "^18.0.0 || ^19.0.0" } }, EXACT),
);

// ── T3: corepack, both spellings ──
check("T3 packageManager fails", fails({ packageManager: "pnpm@11.24.0" }, COREPACK));
check(
  "T3.1 devEngines.packageManager fails",
  fails({ devEngines: { packageManager: { name: "pnpm", version: "11.8.0", onFail: "download" } } }, COREPACK),
);
check(
  "T3.2 both at once are one failure with two details",
  (() => {
    const failure = run({
      packageManager: "pnpm@11.24.0",
      devEngines: { packageManager: { name: "pnpm", version: "11.8.0" } },
    }).failed.find((f) => f.id === COREPACK);

    return failure?.failCount === 2;
  })(),
);
check(
  "T3.3 a manifest without either passes",
  !fails({ name: "app", devEngines: { runtime: { name: "node", version: "24" } } }, COREPACK),
);
check("T3.4 engines stays legal: it asserts, it does not download", !fails({ engines: { node: ">=22" } }, COREPACK));

// ── T4: gated on the file ──
check(
  "T4 a JavaScript file is not a manifest",
  !fails('const range = "^3.9.4";\nexport const packageManager = "pnpm@11.24.0";\n', EXACT, "src/app.js") &&
    !fails('export const packageManager = "pnpm@11.24.0";\n', COREPACK, "src/app.js"),
);
check(
  "T4.1 a nested manifest path is still a manifest",
  fails({ dependencies: { prettier: "^3.9.4" } }, EXACT, "packages/ui/package.json"),
);
check(
  "T4.2 unparseable JSON is reported, not thrown",
  run("{ not json", "package.json").failed.some((f) => f.id === EXACT || f.id === COREPACK) === false,
);

// ── T5: this repository obeys its own rule ──
const manifests = execFileSync("git", ["ls-files", "-z", "--", "*package.json"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter((path) => !path.includes("node_modules/"));
check("T5 every tracked manifest was found", manifests.length > 0);
const offenders = manifests.filter((path) => {
  const report = checkCode("rule-toolchain-pnpm", readFileSync(path, "utf8"), { fileName: path });

  return report.failed.some((failure) => failure.id === EXACT || failure.id === COREPACK);
});
check(
  `T5.1 every tracked manifest passes both rules${offenders.length > 0 ? ` (offenders: ${offenders.join(", ")})` : ""}`,
  offenders.length === 0,
);

// ── T6: .npmrc is what stops the range from coming back ──
//
// The manifest rule catches a caret that is already written. `save-exact=true`
// is what keeps `pnpm add` from writing one, so scaffold mode requires the file.
const npmrc = (code) => checkCode("rule-styleguide", code, { fileName: ".npmrc", mode: "scaffold" });
check(
  "T6 a missing save-exact fails",
  npmrc("registry=https://registry.npmjs.org/\n").failed.some((f) => f.id === "scaffold-npmrc"),
);
check(
  "T6.1 save-exact=true passes",
  (() => {
    const report = npmrc("save-exact=true\n");

    return report.failed.every((f) => !(f.id === "scaffold-npmrc"));
  })(),
);
check(
  "T6.2 save-exact=false fails: the field is not the point, the value is",
  npmrc("save-exact=false\n").failed.some((f) => f.id === "scaffold-npmrc"),
);
check(
  "T6.3 outside scaffold mode it is not checked",
  checkCode("rule-styleguide", "", { fileName: ".npmrc" }).failed.every((f) => !(f.id === "scaffold-npmrc")),
);
check("T6.4 this repository has one", readFileSync(".npmrc", "utf8").includes("save-exact=true"));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
