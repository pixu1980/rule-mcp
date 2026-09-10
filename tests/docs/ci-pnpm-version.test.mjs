import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The workflow must name the pnpm version, and the manifest may not.
 *
 * `package.json` cannot carry `packageManager`: the manifest guardrail bans it
 * and `devEngines.packageManager` (corepack then owns the install and can
 * refuse it offline or behind a proxy). That removes the only source
 * `pnpm/action-setup@v4` falls back to, so a `uses:` without a `version` input
 * fails with "No pnpm version is specified" before the job runs a single step
 * - every job red in ten seconds, for a missing string.
 *
 * This pins the contract: every setup step declares a version, the workflows
 * agree on one exact version, and if `packageManager` ever returns to the
 * manifest it says the same thing (the action refuses a mismatch).
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflowsDir = join(root, ".github", "workflows");
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;
const ENV_REFERENCE = /^\$\{\{\s*env\.PNPM_VERSION\s*\}\}$/;

/** The `version:` value of the step whose `- uses:` sits at `index`, if any. */
function versionInput(lines, index) {
  const indent = lines[index].search(/\S/u);

  for (let cursor = index + 1; cursor < lines.length; cursor++) {
    const line = lines[cursor];
    if (line.trim() === "") {
      continue;
    }
    if (line.search(/\S/u) <= indent) {
      return;
    }
    const match = /^\s+version:\s*(\S.*?)\s*$/u.exec(line);
    if (match) {
      return match[1];
    }
  }

  return;
}

console.log("ci workflow contract test");

const workflows = readdirSync(workflowsDir).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"));
assert.ok(workflows.length > 0, "at least one workflow file must exist");

const setupSteps = [];

for (const name of workflows) {
  const text = readFileSync(join(workflowsDir, name), "utf8");
  const lines = text.split("\n");

  for (const [index, line] of lines.entries()) {
    if (!/uses:\s*pnpm\/action-setup@/u.test(line)) {
      continue;
    }

    const version = versionInput(lines, index);
    assert.ok(version, `${name}:${index + 1}: pnpm/action-setup has no "version" input - the manifest cannot supply one (no packageManager by policy), so the action would fail`);

    if (ENV_REFERENCE.test(version)) {
      const declared = /^\s*PNPM_VERSION:\s*["']?(\S+?)["']?\s*$/mu.exec(text)?.[1];
      assert.ok(declared, `${name}: the setup step points at env.PNPM_VERSION but the workflow never defines it`);
      assert.ok(EXACT_VERSION.test(declared), `${name}: PNPM_VERSION must be an exact version, got "${declared}"`);
      setupSteps.push(declared);
      continue;
    }

    assert.ok(EXACT_VERSION.test(version), `${name}:${index + 1}: pnpm version must be exact, got "${version}"`);
    setupSteps.push(version);
  }
}

assert.ok(setupSteps.length > 0, "no workflow installs pnpm - this contract would pass vacuously");
assert.equal(new Set(setupSteps).size, 1, `workflows disagree on the pnpm version: ${[...new Set(setupSteps)].join(", ")}`);

const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (manifest.packageManager !== undefined) {
  assert.equal(manifest.packageManager, `pnpm@${setupSteps[0]}`, "packageManager and the workflow pin must name the same version - a mismatch is ERR_PNPM_BAD_PM_VERSION");
}

console.log(`  ✅ every pnpm/action-setup step pins ${setupSteps[0]}`);
