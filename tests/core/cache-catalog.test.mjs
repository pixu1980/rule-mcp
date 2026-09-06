/**
 * @module test/cache-catalog.test
 *
 * R7: the catalog. A cache is private to one machine; a catalog is the part of
 * it a team inherits, so it is committed, readable, and only ever holds answers
 * that still reproduce.
 *
 * The rules under test are the ones that keep it honest. An entry earns its
 * place by being reused and by recomputing to the same bytes at export time. A
 * catalog entry never outranks something this machine computed, never survives
 * a skill edit it depended on, and never carries an absolute path off the
 * machine that wrote it.
 */

import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-catalog-state-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.RULE_MCP_NO_CACHE;

const { cacheStore, cacheLookup, cacheClear, cacheEntries, promotableEntries, skillDigest } =
  await import("../../src/core/cache/_tool-cache.js");
const { CATALOG_FILE, MIN_HITS, catalogPath, buildCatalog, writeCatalog, readCatalog, primeFromCatalog, verifyCache } =
  await import("../../src/core/cache/_catalog.js");

/** A skill that exists, so its digest is real and freshness can be checked. */
const SKILL = "rule-frontend-react";

const result = (text) => ({ content: [{ type: "text", text }] });
const args = (prompt) => ({ prompt });

let project;

before(() => {
  project = mkdtempSync(join(tmpdir(), "rule-catalog-project-"));
});

beforeEach(() => {
  cacheClear();
});

// ── What an entry has to remember ──

test("an entry records what it would take to run it again", () => {
  cacheStore("pix_tool", args("react button"), result("routed"), { [SKILL]: skillDigest(SKILL) });
  const [entry] = cacheEntries();

  assert.equal(entry.tool, "pix_tool", "the tool that produced it");
  assert.deepEqual(entry.args, { prompt: "react button" }, "and the arguments it was given");
  assert.equal(entry.hits, 0, "a stored entry has not been reused yet");
});

test("a hit is counted, a miss is not", () => {
  cacheStore("pix_tool", args("react button"), result("routed"), {});
  cacheLookup("pix_tool", args("react button"));
  cacheLookup("pix_tool", args("react button"));
  cacheLookup("pix_tool", args("nothing stored for this"));

  const hits = cacheEntries().reduce((sum, entry) => sum + entry.hits, 0);
  assert.equal(hits, 2, "two hits, and the miss counts for nothing");
});

// ── Promotion ──

test("promotion takes three reuses, because once is an accident", () => {
  cacheStore("pix_tool", args("react button"), result("routed"), {});
  for (let index = 0; index < MIN_HITS - 1; index++) {
    cacheLookup("pix_tool", args("react button"));
  }
  assert.deepEqual(promotableEntries(), [], `${MIN_HITS - 1} reuses is not enough`);

  cacheLookup("pix_tool", args("react button"));
  assert.equal(promotableEntries().length, 1, `${MIN_HITS} reuses promotes it`);
});

test("an entry that no longer reproduces is dropped, not exported", async () => {
  cacheStore("pix_tool", args("stable"), result("same"), {});
  cacheStore("pix_tool", args("drifted"), result("was this"), {});
  for (const prompt of ["stable", "drifted"]) {
    for (let index = 0; index < MIN_HITS; index++) {
      cacheLookup("pix_tool", args(prompt));
    }
  }

  const { catalog, promoted, dropped } = await buildCatalog({
    recompute: (tool, callArguments) => (callArguments.prompt === "drifted" ? result("is now that") : result("same")),
  });

  assert.equal(promoted.length, 1, "only the entry that still reproduces is promoted");
  assert.equal(catalog.entries[0].args.prompt, "stable");
  assert.equal(dropped.length, 1, "and the drifted one is reported rather than silently skipped");
  assert.equal(dropped[0].reason, "unstable");
});

test("an absolute path never reaches the catalog", async () => {
  cacheStore("rule_tool_gateway_core", { prompt: "x", path: "/Users/someone/projects/thing" }, result("core"), {});
  for (let index = 0; index < MIN_HITS; index++) {
    cacheLookup("rule_tool_gateway_core", { prompt: "x", path: "/Users/someone/projects/thing" });
  }

  const { catalog, dropped } = await buildCatalog({ recompute: () => result("core") });

  assert.equal(catalog.entries.length, 0, "the entry is not exported");
  assert.equal(dropped[0]?.reason, "local-path", "and the reason says why");
  assert.equal(JSON.stringify(catalog).includes("/Users/"), false, "nothing path-shaped survives");
});

// ── The file ──

test("the same cache exports byte-identical catalogs", async () => {
  for (const prompt of ["b second", "a first"]) {
    cacheStore("pix_tool", args(prompt), result(prompt), {});
    for (let index = 0; index < MIN_HITS; index++) {
      cacheLookup("pix_tool", args(prompt));
    }
  }
  const options = { recompute: (tool, callArguments) => result(callArguments.prompt), now: "2026-09-01" };

  const first = await buildCatalog(options);
  const second = await buildCatalog(options);

  assert.equal(JSON.stringify(first.catalog), JSON.stringify(second.catalog), "no run-to-run variation");
  assert.deepEqual(
    first.catalog.entries.map((entry) => entry.args.prompt),
    ["a first", "b second"],
    "entries are sorted, so a diff shows a change rather than a reshuffle",
  );
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
  assert.ok(
    readFileSync(catalogPath(project), "utf8").endsWith("\n"),
    "ends with a newline, like every other committed file",
  );
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

// ── The reason verify exists ──

test("the cached core carries no per-call identity", async () => {
  const { postprocessToolResult, stampRequestId } = await import("../../src/core/enforcement.js");
  const core = postprocessToolResult("rule_tool_search", { query: "x" }, result("found"));

  assert.equal(
    core._meta.pixEnforcement.requestId,
    undefined,
    "a fresh id in the core makes two runs of the same call differ, and a replay hand back an older call's id",
  );
  assert.equal(
    JSON.stringify(core),
    JSON.stringify(postprocessToolResult("rule_tool_search", { query: "x" }, result("found"))),
  );

  const stamped = stampRequestId(core, "test-id");
  assert.equal(stamped._meta.pixEnforcement.requestId, "test-id", "it is stamped after the cache instead");
  assert.notEqual(
    stampRequestId(core)._meta.pixEnforcement.requestId,
    stampRequestId(core)._meta.pixEnforcement.requestId,
    "and two stamps of the same core are two different calls",
  );
});

// ── The honesty check ──

test("verifying does not count as using", async () => {
  cacheStore("pix_tool", args("counted"), result("same"), {});

  await verifyCache({ recompute: () => result("same") });

  const hits = cacheEntries().reduce((sum, entry) => sum + entry.hits, 0);
  assert.equal(hits, 0, "an entry must not earn promotion by being verified");
});

test("verify recomputes every entry and names the ones that drifted", async () => {
  cacheStore("pix_tool", args("stable"), result("same"), {});
  cacheStore("pix_tool", args("drifted"), result("was this"), {});

  const report = await verifyCache({
    recompute: (tool, callArguments) => (callArguments.prompt === "drifted" ? result("is now that") : result("same")),
  });

  assert.equal(report.checked, 2);
  assert.equal(report.drifted.length, 1);
  assert.equal(report.drifted[0].args.prompt, "drifted");
});
