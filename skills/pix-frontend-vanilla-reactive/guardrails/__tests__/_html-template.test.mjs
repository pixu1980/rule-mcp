

/** The vanilla-html-template guardrail: component detection and the html`` requirement. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { vanillaHtmlTemplate } from "../_html-template.js";

const check = (code) => vanillaHtmlTemplate.check(code);

test("a module holding block-body arrows is not a component and is skipped", () => {
  const code = "const prices = rows.map((row) => { return row.price; });\nfunction total() { return 1; }";
  const result = check(code);

  assert.equal(result.pass, true, "a block-body arrow alone must not make the file a component");
  assert.match(result.note ?? "", /skipping/, "the rule says it skipped rather than passed by luck");
});

test("a data file exporting a const is skipped", () => {
  const code = "export const DEFAULTS = { list: [1].map((n) => { return n * 2; }) };";

  assert.equal(check(code).pass, true, "export const is not a component signature");
});

test("a Pattern B component without html fails", () => {
  const result = check('export function Card() { return "markup"; }');

  assert.equal(result.pass, false, "a component must use html``");
  assert.equal(result.failCount, 1, "one finding per component");
  assert.match(result.suggestion ?? "", /html`/, "the suggestion names html``");
});

test("a Pattern B component using html passes", () => {
  assert.equal(check("export function Card() { return html`<p>x</p>`; }").pass, true, "html`` satisfies");
});

test("a Pattern A custom element without html fails", () => {
  const code = 'class Card extends HTMLElement { render() { this.innerHTML = "markup"; } }';

  assert.equal(check(code).pass, false, "a custom element must use html``");
});

test("a Pattern A custom element using html passes", () => {
  const code = "class Card extends HTMLElement { render() { this.innerHTML = html`<p>x</p>`; } }";

  assert.equal(check(code).pass, true, "html`` satisfies");
});
