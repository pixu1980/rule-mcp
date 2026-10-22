

/**
 * @module test/cache-tiers/fixture
 *
 * R2: the normalized key, and knowing which tier answered.
 *
 * The cache keyed on the raw argument string, so "react button component" and
 * "a button component in React" were the same question and two entries. The
 * router already normalizes a prompt into tokens to score it; L1 keys on that,
 * so "what a prompt means" has one definition in this codebase.
 *
 * The measurement matters as much as the layer. P7 spent a phase optimizing the
 * wrong twelve percent because nobody had recorded where the weight was, so
 * every call now reports the tier that answered it and the path it arrived by.
 *
 * @see docs/plans/deterministic-cache.md - sections 3 and 8
 */

import test from "node:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const stateDir = mkdtempSync(join(tmpdir(), "rule-tiers-"));
process.env.RULE_MCP_STATE_DIR = stateDir;
delete process.env.RULE_MCP_NO_CACHE;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
process.env.RULE_MCP_NO_TELEMETRY = "1";

export const { cacheKey, normalizedKey, cacheLookup, cacheLookupSemantic, cacheStore, cacheClear } = await import("../index.js");
export const { registerTool, callTool, entryPathOf } = await import("../../../../tools/router/index.js");

export const result = (text) => ({ content: [{ type: "text", text }] });
