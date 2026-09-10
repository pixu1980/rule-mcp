

/**
 * PERF-8: what a `--help` is allowed to load.
 *
 * stdio spawns this server per client, so every module the entry point parses
 * is parsed again on the next connect. `--help` used to pay 216 ms because the
 * registrars imported their handlers statically, and the handlers pull the MCP
 * server, both transports, the installer and 105 tool registrations. Deferring
 * the handlers into the actions took it to 48 ms (`pnpm report:startup`).
 *
 * A wall-time assertion would be flaky, so this asserts the property that
 * produced the number: the heavy graph must not be reachable from the entry
 * point through STATIC imports. A dynamic import inside an action is fine -
 * that is the whole mechanism.
 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";

const ROOT = resolve(new URL("../../..", import.meta.url).pathname);

/** Static specifiers only: `import x from "y"` and `export * from "y"`. */
const STATIC_RE = /^\s*(?:import|export)\s[^;]*?from\s*["'](\.[^"']+)["']/gm;
const BARE_IMPORT_RE = /^\s*import\s*["'](\.[^"']+)["']/gm;

/** Resolve a relative specifier the way Node would. */
function resolveSpec(fromFile, spec) {
  const base = join(dirname(fromFile), spec);

  for (const candidate of [base, `${base}.js`, join(base, "index.js")]) {
    if (existsSync(candidate) && !candidate.endsWith("/")) {
      return candidate;
    }
  }

  return null;
}

/** Every file reachable from `entry` through static imports. */
function staticGraph(entry) {
  const seen = new Set();
  const queue = [resolve(ROOT, entry)];

  while (queue.length > 0) {
    const file = queue.pop();

    if (seen.has(file) || !existsSync(file)) {
      continue;
    }

    seen.add(file);
    const source = readFileSync(file, "utf8");

    for (const pattern of [STATIC_RE, BARE_IMPORT_RE]) {
      for (const match of source.matchAll(pattern)) {
        const target = resolveSpec(file, match[1]);

        if (target) {
          queue.push(target);
        }
      }
    }
  }

  return new Set([...seen].map((file) => relative(ROOT, file)));
}

test("the CLI entry point does not statically import the tool or server graph", () => {
  const graph = staticGraph("src/index.js");
  const forbidden = [
    "src/tools/router/index.js",
    "src/core/skills/index.js",
    "src/core/bm25/index.js",
    "src/server/index.js",
    "src/transport/index.js",
    "src/cli/install/index.js",
  ];
  const leaked = forbidden.filter((file) => graph.has(file));

  assert.deepEqual(leaked, [], `these are loaded before the command that needs them is known:\n${leaked.join("\n")}`);
});

test("the commander program is still built statically, so help text cannot drift", () => {
  const graph = staticGraph("src/index.js");

  for (const file of ["src/cli/_program.js", "src/cli/_register-info.js", "src/cli/_register-setup.js", "src/cli/_register-server.js", "src/cli/_register-session.js"]) {
    assert.ok(graph.has(file), `${file} must stay a static import: it declares commands and options that --help renders`);
  }
});

test("the bin loads the app dynamically, so the compile cache is on first", () => {
  const bin = readFileSync(join(ROOT, "bin/rule-mcp.js"), "utf8");

  assert.match(bin, /enableCompileCache/, "the bin turns the compiled code cache on");
  assert.match(bin, /await import\("\.\.\/src\/index\.js"\)/, "and loads the app after it, dynamically");
  assert.doesNotMatch(bin, /^\s*import .* from "\.\.\/src\//m, "a static import here is hoisted above the cache");
});

test("every command declared by the program is still dispatchable", async () => {
  const { buildProgram } = await import("../_program.js");
  const program = buildProgram();
  const names = program.commands.map((command) => command.name());

  assert.ok(names.length >= 20, `the full surface must still be declared, got ${names.length}`);

  for (const expected of ["help", "serve", "install", "tools", "config", "doctor", "adr", "skills", "fix", "update"]) {
    assert.ok(names.includes(expected), `${expected} disappeared from the program`);
  }

  for (const command of program.commands) {
    assert.equal(typeof command._actionHandler, "function", `${command.name()} has no action`);
  }
});
