

/** The four per-folder issue detectors, on synthetic directory listings. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { bareFileIssues, componentFolderIssues, orphanCssIssues, staleBarrelIssues } from "../_scan-checks.js";

// Held in a constant so the repo's import-path gate reads this as the fixture
// text it is, rather than as a relative import this file makes.
const BARREL = `export { Button } from '${"./_Button.js"}';\n`;

/** A readdir entry is only ever read for its name. */
const entries = (...names) => names.map((name) => ({ name }));

test("componentFolderIssues reports a missing barrel and every unprefixed component", () => {
  const issues = componentFolderIssues(entries("Button.jsx", "_Icon.jsx"), "/p/Button", "Button");

  const missing = issues.filter((issue) => issue.type === "missing-barrel");
  assert.equal(missing.length, 1, "a component folder with no index.js is reported once");
  assert.equal(missing[0].fixable, true, "a missing barrel can be created");
  assert.match(missing[0].suggestion, /index\.js/, "the suggestion names the file to create");

  const prefix = issues.filter((issue) => issue.type === "wrong-prefix");
  assert.equal(prefix.length, 1, "only the unprefixed component is reported");
  assert.equal(prefix[0].path, join("/p/Button", "Button.jsx"), "the issue points at the offending file");
  assert.match(prefix[0].fixAction, /_Button\.jsx/, "the fix names the target name");
});

test("componentFolderIssues stays silent on a correct folder", () => {
  assert.deepEqual(componentFolderIssues(entries("index.js", "_Button.jsx"), "/p/Button", "Button"), [], "a barrel plus prefixed components is clean");
});

test("componentFolderIssues does not demand a barrel for a folder with no components", () => {
  assert.deepEqual(componentFolderIssues(entries("notes.md"), "/p/Docs", "Docs"), [], "a folder without component files needs no barrel");
});

test("bareFileIssues reports components sitting outside a component folder", () => {
  const issues = bareFileIssues(entries("Button.jsx", "_Icon.jsx", "index.js", "use-theme.js"), "/p/src");

  assert.equal(issues.length, 1, "only the bare component is reported");
  assert.equal(issues[0].type, "bare-file");
  assert.equal(issues[0].path, join("/p/src", "Button.jsx"));
  assert.equal(issues[0].fixable, true);
});

test("orphanCssIssues reports a prefixed stylesheet with no component beside it", () => {
  const orphans = orphanCssIssues(entries("_Button.css", "_Icon.css", "_Icon.jsx", "theme.css"), "/p/Button");

  assert.equal(orphans.length, 1, "only the stylesheet with no sibling component is an orphan");
  assert.equal(orphans[0].path, join("/p/Button", "_Button.css"));
  assert.equal(orphans[0].fixable, false, "the engine will not guess whether to delete or create");
});

test("staleBarrelIssues reads the barrel and reports empty and export-less ones", () => {
  const box = mkdtempSync(join(tmpdir(), "rule-mcp-file-tree-"));

  try {
    writeFileSync(join(box, "index.js"), "   \n");
    assert.match(staleBarrelIssues(entries("index.js"), box)[0].message, /is empty/, "an empty barrel is reported");

    writeFileSync(join(box, "index.js"), "// nothing to see here\n");
    const noExports = staleBarrelIssues(entries("index.js"), box);
    assert.equal(noExports.length, 1, "a barrel with content but no exports is reported");
    assert.match(noExports[0].message, /no exports/);

    writeFileSync(join(box, "index.js"), BARREL);
    assert.deepEqual(staleBarrelIssues(entries("index.js"), box), [], "a real barrel is clean");

    writeFileSync(join(box, "index.js"), "module.exports = {};\n");
    assert.deepEqual(staleBarrelIssues(entries("index.js"), box), [], "commonjs counts as exporting");
  } finally {
    rmSync(box, { recursive: true, force: true });
  }
});

test("staleBarrelIssues skips non-barrels and unreadable files", () => {
  const box = mkdtempSync(join(tmpdir(), "rule-mcp-file-tree-"));

  try {
    writeFileSync(join(box, "_Button.js"), "");
    assert.deepEqual(staleBarrelIssues(entries("_Button.js"), box), [], "only barrels are inspected");
    assert.deepEqual(staleBarrelIssues(entries("index.js"), box), [], "a barrel that cannot be read is skipped, not reported");
  } finally {
    rmSync(box, { recursive: true, force: true });
  }
});
