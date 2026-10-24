/**
 * @module test/review-docs/fixture
 *
 * Personas C.2: the trio's bookkeeping is deterministic. Shared plumbing for
 * the review-docs suite: a scratch project per case, the sample findings, and
 * the helper exports under test. The round trip is the point of the suite:
 * what the helper writes on one run is what it must read on the next.
 */
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

export const { readFindings, syncRoleDocs, validateTrio } = await import("../../../src/core/review/docs/index.js");

/** A project of its own for each case: these tests write files. */
export function project() {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-trio-"));

  mkdirSync(join(dir, ".git"), { recursive: true });

  return dir;
}

export const FINDINGS = [
  { id: "SEC-1", severity: "high", summary: "Token expiry compares with < instead of <=" },
  { id: "SEC-2", severity: "medium", summary: "Rate limit counts by token, not by remote" },
];

export const read = (dir, path) => readFileSync(join(dir, path), "utf8");
