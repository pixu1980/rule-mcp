

/**
 * The wizard asks which commands to write, and the flags answer the same way.
 *
 * A full install is one command per skill in every agent directory. The
 * selection that narrows it is data (`src/cli/install/_selection.js`), so the
 * wizard step, the `--commands-preset` family of flags and the
 * `agent-commands --sync` run it spawns all have to agree - a step whose
 * answer the plan drops is a question that lied.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { selectionArgs, selectionOf } from "../../install/_selection-flags.js";
import { buildInstallPlan } from "../_plan-install.js";
import { commandSyncArgs } from "../_task-extras.js";
import { resolveSetupOptions } from "../_options.js";
import { setupOptions } from "../_entry.js";

/** A flag reader over a fake argv, the shape `_entry.js` expects. */
const io = (argv) => ({
  getArgument: (name) => {
    const index = argv.indexOf(name);

    return index === -1 ? undefined : argv[index + 1];
  },
  hasFlag: (name) => argv.includes(name),
});

test("no selection flag means no selection, which every caller reads as all of them", () => {
  assert.equal(selectionOf({}), null);
  assert.deepEqual(selectionArgs(null), []);
});

test("a selection survives the round trip through the argv of the sync run", () => {
  assert.deepEqual(selectionArgs({ preset: "minimal" }), ["--preset", "minimal"]);
  assert.deepEqual(selectionArgs(selectionOf({ preset: "full" })), ["--preset", "full"]);
  assert.deepEqual(selectionArgs({ families: ["areas", "tasks"], areas: ["frontend"], skills: ["rule-mcp-frontend-react"] }), [
    "--families",
    "areas,tasks",
    "--areas",
    "frontend",
    "--skills",
    "rule-mcp-frontend-react",
  ]);
});

test("the commands step reaches the sync run rather than stopping at the screen", () => {
  const args = commandSyncArgs({ agents: ["claude"], selection: { preset: "minimal" } });

  assert.ok(args.includes("--preset") && args.includes("minimal"), args.join(" "));

  const plan = buildInstallPlan({ agents: ["claude"], extras: { commands: true }, selection: { preset: "minimal" } });
  const task = plan.find((entry) => entry.id === "commands");

  assert.ok(task, "the plan writes commands when the step was kept");
  assert.match(task.detail, /minimal/, `the review screen says what it will write: ${task.detail}`);
});

test("the flags and the wizard carry the same selection", () => {
  const parsed = setupOptions("install", io(["--commands-preset", "standard"]));

  assert.equal(parsed.selection.preset, "standard");
  assert.deepEqual(resolveSetupOptions(parsed).selection, { preset: "standard", families: undefined, areas: undefined, skills: undefined });

  const custom = setupOptions("install", io(["--commands-families", "areas", "--commands-areas", "frontend,data"]));

  assert.deepEqual(resolveSetupOptions(custom).selection, {
    preset: undefined,
    families: ["areas"],
    areas: ["frontend", "data"],
    skills: undefined,
  });
  assert.equal(resolveSetupOptions({}).selection, null, "an unanswered install writes everything, as it did before");
});
