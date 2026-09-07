/**
 * Anti-regression gate: no 4-line block may repeat across three or more
 * source files.
 *
 * The structural plan centralized shared helpers into src/shared; this test
 * keeps them there. A normalized 4-line window that appears in >=3 distinct
 * src files is a helper that got re-implemented, and it will show up here
 * before it drifts into three slightly different versions.
 *
 * Excluded on purpose: *.data.js (catalog/dictionary payloads), src/shared (the
 * helpers themselves), the __tests__ folders and fixtures (assertion data), and
 * files whose whole body is a static table. Comment-only and header windows
 * are also ignored: a JSDoc license header is not code to share.
 */
import { strict as assert } from "node:assert";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const ROOT = new URL("../../src", import.meta.url);

const norm = (block) => block.replaceAll(/[\s]+/g, " ").trim();

function sourceFiles(dir = ROOT.pathname, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "templates") {
        // __tests__: assertion data. templates: vended output, which cannot
        // depend on a shared module it must emit standalone.
        continue;
      }
      sourceFiles(path, out);
    } else if (path.endsWith(".js") && !path.endsWith(".data.js") && !path.includes("/shared/")) {
      out.push(path);
    }
  }

  return out;
}

/** 4-line windows, normalized, skipping comments/headers and the table payloads. */
function windows(text) {
  const lines = text.split("\n");
  const out = new Map();
  const isCode = (line) => {
    const t = line.trim();

    return t !== "" && !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*") && !t.startsWith("`") && !t.startsWith("|") && !t.startsWith("---");
  };

  for (let index = 0; index + 3 < lines.length; index++) {
    const block = lines.slice(index, index + 4);

    if (!block.every(isCode)) {
      continue;
    }
    // Require real statements, not brace-only alignment like `}` closers.
    if (block.every((line) => /^[\s{}[\],]+$/.test(line))) {
      continue;
    }

    const key = norm(block.join("\n"));

    if (key.length >= 40) {
      out.set(key, { line: index + 1, text: block[0].trim() });
    }
  }

  return out;
}

test("no 4-line block repeats across three or more source files", () => {
  const seen = new Map();
  const offenders = [];

  for (const file of sourceFiles()) {
    const wins = windows(readFileSync(file, "utf8"));

    for (const [key, meta] of wins) {
      if (!seen.has(key)) {
        seen.set(key, { files: [] });
      }
      const entry = seen.get(key);
      const rel = relative(ROOT.pathname, file);

      const already = entry.files.some((f) => f.file === rel);

      if (!already) {
        entry.files.push({ file: rel, line: meta.line, text: meta.text });
      }
    }
  }

  for (const [key, entry] of seen) {
    if (entry.files.length >= 3) {
      offenders.push(`${entry.files[0].file}:${entry.files[0].line} (${entry.files.length} files): ${entry.files[0].text}`);
    }
  }

  assert.deepEqual(offenders, [], "centralize these into src/shared:\n" + offenders.join("\n"));
});
