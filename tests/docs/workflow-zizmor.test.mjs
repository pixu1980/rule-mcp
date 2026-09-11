import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * The zizmor job must run without GitHub code scanning (OSS-NEW).
 *
 * zizmor-action defaults to `advanced-security: true`, which uploads a SARIF
 * to GitHub Advanced Security. That step fails on repositories where code
 * scanning is not enabled, and it is unavailable on pull requests from forks.
 * The workflow opts out and surfaces findings as annotations instead, so the
 * gate still fails builds on real findings without depending on GHAS.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflow = readFileSync(join(root, ".github", "workflows", "check-workflows.yml"), "utf8");

function zizmorStep() {
  const at = workflow.search(/zizmorcore\/zizmor-action@/u);
  const window = workflow.slice(at, at + 800);

  assert.ok(at !== -1, "the zizmor action step is missing");

  return window;
}

function line(kind, value) {
  return new RegExp(String.raw`^\s*${kind}:\s*${value}\s*$`, "mu");
}

test("the zizmor step does not require GitHub code scanning", () => {
  const step = zizmorStep();

  assert.match(step, line("advanced-security", "false"), "advanced security upload must stay off");
});

test("the zizmor step annotates findings instead of uploading SARIF", () => {
  const step = zizmorStep();

  assert.match(step, line("annotations", "true"), "findings must surface as annotations");
});

test("no code-scanner permission is granted to the zizmor job", () => {
  const header = workflow.slice(0, workflow.search(/^jobs:\s*$/mu));

  assert.doesNotMatch(header, /security-events:\s*write/u, "workflow-level security-events must stay off");
});
