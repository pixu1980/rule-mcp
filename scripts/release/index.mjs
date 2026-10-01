#!/usr/bin/env node


/**
 * @module scripts/release
 *
 * `pnpm release`: cut a release of this server from main.
 *
 * The version is derived from the commits since the last release tag, never
 * chosen. The run bumps the manifests, regenerates the census and the
 * changelog, runs `pnpm run ci`, commits `chore(release): vX.Y.Z`, tags it,
 * and pushes main and the tag atomically.
 *
 *   pnpm release              the whole run
 *   pnpm release --dry-run    the plan, and nothing else
 *   pnpm release --no-checks  skip `pnpm run ci`
 *   pnpm release --no-push    commit and tag locally, push nothing
 *
 * @see docs/adr/130-this-server-releases-itself-with-pnpm-release-and-the-push-is-the-release.md
 */

import { fileURLToPath } from "node:url";

import { applyRelease } from "./_apply.mjs";
import { planRelease } from "./_plan.mjs";

export { applyRelease } from "./_apply.mjs";
export { planRelease, RELEASE_BRANCH, RELEASE_REMOTE } from "./_plan.mjs";

/** The plan as a person reads it. */
function render(plan) {
  return [
    `branch   ${plan.branch} (${plan.ahead} ahead, ${plan.behind} behind origin)`,
    `version  ${plan.current} -> ${plan.next || "-"} (${plan.bump}, ${plan.commits} commit(s))`,
    `tag      ${plan.tag || "-"}`,
    ...plan.refusals.map((refusal) => `refused  ${refusal}`),
  ].join("\n");
}

async function main(argv) {
  const plan = await planRelease();

  console.log(render(plan));

  if (plan.refusals.length > 0) {
    process.exitCode = 1;

    return;
  }

  if (argv.includes("--dry-run")) {
    console.log("\nA dry run: nothing was written.");

    return;
  }

  const options = {
    push: !argv.includes("--no-push"),
    ...(argv.includes("--no-checks") ? { check: async () => {} } : {}),
  };
  const result = await applyRelease(plan, options);

  console.log(
    `\nReleased ${result.tag} at ${result.commit.slice(0, 7)}${result.pushed ? ", pushed" : ", not pushed"}.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
