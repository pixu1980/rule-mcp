

/**
 * The test suites, defined once, by glob.
 *
 * A suite is globs plus optional serial steps. New `*.test.mjs` files are
 * picked up by the pattern that covers their directory - adding a test never
 * edits package.json or ci.yml again (ADR 061, phase 6).
 *
 * - `steps`: plain node scripts that run serially, in order, before the globs
 *   (they are not `node --test` files: smoke prints its own report, docs-scan
 *   walks the docs tree).
 * - `globs`: expanded and handed to one `node --test` invocation, which runs
 *   each file in its own child process.
 * - `shell`: [command, ...args] tuples run after the tests (syntax checks).
 * - `include`: other suites composed in, deduplicated.
 */
export const SUITES = {
  quick: {
    steps: ["tests/smoke.mjs", "src/core/skills/__tests__/_ai.test.mjs", "src/core/skills/__tests__/_detector.test.mjs", "src/core/skills/__tests__/_framework-routing.test.mjs"],
  },
  skills: {
    // The asset trees ship their own node:test files beside the code they cover,
    // in tests/ rather than __tests__, so nothing rooted at src/ or tests/
    // reaches them. Two files under skills/ belong to another runner and stay
    // out: demo.test.js is a Playwright spec, and _parse-csv.test.js is a vitest
    // example that runs in the user's project.
    globs: ["skills/**/tests/*.test.js", "skills/**/scripts/*.test.mjs"],
    exclude: ["skills/rule-frontend-workers/examples/src/tasks/_parse-csv.test.js"],
  },
  foundations: {
    globs: ["tests/docs/**/*.test.mjs", "src/**/__tests__/*.test.mjs", "scripts/**/__tests__/*.test.mjs", "skills/**/__tests__/*.test.mjs"],
    include: ["skills"],
  },
  installer: {
    globs: ["src/cli/**/__tests__/*.test.mjs"],
    shell: [
      ["bash", "-n", "scripts/install.sh"],
      ["bash", "-n", "scripts/uninstall.sh"],
    ],
  },
  all: {
    steps: ["tests/smoke.mjs", "tests/docs/docs-scan.mjs"],
    include: ["foundations", "installer"],
  },
};
