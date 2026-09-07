/** The vanilla-template-load guardrail: each Pattern C permutation. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { vanillaTemplateLoad } from "../_template-load.js";

const check = (code) => vanillaTemplateLoad.check(code);

test("non-custom-elements pass as skipped", () => {
  assert.equal(check("const x = 1;").pass, true, "plain code is skipped");
  assert.equal(check("class App {}").pass, true, "a non-CE class is skipped");
});

test("a CE loading its template by html() alone fails", () => {
  const result = check("class C extends HTMLElement { async render() { this.innerHTML = await html`${load()} `; } }");
  assert.equal(result.pass, true, "no template.html reference means no pattern");
});

test("html() plus fetch is accepted", () => {
  const result = check('class C extends HTMLElement { render() { html(await (await fetch(new URL("./_C.template.html", import.meta.url))).text()); } }');
  assert.equal(result.pass, true, "fetch + template.html satisfies");
});

test("html() with an html call but no fetch is reported as the missing-load pattern", () => {
  const code = 'class C extends HTMLElement { r() { const ref = "./_C.template.html"; html(render(ref)); } }';
  const result = check(code);
  assert.equal(result.pass, false, "the cleanup pattern fails the guard");
  assert.match(result.suggestion ?? "", /fetch/, "the suggestion names fetch");
});

test("bundle-text import style is accepted", () => {
  const code = 'import tpl from "bundle-text:./_C.template.html"; class C extends HTMLElement { r() { html(tpl); } }';
  const result = check(code);
  assert.equal(result.pass, true, "bundle-text counts as a load");
});
