

/**
 * ARCH-6: every src directory that holds code has an index.js barrel, and the
 * six core helpers plus six action tools live behind those barrels instead of
 * as unowned siblings of index.js.
 */
import { strict as assert } from "node:assert";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
const src = join(root, "src");

/** Directories under src that contain a .js file, tests excluded. */
function codedDirectories(dir, found = []) {
  let hasJs = false;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") {
        codedDirectories(path, found);
      }
    } else if (entry.name.endsWith(".js")) {
      hasJs = true;
    }
  }

  if (hasJs) {
    found.push(relative(root, dir).replaceAll("\\", "/"));
  }

  return found;
}

test("every src directory with code has an index.js barrel", () => {
  const missing = codedDirectories(src).filter((dir) => !existsSync(join(root, dir, "index.js")));

  assert.deepEqual(missing, [], "a directory with .js files needs index.js as its public entry");
});

test("non-barrel source files under src are underscore-prefixed", () => {
  const unprefixed = [];

  for (const dir of codedDirectories(src)) {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".js") || entry.name === "index.js") {
        continue;
      }

      if (!entry.name.startsWith("_")) {
        unprefixed.push(`${dir}/${entry.name}`);
      }
    }
  }

  assert.deepEqual(unprefixed, [], "implementation files carry a leading underscore");
});

test("the six core helpers live in owning folders, not as src/core siblings", () => {
  const leftovers = ["_code-signature.js", "_directive.js", "_git-hooks.js", "_post-process.js", "_tool-budget.js", "_untrusted.js"].filter((name) =>
    existsSync(join(src, "core", name)),
  );

  assert.deepEqual(leftovers, [], "fold each helper behind its folder barrel");
  assert.ok(existsSync(join(src, "core/cache/_code-signature.js")));
  assert.ok(existsSync(join(src, "core/directive/_directive.js")));
  assert.ok(existsSync(join(src, "core/git-hooks/_git-hooks.js")));
  assert.ok(existsSync(join(src, "core/post-process/_post-process.js")));
  assert.ok(existsSync(join(src, "core/enforcement/_tool-budget.js")));
  assert.ok(existsSync(join(src, "core/enforcement/_untrusted.js")));
});

test("the six action tools live behind src/tools/actions, not as src/tools siblings", () => {
  const leftovers = ["_compress.js", "_plan.js", "_plan-docs.js", "_stats.js", "_update.js", "_usage.js"].filter((name) => existsSync(join(src, "tools", name)));

  assert.deepEqual(leftovers, [], "fold each action tool behind the actions barrel");

  for (const name of leftovers.length === 0 ? ["_compress.js", "_plan.js", "_plan-docs.js", "_stats.js", "_update.js", "_usage.js"] : []) {
    assert.ok(existsSync(join(src, "tools/actions", name)), `${name} belongs under actions`);
  }

  const loader = readFileSync(join(src, "core/skills/_load.js"), "utf8");

  assert.match(loader, /registerActionTools/, "the catalog calls one family registrar");
  assert.doesNotMatch(
    loader,
    /registerCompressTool|registerPlanTool|registerPlanDocsTool|registerStatsTool|registerUsageTool|registerUpdateTool/,
    "and does not name the six siblings",
  );
});
