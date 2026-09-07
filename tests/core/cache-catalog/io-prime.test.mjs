/** The committed file: byte-identical export, read-back, floor semantics, priming. */
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  CATALOG_FILE,
  MIN_HITS,
  SKILL,
  args,
  buildCatalog,
  cacheClear,
  cacheLookup,
  cacheStore,
  catalogPath,
  primeFromCatalog,
  project,
  readCatalog,
  result,
  skillDigest,
  writeCatalog,
} from "./_catalog.fixture.mjs";

beforeEach(() => {
  cacheClear();
});

test("a written catalog reads back as it was written", async () => {
  cacheStore("pix_tool", args("react button"), result("routed"), { [SKILL]: skillDigest(SKILL) });
  for (let index = 0; index < MIN_HITS; index++) {
    cacheLookup("pix_tool", args("react button"));
  }
  const { catalog } = await buildCatalog({ recompute: () => result("routed"), now: "2026-09-01" });

  writeCatalog(project, catalog);
  assert.ok(existsSync(catalogPath(project)), `writes ${CATALOG_FILE}`);
  assert.deepEqual(readCatalog(project), catalog);
  assert.ok(readFileSync(catalogPath(project), "utf8").endsWith("\n"), "ends with a newline, like every other committed file");
});

// ── Reading it back ──

test("a catalog entry is a floor, never an override", () => {
  const catalog = {
    version: 1,
    generatedAt: "2026-09-01",
    serverVersion: "test",
    entries: [
      {
        tool: "pix_tool",
        args: { prompt: "react button" },
        dependsOn: {},
        hits: 9,
        result: result("from the catalog"),
      },
    ],
  };
  writeCatalog(project, catalog);

  cacheStore("pix_tool", args("react button"), result("computed here"), {});
  primeFromCatalog(project);

  const hit = cacheLookup("pix_tool", args("react button"));
  assert.equal(hit.result.content[0].text, "computed here", "what this machine computed wins");
});

test("a primed catalog entry answers, and reports an ordinary tier", () => {
  writeCatalog(project, {
    version: 1,
    generatedAt: "2026-09-01",
    serverVersion: "test",
    entries: [
      {
        tool: "pix_tool",
        args: { prompt: "react button" },
        dependsOn: {},
        hits: 9,
        result: result("from the catalog"),
      },
    ],
  });

  const { loaded } = primeFromCatalog(project);
  assert.equal(loaded, 1);

  const hit = cacheLookup("pix_tool", args("react button"));
  assert.equal(hit?.result.content[0].text, "from the catalog");
  assert.ok(["exact", "normalized"].includes(hit.tier), "the catalog is not a third tier");
});

test("a catalog entry whose skill has moved is not served", () => {
  writeCatalog(project, {
    version: 1,
    generatedAt: "2026-09-01",
    serverVersion: "test",
    entries: [
      {
        tool: "pix_tool",
        args: { prompt: "react button" },
        dependsOn: { [SKILL]: "0000000000000000" },
        hits: 9,
        result: result("stale"),
      },
    ],
  });

  primeFromCatalog(project);
  assert.equal(cacheLookup("pix_tool", args("react button")), undefined, "freshness applies to inherited answers too");
});

test("a corrupt catalog is ignored, never fatal", () => {
  writeFileSync(catalogPath(project), "{ not json");
  assert.deepEqual(primeFromCatalog(project), { loaded: 0, skipped: 0 });
  assert.equal(readCatalog(project), undefined);
});

test("no cache means no catalog either", () => {
  writeCatalog(project, {
    version: 1,
    generatedAt: "2026-09-01",
    serverVersion: "test",
    entries: [
      {
        tool: "pix_tool",
        args: { prompt: "react button" },
        dependsOn: {},
        hits: 9,
        result: result("from the catalog"),
      },
    ],
  });

  process.env.RULE_MCP_NO_CACHE = "1";
  try {
    assert.equal(primeFromCatalog(project).loaded, 0, "the opt-out covers every tier, including the inherited one");
  } finally {
    delete process.env.RULE_MCP_NO_CACHE;
  }
});
