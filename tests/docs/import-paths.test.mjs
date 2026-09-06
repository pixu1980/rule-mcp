/**
 * @module test/import-paths
 *
 * Every relative import specifier resolves to a file that exists.
 *
 * The folder splits move code between directories; a static import that
 * breaks fails fast at load, but a dynamic dynamic import with a stale relative depth inside a
 * rarely taken branch fails only when that branch runs. This walks every
 * source file and resolves every relative specifier - static, dynamic, and
 * `new URL(..., import.meta.url)` - against the file that carries it.
 */

import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import test from "node:test";

const ROOTS = ["src", "scripts", "tests", "bin"];
const SPEC_RE = /(?:from\s+|import\s+|import\(|new URL\()\s*["'](\.[^"']+)["']/g;

/** Every js/mjs file under the roots. */
function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      if (entry !== "node_modules" && entry !== "fixtures") {
        collect(full, out);
      }
    } else if (/\.m?js$/.test(entry)) {
      out.push(full);
    }
  }

  return out;
}

test("every relative import specifier resolves", () => {
  const broken = [];

  for (const file of ROOTS.flatMap((root) => collect(root))) {
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(SPEC_RE)) {
      const spec = match[1];

      // Template placeholders and doc examples are content, not imports; only
      // .js/.mjs specifiers are import paths this repo must resolve.
      if (spec.includes("${") || spec.includes("ComponentName") || !/\.m?js$/.test(spec)) {
        continue;
      }

      // Directory URLs (trailing slash) and non-code assets resolve as paths too.
      const target = normalize(join(dirname(file), spec));

      if (!existsSync(target)) {
        broken.push(`${file}: ${spec}`);
      }
    }
  }

  assert.deepEqual(broken, [], "fix these specifiers (moved file, stale relative depth)");
});
