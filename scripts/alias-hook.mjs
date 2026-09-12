/**
 * Resolve `@src/*` to this package's `src/`.
 *
 * The server is one package with a deep tree, and a module five levels down
 * reaching a sibling subsystem through `../../../..` says nothing about where
 * it is going. `@src/core/text/index.js` does.
 *
 * Registered with `--import ./scripts/alias-hook.mjs` on every entry point
 * that loads server code: `bin/`, the package scripts, and the test runner.
 * A file that uses the alias is therefore NOT runnable by a bare `node` - that
 * is the cost of an alias without a bundler, and it is why the alias is only
 * used inside `src/`, never in a skill's guardrails. Those import
 * `@rule-mcp/sdk`, which is a real package and resolves anywhere.
 *
 * `module.registerHooks` runs the hook in-thread and synchronously, so it also
 * covers `require`, worker threads started after registration, and the dynamic
 * imports the loader makes. It needs Node 22.15 or newer.
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
