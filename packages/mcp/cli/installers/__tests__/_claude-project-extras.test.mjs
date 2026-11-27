/**
@module test/installers/claude-project-extras

A project-scope Claude install used to write the MCP entry and nothing else, so
the project had a server nobody could ask a question of: no rules block, no
`/rule-*` commands, no guard hooks. These are the files a global Claude install
writes, cut down to the project root.
*/

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { installClaudeProjectExtras, installProjectHost } from "../_install-project.js";
import { uninstallProjectHost } from "../_uninstall-project.js";
import { uninstallClaudeProjectExtras } from "../_uninstall-project.js";
import { INSTRUCTION_MARKER, RULES_MARKER } from "../_instruction.data.js";
import { HOOK_MARKER } from "../../../core/agents/_hook-commands.js";

const root = mkdtempSync(join(tmpdir(), "rule-claude-project-"));

test.after(() => rmSync(root, { recursive: true, force: true }));

test("the extras are the rules block, the slash commands and the hooks", () => {
  const written = installClaudeProjectExtras({ projectRoot: root, projectConfig: "shared", entrypoint: "/tmp/rule.js" });
  const instruction = readFileSync(join(root, "CLAUDE.md"), "utf8");
  const settings = readFileSync(join(root, ".claude", "settings.json"), "utf8");

  assert.ok(instruction.includes(INSTRUCTION_MARKER), "the short block is in the project's CLAUDE.md");
  assert.ok(instruction.includes(RULES_MARKER), "and the enforced-workflow block");
  assert.ok(settings.includes(HOOK_MARKER), "the guard hooks are in the project settings");
  assert.ok(
    written.some((file) => file.includes(join(".claude", "commands"))),
    "the slash commands are written",
  );
  assert.equal(
    written.some((file) => file.includes("settings.local.json")),
    false,
    "a shared install does not use the local file",
  );
});

test("the project hooks run the guard, not the server's serve subcommand", () => {
  const project = mkdtempSync(join(tmpdir(), "rule-claude-project-serve-"));

  try {
    installClaudeProjectExtras({ projectRoot: project, projectConfig: "local", entrypoint: "/tmp/rule.js" });

    const settings = JSON.parse(readFileSync(join(project, ".claude", "settings.local.json"), "utf8"));
    const commands = Object.values(settings.hooks).flatMap((entries) => entries.flatMap((entry) => entry.hooks.map((hook) => hook.command)));

    assert.ok(commands.length > 0, "the hooks are written");
    assert.ok(
      commands.every((command) => !/\bserve\b/.test(command)),
      "`serve guard` is rejected by the CLI: too many arguments for 'serve'",
    );
    assert.ok(commands.every((command) => / guard \S+ {2}#/.test(command)));
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("a local project config puts the hooks in settings.local.json", () => {
  const local = mkdtempSync(join(tmpdir(), "rule-claude-project-local-"));

  try {
    installClaudeProjectExtras({ projectRoot: local, projectConfig: "local", entrypoint: "/tmp/rule.js" });

    assert.ok(existsSync(join(local, ".claude", "settings.local.json")), "the private file holds the hooks");
    assert.equal(existsSync(join(local, ".claude", "settings.json")), false, "and the shared one is not created");
  } finally {
    rmSync(local, { recursive: true, force: true });
  }
});

test("installing into a project twice leaves one block and one hook", () => {
  const twice = mkdtempSync(join(tmpdir(), "rule-claude-project-twice-"));

  try {
    installClaudeProjectExtras({ projectRoot: twice, projectConfig: "shared", entrypoint: "/tmp/rule.js" });
    installClaudeProjectExtras({ projectRoot: twice, projectConfig: "shared", entrypoint: "/tmp/rule.js" });

    const instruction = readFileSync(join(twice, "CLAUDE.md"), "utf8");
    const settings = readFileSync(join(twice, ".claude", "settings.json"), "utf8");

    assert.equal(instruction.split(INSTRUCTION_MARKER).length - 1, 1, "one short block");
    assert.equal(settings.split(HOOK_MARKER).length > 1, true);
  } finally {
    rmSync(twice, { recursive: true, force: true });
  }
});

test("the host install writes the entry and the extras together", () => {
  const project = mkdtempSync(join(tmpdir(), "rule-claude-project-host-"));

  try {
    const { written } = installProjectHost({ agent: "claude", projectRoot: project, projectConfig: "shared", entrypoint: "/tmp/rule.js" });

    assert.ok(
      written.some((file) => file.endsWith(".mcp.json")),
      "the MCP entry",
    );
    assert.ok(
      written.some((file) => file.endsWith("CLAUDE.md")),
      "the rules block",
    );
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("an uninstall takes the extras back", () => {
  const project = mkdtempSync(join(tmpdir(), "rule-claude-project-remove-"));

  try {
    installClaudeProjectExtras({ projectRoot: project, projectConfig: "shared", entrypoint: "/tmp/rule.js" });
    uninstallClaudeProjectExtras({ projectRoot: project, projectConfig: "shared" });

    const instruction = readFileSync(join(project, "CLAUDE.md"), "utf8");
    const settings = readFileSync(join(project, ".claude", "settings.json"), "utf8");

    assert.equal(instruction.includes(RULES_MARKER), false, "the block is gone");
    assert.equal(settings.includes(HOOK_MARKER), false, "the hooks are gone");
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test("the host uninstall reports the extras it touched", () => {
  const project = mkdtempSync(join(tmpdir(), "rule-claude-project-host-remove-"));

  try {
    installProjectHost({ agent: "claude", projectRoot: project, projectConfig: "shared", entrypoint: "/tmp/rule.js" });
    const { written } = uninstallProjectHost({ agent: "claude", projectRoot: project, projectConfig: "shared" });

    assert.ok(written.some((file) => file.endsWith("CLAUDE.md")));
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
