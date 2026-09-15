

/**
 * The rows the commands step offers, built from the resolved catalog.
 *
 * Pure, and tested without a terminal for the reason the folder is split that
 * way. What matters in each row is the price: a preset whose count is
 * invisible is a preset chosen blind, and an area that does not say how many
 * skills it carries is the same lie one level down.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { areaItems, familyItems, presetItems, skillItems } from "../_commands-items.js";

test("every preset states what it costs, and custom is the way out", () => {
  const items = presetItems();
  const custom = items.at(-1);

  assert.ok(items.length > 1, "there is more than the escape hatch");
  assert.equal(custom.id, "custom", "custom is last, because it is the way out of the one-screen case");

  for (const item of items.slice(0, -1)) {
    assert.match(item.label, /\(\d+\)$/, `${item.id} names its count: ${item.label}`);
    assert.ok(
      item.detail.some((line) => /Writes \d+ command files per agent directory\./.test(line)),
      `${item.id} spells the price out`,
    );
  }
});

test("every family row carries its count and its hint", () => {
  const items = familyItems();

  assert.ok(items.length > 0);

  for (const item of items) {
    assert.equal(typeof item.id, "string");
    assert.ok(
      item.detail.some((line) => /\d+ commands, with the router\./.test(line)),
      `${item.id} states how many commands it is: ${JSON.stringify(item.detail)}`,
    );
  }
});

test("every area row counts its members and previews at most eight", () => {
  const items = areaItems();

  assert.ok(items.length > 0, "the catalog groups into areas");

  for (const item of items) {
    assert.match(item.note, /^\d+$/, "the note is the member count");
    assert.equal(item.detail[0], `The ${item.id} hub and its ${item.note} skills.`, "the first line repeats it in words");
    assert.ok(
      item.detail.every((line) => line !== ""),
      "empty lines are filtered out, so no row ends in a gap",
    );
  }
});

test("an area with more than eight skills says how many it did not list", () => {
  const big = areaItems().find((item) => Number(item.note) > 8);

  if (!big) {
    return;
  }

  assert.ok(
    big.detail.some((line) => /^and \d+ more$/.test(line)),
    `the overflow is named: ${JSON.stringify(big.detail)}`,
  );
  assert.equal(big.detail.filter((line) => line.startsWith("rule-")).length, 8, "exactly eight are previewed");
});

test("skill rows are grouped under a heading per area", () => {
  const items = skillItems(["frontend"]);
  const headings = items.filter((item) => item.section);

  assert.deepEqual(
    headings.map((item) => item.label),
    ["frontend"],
    "one heading for the one area asked for",
  );
  assert.ok(items.length > headings.length, "and the area's skills follow it");

  const rows = items.filter((entry) => !entry.section);

  for (const item of rows) {
    assert.ok(
      item.detail.some((line) => line.startsWith("Writes /rule-area-")),
      `${item.id} says which command it writes: ${JSON.stringify(item.detail)}`,
    );
  }
});

test("no area named offers every area", () => {
  const all = skillItems().filter((item) => item.section).length;

  assert.equal(all, areaItems().length, "every area gets a heading");
  assert.equal(skillItems([]).filter((item) => item.section).length, all, "an empty list is the same as none");
});

test("an area nobody has is dropped rather than rendered empty", () => {
  assert.deepEqual(skillItems(["not-an-area"]), [], "no heading for an area the catalog does not hold");
  assert.deepEqual(
    skillItems(["frontend", "not-an-area"])
      .filter((item) => item.section)
      .map((item) => item.label),
    ["frontend"],
    "the real one still renders",
  );
});
