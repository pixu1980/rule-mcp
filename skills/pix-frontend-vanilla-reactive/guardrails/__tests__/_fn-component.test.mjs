

/** The vanilla-fn-component guardrail: which declarations count as Pattern B. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { vanillaFnComponent } from "../_fn-component.js";

const check = (code) => vanillaFnComponent.check(code);

test("an all-caps const is a module value, not a component", () => {
  const result = check("export const DEFAULTS = { a: 1 };");

  assert.equal(result.pass, true, "SCREAMING_CASE is not PascalCase");
  assert.match(result.note ?? "", /skipping/, "the rule says it skipped rather than passed by luck");
});

test("a camelCase function is not a component", () => {
  assert.equal(check("export function getSortedIncomes() { return []; }").pass, true, "camelCase is not PascalCase");
});

test("a lower-case const is not a component", () => {
  assert.equal(check("export const helper = () => 1;").pass, true, "a lower-case name is not PascalCase");
});

test("a PascalCase function without html fails", () => {
  const result = check('export function Card() { return "markup"; }');

  assert.equal(result.pass, false, "a component must render");
  assert.equal(result.failCount, 1, "one finding per component");
});

test("a PascalCase function returning html passes", () => {
  assert.equal(check("export function Card() { return html`<p/>`; }").pass, true, "html`` satisfies");
});

test("a PascalCase const arrow with an expression body passes", () => {
  assert.equal(check("export const App = () => html`<p/>`;").pass, true, "an expression body returns the template");
});

test("a PascalCase const arrow with a block body passes", () => {
  assert.equal(check("export const App = () => { return html`<p/>`; }").pass, true, "a block body needs the return");
});

test("a custom element is left to the Pattern A rules", () => {
  const result = check("class Card extends HTMLElement {}");

  assert.equal(result.pass, true, "a CE is not Pattern B");
  assert.match(result.note ?? "", /Pattern A/, "the note names the pattern it defers to");
});
