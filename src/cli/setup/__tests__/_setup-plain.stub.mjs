/** Test double for setup/_plain.js used by _setup-index-branches.test.mjs. */

const control = () => globalThis.__ruleSetupBranches;

export async function runPlain() {
  const fail = control()?.plainMode === "fail";

  return {
    results: [],
    counts: { ok: fail ? 0 : 1, warn: 0, skip: 0, fail: fail ? 1 : 0, total: 1 },
  };
}

export function printSummary() {
  const fail = control()?.plainMode === "fail";

  return { ok: fail ? 0 : 1, warn: 0, skip: 0, fail: fail ? 1 : 0, total: 1 };
}
