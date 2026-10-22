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

test("SECURITY.md supported versions match the active 0.1.x release line (OSS-02)", () => {
  const policy = readFileSync(join(root, "SECURITY.md"), "utf8");
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const server = JSON.parse(readFileSync(join(root, "server.json"), "utf8"));
  const [major, minor] = manifest.version.split(".", 2);
  const activeLine = `${major}.${minor}.x`;

  assert.equal(manifest.version, server.version, "package.json and server.json versions must match");
  assert.match(policy, new RegExp(String.raw`\|\s*${activeLine.replaceAll(".", String.raw`\.`)}\s*\|\s*:white_check_mark:\s*\|`, "u"));
  assert.match(policy, /\|\s*<\s*0\.1\.0\s*\|\s*:x:\s*\|/u);
});

test("CODE_OF_CONDUCT.md and GOVERNANCE.md define BDFL recusal and independent escalation (OSS-03)", () => {
  const conduct = readFileSync(join(root, "CODE_OF_CONDUCT.md"), "utf8");
  const governance = readFileSync(join(root, "GOVERNANCE.md"), "utf8");

  assert.ok(conduct.includes("https://github.com/contact/report-abuse"), "CODE_OF_CONDUCT.md must name the independent abuse escalation channel");
  assert.match(conduct, /recus/iu, "CODE_OF_CONDUCT.md must state the BDFL recusal policy");
  assert.ok(governance.includes("https://github.com/contact/report-abuse"), "GOVERNANCE.md must name the independent abuse escalation channel");
  assert.match(governance, /recus/iu, "GOVERNANCE.md must state the BDFL recusal policy");
});

test("CONTRIBUTING.md and MAINTAINERS.md agree on business-day response targets (OSS-04)", () => {
  const contributing = readFileSync(join(root, "CONTRIBUTING.md"), "utf8");
  const maintainers = readFileSync(join(root, "MAINTAINERS.md"), "utf8");

  assert.ok(contributing.includes("2 business days"), "CONTRIBUTING.md must state 2 business days for issue triage");
  assert.ok(contributing.includes("7 business days"), "CONTRIBUTING.md must state 7 business days for PR review");
  assert.ok(maintainers.includes("2 business days"), "MAINTAINERS.md must state 2 business days for issue triage");
  assert.ok(maintainers.includes("7 business days"), "MAINTAINERS.md must state 7 business days for PR review");
});

test("GOVERNANCE.md defines annual aggregate funding disclosure and local branch-protection tracking (OSS-06)", () => {
  const governance = readFileSync(join(root, "GOVERNANCE.md"), "utf8");
  const funding = readFileSync(join(root, ".github", "FUNDING.yml"), "utf8");

  assert.match(funding, /^github:\s*pixu1980\s*$/mu, ".github/FUNDING.yml must point at github: pixu1980");
  assert.match(governance, /annual/iu, "GOVERNANCE.md must specify an annual reporting cadence");
  assert.match(governance, /aggregate/iu, "GOVERNANCE.md must specify aggregate disclosure without exposing donor identities");
  assert.ok(!governance.includes("docs/plans/oss.md"), "GOVERNANCE.md must not point at a plan file absent on this branch");
});
