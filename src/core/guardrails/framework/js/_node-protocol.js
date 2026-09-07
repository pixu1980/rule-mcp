/** Guardrail `js-node-protocol`: node: protocol for Node builtins */
import { countedVerdict } from "../../../../shared/index.js";
export const jsNodeProtocol = {
  id: "js-node-protocol",
  label: "node: protocol for Node builtins",
  description: "Node builtin imports must use the explicit node: prefix (import fs from 'node:fs'). The bare form can be shadowed by a same-named npm package.",
  check: (code) => {
    const builtins = [
      "fs",
      "path",
      "util",
      "url",
      "os",
      "http",
      "https",
      "crypto",
      "stream",
      "events",
      "buffer",
      "child_process",
      "assert",
      "querystring",
      "readline",
      "worker_threads",
      "perf_hooks",
      "zlib",
      "dns",
      "net",
      "tls",
      "timers",
      "string_decoder",
      "vm",
      "module",
      "process",
      "async_hooks",
      "cluster",
      "constants",
      "domain",
      "inspector",
      "punycode",
      "repl",
      "sys",
      "trace_events",
      "tty",
      "v8",
      "wasi",
      "test",
    ];
    const re = new RegExp(String.raw`from\s*['"](?:${builtins.join("|")})(?:/[\w.-]*)?['"]`, "g");
    const violations = code.match(re) || [];

    if (violations.length === 0) {
      return { pass: true, note: "No bare node builtin imports found" };
    }

    return countedVerdict(violations, { suggestion: "Use the node: prefix: import fs from 'node:fs'; import { join } from 'node:path'." });
  },
};
