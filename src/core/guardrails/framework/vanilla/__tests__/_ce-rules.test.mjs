/** Vanilla CE guardrails and the argument preprocessor. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { vanillaAdoptedStylesheets } from "../_adopted-stylesheets.js";
import { vanillaCeExtends } from "../_ce-extends.js";
import { preprocessToolCall } from "../../../../enforcement/index.js";

test("adopted-stylesheets: non-CE and proper fetch pass, css-only fails", () => {
  const notCe = vanillaAdoptedStylesheets.check("const x = 1;");
  assert.equal(notCe.pass, true, "non-CE code is skipped");

  const good = vanillaAdoptedStylesheets.check("class C extends HTMLElement { static { const s = new CSSStyleSheet(); s.replaceSync(text); this.adoptedStyleSheets = [s]; } }");
  assert.equal(good.pass, true, "CSSStyleSheet + replaceSync + adoptedStyleSheets pass");

  const cssOnly = vanillaAdoptedStylesheets.check("class C extends HTMLElement { connectedCallback() { use('./_C.css'); } }");
  assert.equal(cssOnly.pass, false, "a css reference without the sheet pipeline fails");
  assert.match(cssOnly.suggestion ?? "", /CSSStyleSheet|replaceSync/, "the suggestion names the pipeline");

  const none = vanillaAdoptedStylesheets.check("class C extends HTMLElement { connectedCallback() { render(); } }");
  assert.equal(none.pass, true, "no css means skip");
});

test("ce-extends: classes must extend HTMLElement with the registration block", () => {
  const notClass = vanillaCeExtends.check("function helper() {}");
  assert.equal(notClass.pass, true, "non-class code is skipped");

  const good = vanillaCeExtends.check("export class Tag extends HTMLElement { static { customElements.define('x-tag', this); } }");
  assert.equal(good.pass, true, "extends + define pass");
  assert.equal(vanillaCeExtends.check("export class Tag extends HTMLElement { static { vrComponent(this, { tag: 'x' }); } }").pass, true, "vrComponent passes too");

  const noExtends = vanillaCeExtends.check("export class Tag { static { vrComponent(this, {}); } }");
  assert.equal(noExtends.pass, false, "a missing extends fails");
  assert.match(noExtends.suggestion ?? "", /vrComponent|static/, "the suggestion says what to add");

  const noBlock = vanillaCeExtends.check("export class Tag extends HTMLElement { render() {} }");
  assert.equal(noBlock.pass, false, "a missing static block fails");
  assert.ok(JSON.stringify(noBlock.detail).includes("static"), "the failure names the block");
});

test("preprocessToolCall trims, validates and rejects oversize or blank-prompt calls", () => {
  const trimmed = preprocessToolCall("pix_tool", { prompt: "  x  " });
  assert.equal(trimmed.prompt, "x", "the prompt is trimmed");

  assert.throws(() => preprocessToolCall("pix_tool", {}), /non-blank prompt/, "a blank prompt is refused");
  assert.throws(() => preprocessToolCall("pix_tool", { prompt: "x".repeat(300_000) }), /exceed/, "an oversized prompt is refused");

  const other = preprocessToolCall("rule_tool_check", { code: "  const a = 1;  " });
  assert.equal(other.code, "  const a = 1;  ", "a non-normalized field stays intact");
});