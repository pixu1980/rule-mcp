/**
 * The flat scanner must report exactly what the recursive scanner reports:
 * same issues, same stats. The TokenSave path is forced with an injected probe
 * and a client that returns the live walk as a flat listing.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { walkFiles } from "../../tokensave/_files.js";
import { scanFileTree } from "../_scan.js";

const BARREL = `export { Button } from '${"./_Button.js"}';\n`;

/** Build a scratch project from a { relativePath: contents } map. */
function project(files) {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-scan-flat-"));

  for (const [relative, contents] of Object.entries(files)) {
    const file = join(root, relative);

    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, contents);
  }

  return root;
}

/** Scan through the TokenSave path using the live walk as the listing. */
function flatScan(root, srcDir = "src") {
  const value = walkFiles(root, srcDir).join("\n");

  return scanFileTree(root, {
    srcDir,
    probe: () => ({ available: true }),
    client: () => ({ ok: true, value }),
  });
}

/** Run both scanners and assert they agree. */
function assertSame(root, srcDir = "src") {
  const recursive = scanFileTree(root, { srcDir });
  const flat = flatScan(root, srcDir);

  assert.deepEqual(flat, recursive);
}

test("a convention-correct tree reports the same through both scanners", () => {
  const root = project({
    "src/Button/index.js": BARREL,
    "src/Button/_Button.js": "export function Button() {}\n",
    "src/use-theme.js": "export function useTheme() {}\n",
  });

  try {
    assertSame(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a tree with issues reports the same through both scanners", () => {
  const root = project({
    "src/Button/Button.jsx": "export function Button() {}\n",
    "src/Card.jsx": "export function Card() {}\n",
  });

  try {
    assertSame(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ignored directories are counted and skipped the same way", () => {
  const root = project({
    "src/index.js": "export {};\n",
    "src/node_modules/pkg/Broken.jsx": "export function Broken() {}\n",
    "src/.hidden/Broken.jsx": "export function Broken() {}\n",
  });

  try {
    assertSame(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a custom srcDir reports the same through both scanners", () => {
  const root = project({ "lib/Card.jsx": "export function Card() {}\n" });

  try {
    assertSame(root, "lib");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
