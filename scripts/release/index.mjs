#!/usr/bin/env node
/**
 * @module scripts/release
 *
 * `pnpm release`: cut a release of this server from main.
 *
 * The version is derived from the commits since the last release tag, unless
 * `--version` forces one (ADR 133: the first cut is `v0.1.0`). The run bumps
 * the manifests, regenerates the census and the changelog, runs `pnpm run ci`,
 * commits `chore(release): vX.Y.Z`, tags it, and pushes main and the tag
 * atomically.
 *
 *   pnpm release                         the whole run
 *   pnpm release --dry-run               the plan, and nothing else
 *   pnpm release --version 0.1.0         force this SemVer (first cut)
 *   pnpm release --no-checks             skip `pnpm run ci`
 *   pnpm release --no-push               commit and tag locally, push nothing
 *
 * @see docs/adr/130-this-server-releases-itself-with-pnpm-release-and-the-push-is-the-release.md
 * @see docs/adr/133-first-release-is-v0-1-0-then-semver-from-commits.md
 */

import { fileURLToPath } from "node:url";

import { applyRelease } from "./_apply.mjs";
import { planRelease } from "./_plan.mjs";

export { applyRelease } from "./_apply.mjs";
export { planRelease, RELEASE_BRANCH, RELEASE_REMOTE, resolveReleaseVersion, VERSION_SHAPE } from "./_plan.mjs";

/**
 * CLI flags for a release run.
 *
 * @param {string[]} argv
 * @returns {{ dryRun: boolean, push: boolean, checks: boolean, version: string | null }}
 */
export function parseReleaseArgv(argv) {
  const options = { dryRun: false, push: true, checks: true, version: null };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--dry-run") {
      options.dryRun = true;
    } else if (token === "--no-push") {
      options.push = false;
    } else if (token === "--no-checks") {
      options.checks = false;
    } else if (token === "--version") {
      options.version = argv[index + 1] ?? "";
      index += 1;
    } else if (token.startsWith("--version=")) {
      options.version = token.slice("--version=".length);
    } else {
      throw new Error(`unknown release flag: ${token}`);
    }
  }

  return options;
}

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
  const flags = parseReleaseArgv(argv);
  const plan = await planRelease({ version: flags.version });

  console.log(render(plan));

  if (plan.refusals.length > 0) {
    process.exitCode = 1;

    return;
  }

  if (flags.dryRun) {
    console.log("\nA dry run: nothing was written.");

    return;
  }

  const options = {
    push: flags.push,
    ...(flags.checks ? {} : { check: async () => {} }),
  };
  const result = await applyRelease(plan, options);

  console.log(`\nReleased ${result.tag} at ${result.commit.slice(0, 7)}${result.pushed ? ", pushed" : ", not pushed"}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
