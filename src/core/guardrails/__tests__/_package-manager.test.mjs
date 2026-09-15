/**
 * The baseline forbids corepack activation fields in every package.json check:
 * `packageManager` and `devEngines.packageManager` must never appear.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { loadAllSkills } from "../../skills/index.js";
import { checkCode, getGuardrails } from "../index.js";

await loadAllSkills();

const OFFENDING = JSON.stringify(
  {
    name: "x",
    packageManager: "pnpm@11.24.0",
    devEngines: { packageManager: { name: "pnpm", version: "11.8.0", onFail: "download" } },
  },
  null,
  2,
);

test("pkg-no-corepack is in the baseline every skill carries", () => {
  for (const skill of ["rule-styleguide-json", "rule-toolchain-project", "rule-toolchain-pnpm"]) {
    assert.ok(
      getGuardrails(skill).some((rule) => rule.id === "pkg-no-corepack"),
      `${skill} carries pkg-no-corepack`,
    );
  }
});

test("pkg-no-corepack fails both forbidden fields", () => {
  for (const skill of ["rule-styleguide-json", "rule-toolchain-project", "rule-toolchain-pnpm"]) {
    const result = checkCode(skill, OFFENDING, { fileName: "package.json" });

    assert.equal(result.allPass, false, `${skill} rejects the fields`);
    assert.ok(
      result.failed.some((rule) => rule.id === "pkg-no-corepack"),
      `${skill} names the rule`,
    );
  }
});
