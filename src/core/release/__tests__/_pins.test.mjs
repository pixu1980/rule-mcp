/** Plan §20 - only exact x.y.z dependency specifiers are accepted. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { exactPinCommand, unpinnedDependencies } from "../index.js";

/** Write a package.json into a throwaway project. */
function project(manifest) {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-pins-"));
  writeFileSync(join(root, "package.json"), JSON.stringify(manifest));

  return root;
}

test("exact pins and protocol specifiers are not reported", () => {
  const root = project({
    dependencies: { alpha: "1.2.3", beta: "0.2.0-rc.1" },
    devDependencies: { gamma: "workspace:*", delta: "file:../delta", epsilon: "npm:other@1.0.0", zeta: "link:../zeta" },
  });

  assert.deepEqual(unpinnedDependencies(root), [], "an exact pin and a local protocol are both fine");
  rmSync(root, { recursive: true, force: true });
});

test("every kind of range is reported with its field", () => {
  const root = project({
    dependencies: { caret: "^1.0.0", tilde: "~1.0.0", star: "*", gte: ">=1.0.0" },
    peerDependencies: { peer: "^2.0.0" },
  });
  const offenders = unpinnedDependencies(root);

  assert.deepEqual(
    offenders.map((offender) => [offender.field, offender.name, offender.specifier]),
    [
      ["dependencies", "caret", "^1.0.0"],
      ["dependencies", "tilde", "~1.0.0"],
      ["dependencies", "star", "*"],
      ["dependencies", "gte", ">=1.0.0"],
      ["peerDependencies", "peer", "^2.0.0"],
    ],
    "each ranged specifier is named with the field it sits in",
  );
  rmSync(root, { recursive: true, force: true });
});

test("a project with no manifest has nothing to report", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-pins-"));

  assert.deepEqual(unpinnedDependencies(root), [], "no package.json means no specifiers");
  rmSync(root, { recursive: true, force: true });
});

test("the pin command names the manager and save-exact", () => {
  assert.equal(exactPinCommand("pnpm", "alpha"), "pnpm add alpha@latest --save-exact", "the manager decides the verb");
  assert.equal(exactPinCommand(null, "alpha"), "npm add alpha@latest --save-exact", "a missing manager falls back to npm");
});
