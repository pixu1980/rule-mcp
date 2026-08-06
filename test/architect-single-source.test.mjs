// test/architect-single-source.test.mjs
// Phase 2 Task 4: drift guard. Locks the single-source invariants Phase 2
// established — exactly one interview.js under skills/ (the canonical real
// file at rule-architect-web/interview.js, no symlinked copies —
// context-server.mjs now serves it BY PATH instead, since symlinks get
// dropped by `pnpm pack`), no stale placeholders.json under
// assets/context-server/, and both servers importing detectProjectValues
// from the shared detect.mjs instead of carrying their own inline copy.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, lstatSync, readFileSync, realpathSync, readdirSync } from "node:fs";
// eslint-disable-next-line no-unused-vars
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const CANONICAL_INTERVIEW = fileURLToPath(new URL("../skills/rule-architect-web/interview.js", import.meta.url));
const SKILLS_DIR = fileURLToPath(new URL("../skills", import.meta.url));

const CONTEXT_SERVER_ASSETS_DIR = fileURLToPath(
  new URL("../skills/rule-architect/assets/context-server/", import.meta.url),
);

const SERVER_FILES = [
  fileURLToPath(new URL("../skills/rule-architect-web/server.mjs", import.meta.url)),
  fileURLToPath(new URL("../skills/rule-architect/assets/context-server.mjs", import.meta.url)),
];

/**
 * Recursively collect all interview.js files under skills/.
 * Skips node_modules if present.
 */
function collectInterviewJsFiles(dir) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      // Skip node_modules
      if (entry.name === "node_modules") {
        continue;
      }
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectInterviewJsFiles(fullPath));
      } else if (entry.name === "interview.js") {
        results.push(fullPath);
      }
    }
  } catch {
    // If directory doesn't exist, return empty
  }
  return results;
}

test("exactly one interview.js exists under skills/ — the canonical real file, no symlinked copies", () => {
  const allInterviewJsFiles = collectInterviewJsFiles(SKILLS_DIR);

  assert.equal(
    allInterviewJsFiles.length,
    1,
    `exactly one interview.js should exist under skills/ (context-server.mjs serves it by path instead of symlinking), but found ${allInterviewJsFiles.length}: ${allInterviewJsFiles.join(", ")}`,
  );

  const [onlyFile] = allInterviewJsFiles;
  assert.equal(lstatSync(onlyFile).isSymbolicLink(), false, `${onlyFile} should be a real file, not a symlink`);
  assert.equal(
    realpathSync(onlyFile),
    realpathSync(CANONICAL_INTERVIEW),
    `the one interview.js at ${onlyFile} should be the canonical one at ${CANONICAL_INTERVIEW}`,
  );
});

test("no placeholders.json exists under skills/rule-architect/assets/context-server/", () => {
  assert.equal(
    existsSync(CONTEXT_SERVER_ASSETS_DIR + "placeholders.json"),
    false,
    "stale assets/context-server/placeholders.json must not be reintroduced",
  );
});

for (const serverPath of SERVER_FILES) {
  test(`${serverPath} imports detectProjectValues from detect.mjs (no inline copy)`, () => {
    const source = readFileSync(serverPath, "utf-8");
    assert.match(source, /from ["'][^"']*detect\.mjs["']/, `${serverPath} must import from a detect.mjs module`);
    assert.doesNotMatch(
      source,
      /detectProjectValues\s*[=:]|function\s+detectProjectValues/,
      `${serverPath} must not carry its own inline detectProjectValues implementation (function, const, arrow, or property form)`,
    );
  });
}
