// test/architect-framework-neutral.test.mjs
//
// Phase 8 acceptance gate. The generated pack must NOT assert the prototype's
// vanilla-JS / Custom-Elements / Parcel stack as fact. A React (or any
// non-vanilla) project must never receive prose claiming it is "pure vanilla
// JavaScript", uses "Custom Elements v1", bundles with "Parcel", etc. — that
// content is now answer-driven, so with neutral answers the hardcoded literals
// must be absent entirely. Dead `../.agents/skills/rule-*` links must never
// ship either.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateContextContent } from "../skills/rule-architect/generator.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const spec = JSON.parse(readFileSync(join(ROOT, "skills/rule-architect/wizard-spec.json"), "utf-8"));
const templates = JSON.parse(readFileSync(join(ROOT, "skills/rule-architect/templates.json"), "utf-8"));

// A neutral React webapp whose ANSWERS contain none of the prototype phrasing,
// so any occurrence in the output must come from a hardcoded template literal.
const NEUTRAL = {
  PROJECT_NAME: "Shop API",
  PROJECT_TYPE: "webapp",
  FRONTEND_FRAMEWORK: "react",
  STACK_CSS_APPROACH: "css-modules",
  ARCH_PATTERN: "layered",
};

// Raw templates document the placeholder system and are exempt from
// genericization (they may show any example text verbatim).
const RAW = new Set(templates.filter((t) => t.raw).map((t) => t.output || t.path.replace(/^templates\//, "")));

const OVERFIT = [
  /pure vanilla JavaScript/i,
  /vanilla JS\b/i,
  /Custom Elements v1/i,
  /Light DOM/i,
  /Shadow DOM/i,
  /\bParcel\b/,
  /adoptedStyleSheets/,
  /Chrome\/Edge 80/,
  /Firefox 75/,
  /Safari 13\.1/,
  /\bIE11\b/,
  /latest \d+ versions of (Chrome|Firefox|Safari)/i,
  /rule-custom-element/,
  /rule-template-engine/,
  /rule-design-system/,
  /\.agents\/skills\/rule-/,
];

test("a neutral React pack ships no hardcoded vanilla/Custom-Elements/Parcel prose", () => {
  const files = generateContextContent(NEUTRAL, spec).filter((f) => !RAW.has(f.path));
  const offenders = [];
  for (const file of files) {
    for (const re of OVERFIT) {
      const m = file.content.match(re);
      if (m) {offenders.push(`${file.path}: /${re.source}/ -> "${m[0]}"`);}
    }
  }
  assert.deepEqual(offenders, [], `framework-overfit literals leaked:\n  ${offenders.join("\n  ")}`);
});

test("no dead ../.agents/skills/rule-* link ships in any emitted file", () => {
  const files = generateContextContent(NEUTRAL, spec).filter((f) => !RAW.has(f.path));
  for (const file of files) {
    assert.doesNotMatch(
      file.content,
      /\]\(\.\.\/\.agents\/skills\/rule-/,
      `${file.path} still links to a hardcoded skill path that will 404 in a real project`
    );
  }
});
