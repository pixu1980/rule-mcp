/**
 * ARCH-1: the invocation path must stay acyclic.
 *
 * Tool invocation, skill loading, self-update and the gateway import each
 * other through this path, so a change to any one of them has to fight the
 * other three. The edges are held by an `@src/` alias and by `await
 * import(...)`, and the code graph models neither: it reports zero dependents
 * for core/self-update and core/skills, so it cannot see this cycle at all.
 * This test resolves both specifier forms and walks the real graph, one
 * invariant per cut the plan makes.
 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Every source file under dir, repo-relative, tests excluded. */
function sourceFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") {
        sourceFiles(path, files);
      }
    } else if (/\.m?js$/.test(entry.name)) {
      files.push(relative(root, path).replaceAll("\\", "/"));
    }
  }

  return files;
}

const FROM = /\bfrom\s*["']([^"']+)["']/g;
const DYNAMIC = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

/** Import specifiers in a source file: static `from "x"` and `import("x")`. */
function specifiers(text) {
  const found = [];

  for (const re of [FROM, DYNAMIC]) {
    re.lastIndex = 0;

    for (const match of text.matchAll(re)) {
      found.push(match[1]);
    }
  }

  return found;
}

/** The repo-relative file a specifier names, or null when it is not our source. */
function resolveSpecifier(fromFile, specifier) {
  let target;

  if (specifier.startsWith("@src/")) {
    target = join(root, "src", specifier.slice("@src/".length));
  } else if (specifier.startsWith(".")) {
    target = resolve(root, dirname(fromFile), specifier);
  } else {
    return null;
  }

  const candidate = relative(root, target).replaceAll("\\", "/");

  return existsSync(join(root, candidate)) ? candidate : null;
}

const files = sourceFiles(join(root, "src"));
const graph = new Map(
  files.map((file) => [
    file,
    specifiers(readFileSync(join(root, file), "utf8"))
      .map((s) => resolveSpecifier(file, s))
      .filter(Boolean),
  ]),
);

/** Every file reachable from the given start files, following imports. */
function reachableFrom(startFiles) {
  const seen = new Set();
  const queue = [...startFiles];

  while (queue.length > 0) {
    const file = queue.pop();

    if (seen.has(file)) {
      continue;
    }

    seen.add(file);

    for (const next of graph.get(file) ?? []) {
      if (!seen.has(next)) {
        queue.push(next);
      }
    }
  }

  return seen;
}

/** The files under a directory prefix. */
const under = (prefix) => files.filter((file) => file.startsWith(prefix));

/** The reachable files that live under one of the given prefixes. */
function offenders(startFiles, prefixes) {
  return [...reachableFrom(startFiles)].filter((file) => prefixes.some((prefix) => file.startsWith(prefix))).sort();
}

test("the graph resolves both specifier forms", () => {
  // Without this, every invariant below would pass on an empty graph.
  assert.ok(graph.get("src/tools/router/call/_stages.js").includes("src/core/cache/tool-cache/index.js"), "the @src/ alias must resolve to a file");
  assert.ok(graph.get("src/cli/commands/_help.js").includes("src/core/skills/index.js"), "a dynamic import must resolve to a file");
});

test("self-update reaches the reload port and nothing else in the catalog", () => {
  assert.deepEqual(offenders(under("src/core/self-update/"), ["src/core/skills/"]), ["src/core/skills/_reload-port.js"], "self-update depends on the port, never on the loader");
});

test("the invocation pipeline never reaches self-update", () => {
  const reached = offenders(["src/tools/router/call/_pipeline.js"], ["src/core/self-update/"]);

  assert.deepEqual(reached, [], "a tool call must not pull the updater in behind it");
  assert.ok(graph.get("src/tools/router/call/_pipeline.js").includes("src/tools/router/call/_host.js"), "and it must ask the host");
});

test("the skill catalog never reaches the gateway or the apply tool", () => {
  assert.deepEqual(offenders(["src/core/skills/_load.js"], ["src/tools/gateway/", "src/tools/apply/"]), [], "the bootstrap registers those, not loadAllSkills");
});

test("the search index never reaches the loader", () => {
  // _load.js builds the index and the index reads the skill bodies, so the two
  // modules touch each other. Drawing the index's edge to the skills *barrel*
  // is what turns that into a cycle: the barrel re-exports the loader.
  assert.deepEqual(offenders(under("src/core/bm25/"), ["src/core/skills/_load.js"]), [], "the index takes the skill cache from its own module, not from the catalog's barrel");
});

test("the loader imports the whole catalog statically", () => {
  const loader = readFileSync(join(root, "src/core/skills/_load.js"), "utf8");

  assert.doesNotMatch(loader, /await import\(\s*["']/, "no edge may hide behind a dynamic import in the loader");
});
