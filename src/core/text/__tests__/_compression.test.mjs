/**
 * @module test/compression.test
 *
 * Unit tests for the deterministic output compressor: it must trim prose filler
 * while preserving code fences, inline code, URLs, headings, and JSON verbatim.
 */

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("=== Compression Compressor Tests ===\n");

import { compressText, compressResult } from "../../../../src/core/text/_compression.js";

// ── T1: filler + leading articles removed from prose ──
const prose = "This is really just the button component that you actually want.";
const c1 = compressText(prose);
check("T1 removes filler words", !/\b(really|just|actually)\b/i.test(c1));
check("T1.1 removes leading articles", !/\bthe button\b/i.test(c1));
check("T1.2 keeps substance", c1.includes("button component"));

// ── T2: code fences preserved verbatim ──
const withCode = "Use this:\n```js\nconst a = the_value; // really keep this\n```\ndone";
const c2 = compressText(withCode);
check("T2 preserves fenced code verbatim", c2.includes("const a = the_value; // really keep this"));

// ── T3: inline code and URLs preserved ──
const inline = "Call the `useTheReallyLongHook()` and see https://example.com/the/really/long really now";
const c3 = compressText(inline);
check("T3 preserves inline code span", c3.includes("`useTheReallyLongHook()`"));
check("T3.1 preserves URL", c3.includes("https://example.com/the/really/long"));

// ── T4: headings preserved ──
const heading = "## The Really Important Section\nprose the really here";
const c4 = compressText(heading);
check("T4 preserves heading line verbatim", c4.includes("## The Really Important Section"));

// ── T5: JSON left untouched ──
const json = JSON.stringify({ the: "really", a: [1, 2, 3] });
check("T5 JSON returned unchanged", compressText(json) === json);

// ── T6: idempotent ──
check("T6 idempotent", compressText(c1) === c1);

// ── T7: compressResult skips JSON content items, compresses prose items ──
const result = {
  content: [
    { type: "text", text: JSON.stringify({ route: "rule-frontend-react" }) },
    { type: "text", text: "This is really just prose." },
  ],
};
const cr = compressResult(result);
check("T7 JSON content item untouched", cr.content[0].text === result.content[0].text);
check("T7.1 prose content item compressed", !/\breally\b/i.test(cr.content[1].text));

// ── T8: opt-out ──
process.env.RULE_MCP_NO_COMPRESSION = "1";
const cr2 = compressResult(result);
check("T8 opt-out returns result unchanged", cr2.content[1].text === "This is really just prose.");
delete process.env.RULE_MCP_NO_COMPRESSION;

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 50);
