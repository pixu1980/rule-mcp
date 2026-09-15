

/**
 * Resolve `@src/*` to this package's `src/`.
 *
 * The server is one package with a deep tree, and a module five levels down
 * reaching a sibling subsystem through `../../../..` says nothing about where
 * it is going. `@src/core/text/index.js` does.
 *
 * A skill's guardrails never use this alias, and import nothing at all: the
 * helpers they need arrive in the context the check is called with (ADR 079),
 * so a rule file resolves the same wherever the skill is dropped.
 *
 * Registered with `--import ./scripts/alias-hook.mjs` on every entry point that
 * loads server code: `bin/`, the npm scripts, the git hooks, the test runner
 * and every process a test spawns. Not in the shebang: a shebang takes one
 * argument on Linux, so `node --import ...` there would arrive as a single
 * unknown flag.
 *
 * `module.registerHooks` runs the hook in-thread and synchronously, so it also
 * covers `require` and the dynamic imports the skill loader makes. It needs
 * Node 22.15 or newer. A worker thread has its own module graph: a parent
 * started with `--import` passes the flag down to its workers, while a parent
 * that imports this file dynamically (the `bin` entry) must pass `--import` to
 * the worker explicitly - see `core/guardrails/guarded/_messaging.js`.
 */

import { registerHooks } from "node:module";

const SRC = new URL("../src/", import.meta.url).href;
const PREFIX = "@src/";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith(PREFIX)) {
      return nextResolve(specifier, context);
    }

    return { url: new URL(specifier.slice(PREFIX.length), SRC).href, shortCircuit: true };
  },
});
