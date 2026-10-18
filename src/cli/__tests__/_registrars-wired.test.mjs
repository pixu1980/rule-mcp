

/**
 * Every registrar written is a registrar wired, and every CLI command the
 * prompts name exists.
 *
 * A command file that nobody calls is invisible: `init` shipped in six
 * references, in this repository's own prompts and docs, with no registration
 * behind it. The first test closes that gap for the registrars; the second
 * closes it for the words a prompt tells a reader to type.
 */
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { listAgentCommands } from "../../core/agents/commands/index.js";
import { buildProgram } from "../_program.js";

const CLI_DIR = new URL("..", import.meta.url).pathname;

/** The `register*Command` functions the registrar modules export. */
function registrarExports() {
  const found = [];

  const names = readdirSync(CLI_DIR).filter((name) => /^_register-.*\.js$/.test(name));

  for (const file of names) {
    const source = readFileSync(join(CLI_DIR, file), "utf8");

    for (const match of source.matchAll(/export function (register[A-Za-z]+Command)/g)) {
      found.push({ file, fn: match[1] });
    }
  }

  return found;
}

test("every registrar is imported and called by the program", () => {
  const program = readFileSync(join(CLI_DIR, "_program.js"), "utf8");
  const orphans = [];

  for (const { fn } of registrarExports()) {
    if (!program.includes(fn)) {
      orphans.push(fn);
    }
  }

  assert.deepEqual(orphans, [], "a registrar that is never wired is a command that does not exist");
});

test("every CLI command a prompt tells the reader to run is registered", () => {
  const registered = new Set(buildProgram().commands.map((command) => command.name()));
  const missing = new Set();

  for (const command of listAgentCommands()) {
    for (const match of command.body.matchAll(/`?rule-mcp ([a-z][a-z-]*)/g)) {
      const name = match[1];

      if (!registered.has(name)) {
        missing.add(`${command.name} names \`rule-mcp ${name}\``);
      }
    }
  }

  assert.deepEqual([...missing], [], "a prompt that names an unregistered command sends the reader to an error");
});
