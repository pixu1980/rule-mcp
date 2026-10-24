

/**
 * Shell completions: valid scripts that cover the real command surface.
 *
 * The generators are hand-written strings, so nothing but a test stops them
 * drifting from the commander program they are supposed to complete. They did:
 * the scripts listed 12 commands while the CLI had 21, so a user tab-completing
 * `fix`, `cache` or `roles` got nothing.
 */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { buildProgram } from "../../_program.js";
import { generateCompletions } from "../index.js";

const COMMANDS = buildProgram()
  .commands.map((command) => command.name())
  .filter((name) => name !== "help");

/** Write a script to a scratch file and hand it to a syntax checker. */
function syntaxCheck(command, arguments_, script) {
  const box = mkdtempSync(join(tmpdir(), "rule-mcp-completions-"));
  const file = join(box, "completion");
  writeFileSync(file, script);

  try {
    return spawnSync(command, [...arguments_, file], { encoding: "utf8" });
  } finally {
    rmSync(box, { recursive: true, force: true });
  }
}

test("every shell gets a non-empty script, and an unknown shell falls back to zsh", () => {
  for (const shell of ["zsh", "bash", "fish"]) {
    assert.ok(generateCompletions(shell).length > 0, `${shell}: the generator must produce a script`);
  }

  assert.equal(generateCompletions("nushell"), generateCompletions("zsh"), "an unknown shell falls back to zsh");
  assert.equal(generateCompletions(), generateCompletions("zsh"), "no shell falls back to zsh");
});

/**
 * Where each shell declares a completable command. Matching the whole script
 * would pass on a name that only appears inside a description, which is how a
 * drift test quietly stops testing anything.
 */
const DECLARES = {
  zsh: (script, name) => script.includes(`'${name}:`),
  bash: (script, name) => new RegExp(String.raw`commands="[^"]*\b${name}\b`, "s").test(script),
  fish: (script, name) => new RegExp(String.raw`__fish_use_subcommand" -a ${name}\b`).test(script),
};

test("each script completes every command the program registers", () => {
  for (const [shell, declares] of Object.entries(DECLARES)) {
    const script = generateCompletions(shell);
    const missing = COMMANDS.filter((name) => !declares(script, name));

    assert.deepEqual(missing, [], `${shell}: commands the completion cannot complete: ${missing.join(", ")}`);
  }
});

test("the bash script is valid bash", () => {
  const result = syntaxCheck("bash", ["-n"], generateCompletions("bash"));

  assert.equal(result.status, 0, `bash -n rejected the generated script:\n${result.stderr}`);
});

test("the zsh script is valid zsh when zsh is installed", (t) => {
  const probe = spawnSync("zsh", ["--version"], { encoding: "utf8" });

  if (probe.status !== 0) {
    t.skip("zsh is not installed on this machine");

    return;
  }

  const result = syntaxCheck("zsh", ["-n"], generateCompletions("zsh"));
  assert.equal(result.status, 0, `zsh -n rejected the generated script:\n${result.stderr}`);
});

test("each script names itself and its install path", () => {
  assert.match(generateCompletions("zsh"), /^#compdef rule-mcp/, "zsh completions must open with the compdef tag");
  assert.match(generateCompletions("bash"), /complete -F _rule_mcp rule-mcp/, "bash must register the completion function");
  assert.match(generateCompletions("fish"), /complete -c rule-mcp/, "fish must register completions for the command");
});
