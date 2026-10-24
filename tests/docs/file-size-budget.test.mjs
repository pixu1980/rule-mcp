/**
 * @module test/file-size-budget
 *
 * The 100-line rule (+50 tolerance = 150) with a ratchet, and a ban on
 * meaningless numbered file names.
 *
 * ADR 061: files are split one concern per file into underscore-barrel
 * folders. This gate keeps the rework from regressing in either direction:
 *
 *   - a file not in the ratchet must stay at 150 lines or less;
 *   - a grandfathered file may only shrink, and once it fits the cap its
 *     ratchet entry must be deleted (the list only ever gets shorter);
 *   - names like js-1.js, parts-2.js or vanilla-1.js - the auto-split
 *     artifacts this rework removed - fail outright;
 *   - pure data is exempt when named for it: *.data.js/mjs, *.corpus.mjs,
 *     *.fixture.mjs, or anything under tests/fixtures/;
 *   - the tests a skill tree ships beside its code are exempt (ADR 112): a test
 *     table is data about behavior, not a module that grew.
 */

import { strict as assert } from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { FILE_SIZE_RATCHET } from "./file-size-ratchet.data.mjs";

const CAP = 150;
const ROOTS = ["src", "scripts", "tests", "skills"];
const SOURCE_FILE = /\.m?js$/;
const DATA_FILE = /\.(?:data\.m?js|corpus\.mjs|fixture\.mjs)$/;
const JUNK_NAME = /^(?:js|ts|css|misc|temp|utils?|helpers?|vanilla|parts?|chunk|section|split)-\d+\.m?js$/;

/**
 * The tests a skill tree ships beside its code: data about behavior, exempt per
 * ADR 112. Scoped to skills/ so the roots already covered lose no file.
 *
 * @param {string} file
 * @returns {boolean}
 */
const SHIPPED_TEST = (file) => file.startsWith("skills/") && /\.test\.m?js$/.test(file);

/** Every checkable source file under the roots, repo-relative with / separators. */
function collectSourceFiles() {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);

      if (statSync(full).isDirectory()) {
        if (full !== "tests/fixtures") {
          walk(full);
        }
      } else if (SOURCE_FILE.test(entry) && !DATA_FILE.test(entry) && !SHIPPED_TEST(full)) {
        files.push(full);
      }
    }
  };

  for (const root of ROOTS) {
    walk(root);
  }

  return files;
}

const files = collectSourceFiles();
// The line count is what the module wrote: no boilerplate is discounted.
const lineCount = (file) => readFileSync(file, "utf8").split("\n").slice(0, -1).length;

test("no numbered junk file names (js-1.js, parts-2.js, ...)", () => {
  const junk = files.filter((file) => JUNK_NAME.test(file.split("/").at(-1)));

  assert.deepEqual(junk, [], `rename these to say what they contain: ${junk.join(", ")}`);
});

test("files outside the ratchet respect the 150-line cap", { skip: process.env.RULE_MCP_COVERAGE === "1" && "the coverage gate measures branches, not file sizes" }, () => {
  const over = files
    .filter((file) => !FILE_SIZE_RATCHET.has(file))
    .map((file) => [file, lineCount(file)])
    .filter(([, lines]) => lines > CAP);

  assert.deepEqual(
    over.map(([file, lines]) => `${file} (${lines})`),
    [],
    "split these files (ADR 061); the ratchet only grandfathers pre-existing offenders",
  );
});

test("grandfathered files only shrink, and fixed ones leave the ratchet", () => {
  const problems = [];

  for (const [file, ceiling] of FILE_SIZE_RATCHET) {
    let lines;

    try {
      lines = lineCount(file);
    } catch {
      problems.push(`${file}: gone - delete its ratchet entry`);
      continue;
    }

    if (lines > ceiling) {
      problems.push(`${file}: grew ${ceiling} -> ${lines} lines - split it instead`);
    } else if (lines <= CAP) {
      problems.push(`${file}: now fits the cap (${lines}) - delete its ratchet entry`);
    }
  }

  assert.deepEqual(problems, []);
});
