/**
 * @module test/cache-invalidation/fixture
 *
 * R3: an edit to one skill drops the entries that depend on it, and nothing else.
 *
 * The namespace was `pkg.version : mtime of skills/`, so a heading changed in
 * one skill dropped every entry for all 88. On this repository, where most
 * sessions edit skills, that made the cache close to ornamental.
 *
 * The tests deliberately do not mutate `skills/`. An entry stored with a stale
 * digest for a real skill is indistinguishable, from the cache's point of view,
 * from an entry stored before that skill was edited - and it is the mechanism
 * that needs proving, not the filesystem.
 *
 * @see docs/plans/deterministic-cache.md - section 4
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const stateDir = mkdtempSync(join(tmpdir(), "rule-invalidation-"));
process.env.RULE_MCP_STATE_DIR = stateDir;
delete process.env.RULE_MCP_NO_CACHE;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";

export const { cacheStore, cacheLookup, cacheClear, skillDigest, cacheEntries } = await import("../tool-cache/index.js");
export const { callTool, dependenciesOf } = await import("../../../tools/router/index.js");
export const { loadAllSkills } = await import("../../skills/index.js");

await loadAllSkills(true);

export const result = (text) => ({ content: [{ type: "text", text }] });
export const REAL_SKILL = "rule-frontend-react";
