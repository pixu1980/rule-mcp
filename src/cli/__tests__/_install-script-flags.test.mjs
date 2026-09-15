

/**
 * The bootstraps only forward what `setup` spells, and spell all of it.
 *
 * `install.sh` and `install.ps1` reject unknown `--flags` before any
 * download, from a static list - the shell runs before node exists, so it
 * cannot ask. The list is the contract: this pins it against the `setup`
 * command source on both sides (every flag helped, every listed flag real)
 * and against its twin script (two bootstraps, one surface).
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../../..", import.meta.url).pathname;
const sh = readFileSync(`${root}scripts/install.sh`, "utf8");
const ps1 = readFileSync(`${root}scripts/install.ps1`, "utf8");
const wizard = readFileSync(`${root}src/cli/_register-wizard.js`, "utf8");

/** `--flag` words out of a shell word list, without regex escaping games. */
const wordsOf = (text, name) => {
  const line = text.split("\n").find((l) => l.includes(name));

  assert.ok(line, `${name} must exist for the sync to mean anything`);

  const inner = line.includes("@(") ? line.slice(line.indexOf("@(") + 2, line.lastIndexOf(")")) : line.split("=", 2)[1].replaceAll('"', "");

  return inner.replaceAll("'", "").replaceAll(",", " ").split(/\s+/).filter(Boolean);
};

/** Every `--flag` the `setup` command declares, with whether it takes a value. */
const setupFlags = () => {
  const flags = new Map([
    // Commander built-ins: never declared, always accepted.
    ["help", false],
    ["version", false],
  ]);
  const re = /(?:\.option|new Option)\("(--[a-z-]+)( ([^"]+))?"/g;
  let match;

  for (match = re.exec(wizard); match; match = re.exec(wizard)) {
    flags.set(match[1].slice(2), Boolean(match[3]?.includes("<")));
  }

  return flags;
};

test("the POSIX bootstrap lists every setup flag and nothing else", () => {
  const known = new Set(wordsOf(sh, "KNOWN_SETUP_FLAGS"));
  const cli = setupFlags();

  for (const flag of cli.keys()) {
    assert.ok(known.has(flag), `install.sh must forward --${flag} instead of rejecting it`);
  }

  for (const flag of known) {
    assert.ok(cli.has(flag), `install.sh lists --${flag}, which setup no longer spells`);
  }
});

test("the Windows bootstrap lists the same flags", () => {
  const known = new Set(wordsOf(ps1, "KnownSetupFlags"));
  const cli = setupFlags();

  assert.deepEqual([...known].sort(), [...cli.keys()].sort(), "two bootstraps, one surface");
});

test("both bootstraps agree on which flags take a separate value", () => {
  const shValues = new Set(wordsOf(sh, "VALUE_SETUP_FLAGS"));
  const ps1Values = new Set(wordsOf(ps1, "ValueSetupFlags"));
  const cliValues = new Set([...setupFlags()].filter(([, takes]) => takes).map(([flag]) => flag));

  assert.deepEqual([...shValues].sort(), [...cliValues].sort(), "sh must skip the values it forwards");
  assert.deepEqual([...ps1Values].sort(), [...cliValues].sort(), "ps1 must skip the values it forwards");
});
