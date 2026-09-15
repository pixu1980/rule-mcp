

/** autoFixFileTree end to end: rename, create barrels, populate barrels. */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { autoFixFileTree } from "../_fix.js";

/** Build a scratch project from a { relativePath: contents } map. */
function project(files) {
  const root = mkdtempSync(join(tmpdir(), "rule-fix-"));

  for (const [relative, contents] of Object.entries(files)) {
    const file = join(root, relative);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, contents);
  }

  return root;
}

test("a dry run reports what it would do and touches nothing", () => {
  const root = project({ "src/Button/Button.jsx": "export function Button() {}\n" });

  try {
    const result = autoFixFileTree(root);

    assert.equal(result.dryRun, true, "dry run is the default, so a fix is never a surprise");
    assert.ok(result.fixed.length > 0, "it still says what it would have done");
    assert.ok(
      result.fixed.every((entry) => entry.action.startsWith("[DRY RUN]")),
      `every action is marked: ${JSON.stringify(result.fixed)}`,
    );
    assert.deepEqual(readdirSync(join(root, "src", "Button")).sort(), ["Button.jsx"], "the folder is untouched");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a real run renames the component and writes the barrel that re-exports it", () => {
  const root = project({ "src/Button/Button.jsx": "export function Button() {}\n" });

  try {
    const result = autoFixFileTree(root, { dryRun: false });

    assert.equal(result.ok, true, `the fix must not error: ${JSON.stringify(result.errors)}`);
    assert.deepEqual(readdirSync(join(root, "src", "Button")).sort(), ["_Button.jsx", "index.js"], "renamed and barrelled");

    const barrel = readFileSync(join(root, "src", "Button", "index.js"), "utf8");
    assert.match(barrel, /@module Button/, "the barrel carries a module header");
    assert.match(barrel, /export \{ Button \} from '\.\/_Button'/, "the barrel re-exports the renamed component");

    assert.equal(autoFixFileTree(root, { dryRun: false }).fixed.length, 0, "a second run has nothing left to do");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an empty barrel is populated from the components beside it", () => {
  const root = project({
    "src/Button/index.js": "",
    "src/Button/_Button.jsx": "export function Button() {}\n",
    "src/Button/_Icon.jsx": "export function Icon() {}\n",
  });

  try {
    const result = autoFixFileTree(root, { dryRun: false });

    const barrel = readFileSync(join(root, "src", "Button", "index.js"), "utf8");
    assert.match(barrel, /export \{ Button \} from '\.\/_Button'/, "every sibling component is exported");
    assert.match(barrel, /export \{ Icon \} from '\.\/_Icon'/);
    assert.ok(
      result.fixed.some((entry) => entry.action === "Populated barrel with exports"),
      "the action is reported",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a folder with only unprefixed sources gets a barrel named after the first one", () => {
  const root = project({ "src/Button/helpers.js": "export function helpers() {}\n" });

  try {
    autoFixFileTree(root, { dryRun: false });

    const barrel = readFileSync(join(root, "src", "Button", "index.js"), "utf8");
    assert.match(barrel, /@module Button/, "the header is written");
    assert.match(barrel, /export \{ helpers \} from '\.\/_helpers'/, "the barrel points at the name the rename will produce");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("issues the fixer cannot handle are handed back as remaining", () => {
  const root = project({
    "src/Button/index.js": "export {};\n",
    "src/Button/_Orphan.css": "article { color: red; }\n",
  });

  try {
    const result = autoFixFileTree(root, { dryRun: false });

    assert.deepEqual(
      result.remaining.map((issue) => issue.type),
      ["orphan-css"],
      "an orphan stylesheet is reported, never guessed at",
    );
    assert.equal(result.ok, true, "an unfixable issue is not an error");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
