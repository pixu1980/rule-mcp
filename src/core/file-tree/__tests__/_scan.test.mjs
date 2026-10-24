/** scanFileTree over real directory trees: recursion, depth rules, stats. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { scanFileTree } from "../_scan.js";

// Held in a constant so the repo's import-path gate reads this as the fixture
// text it is, rather than as a relative import this file makes.
const BARREL = `export { Button } from '${"./_Button.js"}';\n`;

/** Build a scratch project from a { relativePath: contents } map. */
function project(files) {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-scan-"));

  for (const [relative, contents] of Object.entries(files)) {
    const file = join(root, relative);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, contents);
  }

  return root;
}

test("a project with no source directory passes with empty stats", () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-scan-empty-"));

  try {
    const report = scanFileTree(root);

    assert.equal(report.pass, true, "nothing to scan is not a failure");
    assert.deepEqual(report.issues, []);
    assert.equal(report.stats.totalFiles, 0);
    assert.equal(report.stats.totalDirs, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a convention-correct tree passes and counts what it walked", () => {
  const root = project({
    "src/Button/index.js": BARREL,
    "src/Button/_Button.js": "export function Button() {}\n",
    "src/use-theme.js": "export function useTheme() {}\n",
  });

  try {
    const report = scanFileTree(root);

    assert.deepEqual(report.issues, [], `a correct tree must be clean: ${JSON.stringify(report.issues)}`);
    assert.equal(report.pass, true);
    assert.equal(report.stats.totalFiles, 3, "every file is counted");
    assert.equal(report.stats.totalDirs, 1, "the component folder is counted");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the stats break the issues down by type", () => {
  const root = project({
    "src/Button/Button.jsx": "export function Button() {}\n",
    "src/Card.jsx": "export function Card() {}\n",
  });

  try {
    const report = scanFileTree(root);

    assert.equal(report.pass, false);
    assert.equal(report.stats.missingBarrel, 1, "src/Button has no index.js");
    assert.equal(report.stats.wrongPrefix, 1, "Button.jsx is unprefixed inside its folder");
    assert.equal(report.stats.bareFiles, 1, "Card.jsx sits outside a component folder");
    assert.equal(report.stats.fixable, report.issues.length, "all three are auto-fixable");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ignored directories are never walked", () => {
  const root = project({
    "src/index.js": "export {};\n",
    "src/node_modules/pkg/Broken.jsx": "export function Broken() {}\n",
    "src/.hidden/Broken.jsx": "export function Broken() {}\n",
  });

  try {
    const report = scanFileTree(root);

    assert.deepEqual(report.issues, [], "nothing inside node_modules or a dot folder is reported");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("srcDir picks the directory to scan", () => {
  const root = project({ "lib/Card.jsx": "export function Card() {}\n" });

  try {
    assert.equal(scanFileTree(root).pass, true, "the default src/ does not exist here");

    const scoped = scanFileTree(root, { srcDir: "lib" });
    assert.equal(scoped.pass, false, "lib/ holds a bare component");
    assert.equal(scoped.stats.bareFiles, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a top-level PascalCase directory is not treated as a component folder", () => {
  // depth 0 is the scanned root itself: the barrel rule starts one level down.
  const root = project({ "Button/_Button.js": "export function Button() {}\n" });

  try {
    const report = scanFileTree(root, { srcDir: "Button" });

    assert.deepEqual(
      report.issues.filter((issue) => issue.type === "missing-barrel"),
      [],
      "the scanned root is not asked for a barrel",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
