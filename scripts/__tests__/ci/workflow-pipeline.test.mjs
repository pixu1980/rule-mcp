/**
The workflows run as one pipeline, not as five independent runs.

Two properties this pins:

1. The workflow audit is a job of `ci`, not a workflow of its own. A separate
   `check-workflows.yml` cost a second run per push and a second place to keep
   the zizmor settings in step.
2. The site deploys only after `ci` succeeds on `main`. The publish used to
   start on the push itself, so a red run could still ship the tree. The
   `workflow_run` trigger puts the deploy in series behind the gate, and the
   job guard reads the conclusion of the run it waits for.
*/
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const workflows = join(root, ".github", "workflows");
const ci = readFileSync(join(workflows, "ci.yml"), "utf8");
const pages = readFileSync(join(workflows, "pages.yml"), "utf8");

/** The block of one top-level job, from its key to the next one. */
function job(workflow, name) {
  const at = workflow.search(new RegExp(`^ {2}${name}:$`, "mu"));

  assert.notEqual(at, -1, `the ${name} job is missing`);

  const rest = workflow.slice(at + 1);
  const end = rest.search(/^ {2}\w[\w-]*:$/mu);

  return end === -1 ? rest : rest.slice(0, end);
}

test("the workflow audit is a job of ci, and its own workflow is gone", () => {
  assert.ok(!existsSync(join(workflows, "check-workflows.yml")), "a second workflow for one job is a second run per push");

  const audit = job(ci, "workflows");

  assert.match(audit, /zizmorcore\/zizmor-action@/u, "the job runs zizmor");
  assert.match(audit, /advanced-security: false/u, "code scanning stays off");
  assert.match(audit, /annotations: true/u, "findings surface as annotations");
  assert.match(audit, /actions: read/u, "zizmor reads the workflow files");
});

test("the site deploys only after ci succeeds on main", () => {
  const trigger = pages.slice(0, pages.search(/^permissions:/mu));

  assert.match(trigger, /workflow_run:/u, "the publish waits for another workflow");
  assert.match(trigger, /workflows: \["ci"\]/u, "it waits for ci");
  assert.match(trigger, /types: \[completed\]/u, "it reads a finished run");
  assert.match(trigger, /branches: \[main\]/u, "only main publishes");
  assert.match(pages, /github\.event\.workflow_run\.conclusion == 'success'/u, "a failed run must not publish");
  assert.match(pages, /github\.event\.workflow_run\.head_sha/u, "the publish checks out the tree the run measured");
});

test("a superseded ci run is cancelled", () => {
  assert.match(ci, /^concurrency:$/mu, "ci declares a concurrency group");
  assert.match(ci, /cancel-in-progress: true/u, "a newer push cancels the older run");
});
