

/** The external-css guardrail: every framework path and the no-CSS pass. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { externalCss } from "../_external-css.js";

const check = (code, context = {}) => externalCss.check(code, context);

test("css files and stylesheets pass by definition", () => {
  assert.equal(check(".a { color: red; }", { fileName: "app.css" }).pass, true, "a css file is external css");
  assert.equal(check("[data-x] .a {}").pass, true, "a bare stylesheet passes");
});

test("framework-native imports pass", () => {
  assert.equal(check('import { Component } from "@angular/core"; styleUrls: ["./a.css"]', { framework: "angular" }).pass, true, "angular styleUrls pass");
  assert.equal(check("@Component({}) .css", { framework: "angular" }).pass, true, "angular component css passes");
  assert.equal(check('import "./a.css";', { framework: "svelte" }).pass, true, "svelte css imports pass");
  assert.equal(check("<style> h1 {}</style>", { framework: "svelte" }).pass, true, "svelte scoped styles pass");
  assert.equal(check('import styles from "./a.module.css";', { framework: "react" }).pass, true, "react modules pass");
  assert.equal(check('import "./a.css";', { framework: "solid" }).pass, true, "solid imports pass");
  assert.equal(check("adoptedStyleSheets.push(sheet); CSSStyleSheet", { framework: "vanilla" }).pass, true, "adoptedStyleSheets pass");
});

test("inline styles in markup fail with a suggestion", () => {
  const result = check("<style> h1 { color: red } </style>", { framework: "react" });
  assert.equal(result.pass, false, "inline style fails");
  assert.match(result.suggestion ?? "", /adoptedStyleSheets|CSS Module/i, "the suggestion names the path");
});

test("no css content passes as skipped", () => {
  assert.equal(check("const a = 1;", { framework: "react" }).pass, true, "no css means nothing to fail");
});
