import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * Vulnerability reports must have a private channel (OSS-2).
 *
 * SECURITY.md once routed every report into a public issue, publishing
 * the vulnerability before a fix exists. The policy must name the
 * private advisory form first, promise an acknowledgment SLA, and state
 * the coordinated-disclosure window - and the issue chooser must link
 * the same form so a security report cannot silently become public.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ADVISORY_PATH = "/security/advisories/new";

test("SECURITY.md names the private advisory channel first", () => {
  const policy = readFileSync(join(root, "SECURITY.md"), "utf8");

  assert.ok(policy.includes(`github.com/pixu1980/rule-mcp${ADVISORY_PATH}`), "the reporting section must link the private GitHub advisory form");
  assert.ok(policy.includes("3 business days"), "the policy must promise an acknowledgment SLA");
  assert.ok(/90-day/i.test(policy), "the policy must state the coordinated-disclosure window");
});

test("the issue chooser links the private form and disables blank issues", () => {
  const file = join(root, ".github", "ISSUE_TEMPLATE", "config.yml");

  assert.ok(existsSync(file), ".github/ISSUE_TEMPLATE/config.yml must exist");

  const config = readFileSync(file, "utf8");

  assert.ok(config.includes(ADVISORY_PATH), "the chooser must link the private advisory form");
  assert.ok(/blank_issues_enabled:\s*false/.test(config), "blank issues must stay disabled");
});
