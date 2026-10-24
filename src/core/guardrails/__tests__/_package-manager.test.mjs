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

const WITH_ENGINES = JSON.stringify({ name: "x", engines: { node: ">=22" } }, null, 2);

test("pkg-no-corepack is in the baseline every skill carries", () => {
  for (const skill of ["rule-mcp-styleguide-json", "rule-mcp-styleguide-configuration", "rule-mcp-toolchain-pnpm"]) {
    assert.ok(
      getGuardrails(skill).some((rule) => rule.id === "pkg-no-corepack"),
      `${skill} carries pkg-no-corepack`,
    );
  }
});

test("pkg-no-engines is in the baseline every skill carries", () => {
  for (const skill of ["rule-mcp-styleguide-json", "rule-mcp-styleguide-configuration", "rule-mcp-toolchain-pnpm"]) {
    assert.ok(
      getGuardrails(skill).some((rule) => rule.id === "pkg-no-engines"),
      `${skill} carries pkg-no-engines`,
    );
  }
});

test("pkg-no-engines fails the engines field both ways", () => {
  for (const skill of ["rule-mcp-styleguide-json", "rule-mcp-styleguide-configuration", "rule-mcp-toolchain-pnpm"]) {
    const result = checkCode(skill, WITH_ENGINES, { fileName: "package.json" });

    assert.equal(result.allPass, false, `${skill} rejects the field`);
    assert.ok(
      result.failed.some((rule) => rule.id === "pkg-no-engines"),
      `${skill} names the rule`,
    );
  }
});

test("pkg-no-corepack does not fire on engines and pkg-no-engines does not fire on packageManager", () => {
  const corepackIds = checkCode("rule-mcp-toolchain-pnpm", WITH_ENGINES, { fileName: "package.json" }).failed.map((rule) => rule.id);
  const enginesIds = checkCode("rule-mcp-toolchain-pnpm", OFFENDING, { fileName: "package.json" }).failed.map((rule) => rule.id);

  assert.equal(corepackIds.includes("pkg-no-corepack"), false, "the corepack rule is about corepack");
  assert.equal(enginesIds.includes("pkg-no-engines"), false, "the engines rule is about engines");
});

test("pkg-no-corepack fails both forbidden fields", () => {
  for (const skill of ["rule-mcp-styleguide-json", "rule-mcp-styleguide-configuration", "rule-mcp-toolchain-pnpm"]) {
    const result = checkCode(skill, OFFENDING, { fileName: "package.json" });

    assert.equal(result.allPass, false, `${skill} rejects the fields`);
    assert.ok(
      result.failed.some((rule) => rule.id === "pkg-no-corepack"),
      `${skill} names the rule`,
    );
  }
});
