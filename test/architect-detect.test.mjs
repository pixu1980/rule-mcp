// test/architect-detect.test.mjs
// Locks the canonical detectProjectValues() behavior before the servers are
// switched to import it (Phase 2 refactor is output-preserving, mirrors
// Phase 1's generator.mjs extraction).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectProjectValues } from "../skills/rule-architect/detect.mjs";

// detectProjectValues follows a DETECT-OR-STAY-SILENT contract: it only emits
// a value it can actually infer from the project's own files. It used to
// invent ~27 fixed TTRPG/Electron values (AUTH_MECHANISM, DEPLOY_TARGET,
// MVP_STEP_*, PERSONA_*, …) for EVERY project — even an empty one — which
// pre-filled the wizard with facts that were wrong for anything but the app it
// was prototyped against. These tests pin the generic behavior and guard
// against the invented content returning.

// A value that cannot be inferred from a generic project's files. If the
// detector emits any of these, it is fabricating project-specific content.
const FABRICATED_KEYS = [
  "AUTH_MECHANISM",
  "DEPLOY_TARGET",
  "BROWSER_SUPPORT",
  "CSP_POLICY",
  "MVP_STEP_1",
  "NON_GOAL_1",
  "PERSONA_1",
  "USER_STORY_1",
  "TESTING_PYRAMID",
  "ENTITY_1",
  "FEATURE_1",
  "KEY_VALUE_PROP_1",
  "QUALITY_GATES",
  "RULE_MCP_PRIMARY_SKILL",
  "DOMAIN_NAME",
];

test("detectProjectValues reads PROJECT_NAME from package.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "architect-detect-"));
  try {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "acme" }));
    const values = detectProjectValues(dir);
    assert.equal(values.PROJECT_NAME, "acme");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an empty project yields NO fabricated project-specific values", () => {
  const dir = mkdtempSync(join(tmpdir(), "architect-detect-"));
  try {
    const values = detectProjectValues(dir);
    for (const key of FABRICATED_KEYS) {
      assert.ok(!(key in values), `empty project must not fabricate ${key} (got ${JSON.stringify(values[key])})`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a real project (package.json only) yields only inferable values, no fabrication", () => {
  const dir = mkdtempSync(join(tmpdir(), "architect-detect-"));
  try {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "shop-api" }));
    const values = detectProjectValues(dir);
    assert.equal(values.PROJECT_NAME, "shop-api");
    for (const key of FABRICATED_KEYS) {
      assert.ok(!(key in values), `must not fabricate ${key} for a plain package.json project`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PROJECT_NAME falls back to the directory name when package.json has none", () => {
  const dir = mkdtempSync(join(tmpdir(), "architect-detect-named-"));
  try {
    const values = detectProjectValues(dir);
    assert.ok(values.PROJECT_NAME && values.PROJECT_NAME.length > 0, "a directory name is a generic identity signal");
    assert.ok(
      values.PROJECT_NAME.startsWith("architect-detect-named-"),
      `expected the dir basename, got ${values.PROJECT_NAME}`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("PROJECT_NAME comes from a CONTEXT.md H1 when there is no package.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "architect-detect-"));
  try {
    writeFileSync(join(dir, "CONTEXT.md"), "# Orbital Freight Planner\n\nSome description.\n");
    const values = detectProjectValues(dir);
    assert.equal(values.PROJECT_NAME, "Orbital Freight Planner");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("STACK_PKG_MANAGER is detected from the lockfile actually present", () => {
  for (const [lockfile, manager] of [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
  ]) {
    const dir = mkdtempSync(join(tmpdir(), "architect-detect-"));
    try {
      writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));
      writeFileSync(join(dir, lockfile), "");
      const values = detectProjectValues(dir);
      assert.equal(values.STACK_PKG_MANAGER, manager, `${lockfile} implies ${manager}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
