/**
 * The three rule_tool_fix modes as the router calls them: lint reports, fix
 * corrects, generate writes a component folder and refuses to escape the root.
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { fixMode } from "../_auto-fix.js";
import { generateMode } from "../_generate.js";
import { lintMode } from "../_lint.js";

/** Build a scratch project from a { relativePath: contents } map. */
function project(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "rule-fix-mode-"));

  for (const [relative, contents] of Object.entries(files)) {
    const file = join(root, relative);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, contents);
  }

  return root;
}

/** The single text body of a tool result. */
const text = (result) => result.content[0].text;

test("lint reports a pass with what it scanned", () => {
  const root = project({ "src/use-theme.js": "export function useTheme() {}\n" });

  try {
    const body = text(lintMode({ path: root }));

    assert.match(body, /File Tree Validation: PASS/);
    assert.match(body, /Scanned 1 files in 0 directories/, "the counts come from the scan, not a guess");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("lint lists every issue with its type, path and fix", () => {
  const root = project({
    "src/Button/Button.jsx": "export function Button() {}\n",
    "src/Card/_Orphan.css": "article { color: red; }\n",
  });

  try {
    const body = text(lintMode({ path: root }));

    assert.match(body, /File Tree Validation: \d+ issues/);
    // Two: src/Button holds a component, and src/Card holds a stylesheet,
    // which counts as a component file and so wants a barrel of its own.
    assert.match(body, /- Missing barrel files: 2/);
    assert.match(body, /- Wrong file prefix: 1/);
    assert.match(body, /### 🔧 missing-barrel/, "a fixable issue is marked with the wrench");
    assert.match(body, /### ⚠️ orphan-css/, "an unfixable one is marked with the warning");
    assert.match(body, /\*\*Auto-fix\*\*:/, "the fix action is shown where there is one");
    assert.match(body, /Run with `mode=fix dryRun=false`/, "and the closing line says how to apply them");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("lint honors srcDir and defaults the path to the working directory", () => {
  const root = project({ "lib/Card.jsx": "export function Card() {}\n" });

  try {
    assert.match(text(lintMode({ path: root, srcDir: "lib" })), /bare-file/, "lib/ is scanned when asked for");
    assert.match(text(lintMode({})), /File Tree Validation/, "with no path it still answers about the cwd");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fix previews by default and applies when told to", () => {
  const root = project({ "src/Button/Button.jsx": "export function Button() {}\n" });

  try {
    const preview = text(fixMode({ path: root }));
    assert.match(preview, /File Tree Auto-Fix: DRY RUN/);
    assert.match(preview, /Run with `dryRun=false` to apply fixes/);
    assert.match(preview, /## Fixed \(\d+\)/, "it lists what it would do");
    assert.deepEqual(readdirSync(join(root, "src", "Button")), ["Button.jsx"], "and changes nothing");

    const applied = text(fixMode({ path: root, dryRun: false }));
    assert.match(applied, /File Tree Auto-Fix: COMPLETE/);
    assert.deepEqual(readdirSync(join(root, "src", "Button")).sort(), ["_Button.jsx", "index.js"], "the fix lands");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fix reports the issues it cannot handle, and says so when there is nothing to do", () => {
  const withOrphan = project({ "src/Card/_Orphan.css": "article { color: red; }\n" });
  const clean = project({ "src/use-theme.js": "export function useTheme() {}\n" });

  try {
    assert.match(text(fixMode({ path: withOrphan, dryRun: false })), /## Remaining Issues \(1\)/, "an orphan stylesheet is handed back");
    assert.match(text(fixMode({ path: clean })), /No issues found\. File tree is clean\./);
  } finally {
    rmSync(withOrphan, { recursive: true, force: true });
    rmSync(clean, { recursive: true, force: true });
  }
});

test("generate needs a name", async () => {
  const result = await generateMode({});

  assert.equal(result.isError, true, "a nameless component is refused");
  assert.match(text(result), /requires a `name`/);
});

test("generate previews by default and writes when told to", async () => {
  const root = project();

  try {
    const preview = await generateMode({ path: root, name: "MyButton" });
    assert.match(text(preview), /Would create 2 files/);
    assert.match(text(preview), /dry-run, not written/);
    assert.equal(existsSync(join(root, "src", "components", "MyButton")), false, "nothing is written");

    const written = await generateMode({ path: root, name: "MyButton", framework: "react", dryRun: false });
    assert.match(text(written), /Created 2 files/);
    assert.deepEqual(readdirSync(join(root, "src", "components", "MyButton")).sort(), ["_MyButton.jsx", "index.js"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("generate refuses a baseDir that escapes the project root", async () => {
  const root = project();

  try {
    for (const baseDir of ["../outside", ".", "/etc"]) {
      const result = await generateMode({ path: root, name: "MyButton", baseDir, dryRun: false });

      assert.equal(result.isError, true, `baseDir ${baseDir} must be refused`);
      assert.match(text(result), /escapes project root/, `baseDir ${baseDir}: the refusal says why`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
