/** Branch coverage for the init report: tokensave outcomes, governance and recorder failures. */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { initProject, renderInit } from "../_init.js";
import { getProjectPaths } from "../paths/index.js";
import { makeRepo, remove } from "../../core/git/__tests__/_fixture.mjs";

const temp = () => mkdtempSync(join(tmpdir(), "rule-init-branches-"));
const clean = (dir) => rmSync(dir, { recursive: true, force: true });

test("initProject reports the plain project", () => {
  const dir = temp();
  try {
    const result = initProject({ projectDir: dir, tokensave: false, gitGovernance: false });
    assert.equal(result.created, true);
    assert.equal(result.tokensave, undefined);
    assert.equal(result.governance, undefined);
    assert.doesNotMatch(renderInit(result), /^Git:/mu);
    assert.match(renderInit(result), /^Release:/mu);
  } finally {
    clean(dir);
  }
});

test("initProject covers every tokensave outcome", () => {
  const cases = [
    [{ tokensaveBinary: () => "ts", probe: () => ({ available: true }) }, "existing"],
    [{ tokensaveBinary: () => "ts", probe: () => ({ available: false }), run: () => {} }, "initialized"],
    [
      {
        tokensaveBinary: () => "ts",
        probe: () => ({ available: false }),
        run: () => {
          throw new Error("already initialized");
        },
      },
      "existing",
    ],
    [
      {
        tokensaveBinary: () => "ts",
        probe: () => ({ available: false }),
        run: () => {
          throw new Error("boom");
        },
      },
      "failed: boom",
    ],
    [{ tokensaveBinary: () => {} }, "not installed"],
  ];
  for (const [options, expected] of cases) {
    const dir = temp();
    try {
      assert.equal(initProject({ projectDir: dir, gitGovernance: false, ...options }).tokensave, expected);
    } finally {
      clean(dir);
    }
  }
});

test("initProject reports a governance failure", () => {
  const root = makeRepo();
  const hooks = join(root, ".git", "hooks");
  rmSync(hooks, { recursive: true, force: true });
  writeFileSync(hooks, "not a directory");
  try {
    const result = initProject({ projectDir: root, tokensave: false });
    assert.equal(result.governance.mechanism, "none");
    assert.match(result.governance.actions[0], /failed:/u);
  } finally {
    remove(root);
  }
});

test("initProject reports a recorder directory that cannot be created", () => {
  const dir = temp();
  const { dir: recorder } = getProjectPaths(dir);
  writeFileSync(recorder, "not a directory");
  try {
    const result = initProject({ projectDir: dir, tokensave: false, gitGovernance: false });
    assert.equal(result.created, false);
    assert.match(renderInit(result), /could not be created/u);
  } finally {
    clean(dir);
  }
});

test("renderInit covers the governance and extras branches", () => {
  const none = renderInit({ projectDir: "/p", dir: "/d", created: true, tokensave: "existing", governance: { mechanism: "none", hooks: {}, actions: [] } });
  assert.match(none, /Git: {10}no git repository/u);
  const hooks = renderInit({
    projectDir: "/p",
    dir: "/d",
    created: true,
    governance: { mechanism: "husky", hooks: { "commit-msg": "ok" }, actions: ["one"] },
    dependencies: { unpinned: [] },
  });
  assert.match(hooks, /husky \(commit-msg ok\)/u);
  assert.match(hooks, /one/u);
});
