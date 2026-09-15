

/**
 * The argv one `agent-commands --sync` run gets, and the sentence the plan
 * shows for it.
 *
 * Both are pure, and both are the same question asked twice: which agents,
 * and which commands. A step that forgets either writes files into hosts
 * nobody picked, or writes every command when the user asked for twelve.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { commandSyncArgs, commandsTask, rulesTask } from "../_task-extras.js";
import { selectionLabel } from "../_commands-items.js";

test("the bare run syncs everything, and says nothing more", () => {
  assert.deepEqual(commandSyncArgs(), ["agent-commands", "--sync"], "no options is the whole-catalog run");
  assert.deepEqual(commandSyncArgs({}), ["agent-commands", "--sync"]);
});

test("each flag appears only when it was asked for", () => {
  assert.deepEqual(commandSyncArgs({ dryRun: true }), ["agent-commands", "--sync", "--dry-run"]);
  assert.deepEqual(commandSyncArgs({ force: true }), ["agent-commands", "--sync", "--force"]);
  assert.deepEqual(commandSyncArgs({ remove: true }), ["agent-commands", "--sync", "--remove"]);
});

test("the agent list is one comma-separated flag, and an empty list is no flag", () => {
  assert.deepEqual(commandSyncArgs({ agents: ["claude", "codex"] }), ["agent-commands", "--sync", "--agent", "claude,codex"]);
  assert.deepEqual(commandSyncArgs({ agents: [] }), ["agent-commands", "--sync"], "no agents named means no narrowing");
});

test("the flags keep their order, so the argv is comparable between runs", () => {
  assert.deepEqual(commandSyncArgs({ agents: ["claude"], dryRun: true, force: true, remove: true }), [
    "agent-commands",
    "--sync",
    "--remove",
    "--dry-run",
    "--force",
    "--agent",
    "claude",
  ]);
});

test("a selection rides on the same argv", () => {
  assert.deepEqual(commandSyncArgs({ selection: { preset: "minimal" } }), ["agent-commands", "--sync", "--preset", "minimal"]);
  assert.deepEqual(commandSyncArgs({ agents: ["claude"], selection: { areas: ["frontend"] } }), ["agent-commands", "--sync", "--agent", "claude", "--areas", "frontend"]);
});

test("no selection is every command, and so is a selection that narrowed nothing", () => {
  assert.equal(selectionLabel(null), "every command");
  assert.equal(selectionLabel({}), "every command", "an object with no field narrows nothing");
  assert.equal(selectionLabel({ families: [], areas: [], skills: [] }), "every command", "and neither do empty lists");
});

test("a preset label carries the price of the preset", () => {
  assert.match(selectionLabel({ preset: "minimal" }), /^preset minimal \(\d+\)$/, "the count is what makes a preset a choice rather than a word");
});

test("families, areas and skills each contribute to the label", () => {
  assert.equal(selectionLabel({ families: ["areas", "tasks"] }), "areas+tasks");
  assert.equal(selectionLabel({ areas: ["frontend", "backend"] }), "frontend,backend");
  assert.equal(selectionLabel({ skills: ["a", "b", "c"] }), "3 skills", "skills are counted, because naming them would not fit");
  assert.equal(selectionLabel({ families: ["areas"], areas: ["frontend"], skills: ["a"] }), "areas - frontend - 1 skills");
});

test("the rules task names the agents it was given, or says it sweeps them all", () => {
  assert.equal(rulesTask().detail, "every instruction file on this machine");
  assert.equal(rulesTask(["claude", "codex"]).detail, "claude, codex");
});

test("the commands task detail states both halves of the question", () => {
  assert.equal(commandsTask(false).detail, "every detected agent directory - every command");
  assert.equal(commandsTask(false, ["claude"], { areas: ["frontend"] }).detail, "claude - frontend");
});
