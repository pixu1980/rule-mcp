/**
 * @module test/cache-catalog/fixture.test
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

import { mkdtempSync } from "node:fs";

import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-catalog-state-"));
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.RULE_MCP_NO_CACHE;

export const { cacheStore, cacheLookup, cacheClear, cacheEntries, promotableEntries, skillDigest } = await import("../../tool-cache/index.js");
export const { CATALOG_FILE, MIN_HITS, catalogPath, buildCatalog, writeCatalog, readCatalog, primeFromCatalog, verifyCache } = await import("../index.js");

/** A skill that exists, so its digest is real and freshness can be checked. */
export const SKILL = "rule-mcp-frontend-react";

export const result = (text) => ({ content: [{ type: "text", text }] });
export const args = (prompt) => ({ prompt });

export const project = mkdtempSync(join(tmpdir(), "rule-mcp-catalog-project-"));
