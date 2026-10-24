/** Test double for setup/_mount.js used by _setup-index-branches.test.mjs. */

export async function mountWizard() {
  globalThis.__ruleSetupBranches?.bumpMount();

  return {
    results: [],
    dryRun: true,
  };
}
