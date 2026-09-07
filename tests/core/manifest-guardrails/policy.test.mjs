/** T3-T6: corepack, file gating, the repo obeys its own rule, and .npmrc save-exact. */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

import { COREPACK, EXACT, check, checkCode, fails, finish, run } from "./_manifest.fixture.mjs";

console.log("=== package.json guardrails: corepack, gating, repo ===\n");

// ── T3: corepack, both spellings ──
check("T3 packageManager fails", fails({ packageManager: "pnpm@11.24.0" }, COREPACK));
check("T3.1 devEngines.packageManager fails", fails({ devEngines: { packageManager: { name: "pnpm", version: "11.8.0", onFail: "download" } } }, COREPACK));
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
check("T3.3 a manifest without either passes", !fails({ name: "app", devEngines: { runtime: { name: "node", version: "24" } } }, COREPACK));
check("T3.4 engines stays legal: it asserts, it does not download", !fails({ engines: { node: ">=22" } }, COREPACK));

// ── T4: gated on the file ──
check(
  "T4 a JavaScript file is not a manifest",
  !fails('const range = "^3.9.4";\nexport const packageManager = "pnpm@11.24.0";\n', EXACT, "src/app.js") &&
    !fails('export const packageManager = "pnpm@11.24.0";\n', COREPACK, "src/app.js"),
);
check("T4.1 a nested manifest path is still a manifest", fails({ dependencies: { prettier: "^3.9.4" } }, EXACT, "packages/ui/package.json"));
check("T4.2 unparseable JSON is reported, not thrown", run("{ not json", "package.json").failed.some((f) => f.id === EXACT || f.id === COREPACK) === false);

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
check(`T5.1 every tracked manifest passes both rules${offenders.length > 0 ? ` (offenders: ${offenders.join(", ")})` : ""}`, offenders.length === 0);

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

finish();
