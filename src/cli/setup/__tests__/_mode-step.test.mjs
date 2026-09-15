

/**
 * The mode step: daemon and docker are discouraged, never removed, when the
 * selected agents cannot use them.
 *
 * The discouragement is text on the rows the picker already shows, so the
 * question stays one screen: a removed row would hide the reason, and a
 * second confirm screen would punish whoever already read the first one.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { MODE_ITEMS, modeItemsFor } from "../_step-mode.js";

test("every agent supported means no discouragement", () => {
  const labels = new Map(modeItemsFor(["pi", "vscode"]).map((item) => [item.id, item.label]));

  assert.equal(labels.get("stdio"), "stdio");
  assert.equal(labels.get("daemon"), "daemon");
  assert.equal(labels.get("docker"), "docker");
});

test("an agent without remote support marks daemon and docker, not stdio", () => {
  const labels = new Map(modeItemsFor(["cursor", "pi"]).map((item) => [item.id, item.label]));

  assert.equal(labels.get("stdio"), "stdio", "stdio works everywhere, always");
  assert.match(labels.get("daemon"), /not recommended/, "the row says why, not just no");
  assert.match(labels.get("daemon"), /cursor/, "the row names who cannot use it");
  assert.match(labels.get("docker"), /not recommended/);
});

test("no agents left means the remote modes are discouraged", () => {
  const labels = new Map(modeItemsFor([]).map((item) => [item.id, item.label]));

  assert.match(labels.get("daemon"), /not recommended/, "with nobody to serve, stdio is the safe default");
});

test("the static items stay the all-supported wording", () => {
  assert.equal(MODE_ITEMS.find((item) => item.id === "daemon").label, "daemon");
});
