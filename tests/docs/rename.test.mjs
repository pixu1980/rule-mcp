import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const OLD = ["rule", "galaxy", "mcp"].join("-");
const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const ALLOWED = [/^docs\/adr\//u, /^docs\/handoff\//u, /^docs\/reviews\//u, /^docs\/audits\//u, /^CHANGELOG\.md$/u, /^docs\/migrations\/rule-mcp-rename\.md$/u];

/**
 * True when a path is a historical record or the migration note.
 * @param {string} path repository-relative path
 * @returns {boolean}
 */
function allowed(path) {
  return ALLOWED.some((pattern) => pattern.test(path));
}

/**
 * Tracked files whose contents still carry the pre-rename name.
 * @returns {string[]}
 */
function offendersInContent() {
  try {
    const output = execFileSync("git", ["grep", "-l", "-z", "-e", OLD, "--"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    return output.split("\0").filter(Boolean);
  } catch (error) {
    if (error.status === 1) {
      return [];
    }
    throw error;
  }
}

/**
 * Tracked paths that still carry the pre-rename name.
 * @returns {string[]}
 */
function offendersInPaths() {
  const output = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" });
  return output
    .split("\0")
    .filter(Boolean)
    .filter((path) => path.includes(OLD));
}

test("no live file carries the pre-rename server name", () => {
  assert.deepEqual(
    offendersInContent().filter((path) => !allowed(path)),
    [],
  );
});

test("no live path carries the pre-rename server name", () => {
  assert.deepEqual(
    offendersInPaths().filter((path) => !allowed(path)),
    [],
  );
});

test("package and registry metadata carry the RuleMCP identity", () => {
  const pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, "utf8"));
  assert.equal(pkg.name, "rule-mcp");
  assert.equal(pkg.bin["rule-mcp"], "./bin/rule-mcp.js");
  assert.equal(pkg.repository, "github:pixu1980/rule");

  const server = JSON.parse(readFileSync(`${ROOT}/server.json`, "utf8"));
  assert.equal(server.name, "io.github.pixu1980/rule");
  assert.equal(server.title, "RuleMCP");
  assert.equal(server.packages[0].identifier, "rule-mcp");
});
