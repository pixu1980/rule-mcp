/**
 * The `reinstall` command: one shell script behind the CLI.
 *
 * The handler takes its script path, spawn and existence probe as arguments,
 * so this never runs the real purge - the CLI is the third entry point to the
 * script, not a second implementation of it.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { reinstallCommand } from "../commands/_reinstall.js";

test("reinstall delegates to the shell script with inherited stdio", () => {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0 };
  };

  reinstallCommand({ script: "/checkout/scripts/reinstall.sh", spawn, exists: () => true });

  assert.equal(calls.length, 1, "one process");
  assert.equal(calls[0].command, "bash", "the script runs under bash");
  assert.deepEqual(calls[0].args, ["/checkout/scripts/reinstall.sh"], "with the resolved script");
  assert.equal(calls[0].options.stdio, "inherit", "the output streams to the user");
});

test("a missing script fails without spawning anything", () => {
  const before = process.exitCode;
  const calls = [];
  reinstallCommand({ script: "/nope/reinstall.sh", spawn: (...args) => calls.push(args), exists: () => false });

  assert.equal(calls.length, 0, "nothing is spawned");
  assert.equal(process.exitCode, 1, "the command reports failure");
  process.exitCode = before;
});

test("the child's exit code becomes the command's exit code", () => {
  const before = process.exitCode;
  reinstallCommand({ script: "/checkout/scripts/reinstall.sh", spawn: () => ({ status: 3 }), exists: () => true });

  assert.equal(process.exitCode, 3, "a failed install is not reported as success");
  process.exitCode = before;
});

test("the program declares the reinstall command", async () => {
  const { buildProgram } = await import("../_program.js");
  const program = buildProgram();
  const command = program.commands.find((entry) => entry.name() === "reinstall");

  assert.ok(command, "reinstall is part of the command surface");
  assert.match(command.description(), /node_modules/i, "the description says what it purges");
});
