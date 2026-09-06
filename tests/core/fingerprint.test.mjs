/**
 * @module test/fingerprint.test
 *
 * The tells that mark a text as machine-written: em dashes nobody types, curly
 * quotes nobody types either, and British spelling the house style does not use.
 * The transformer removes them from prose and leaves everything else alone -
 * code, inline spans, URLs and JSON are data, and rewriting data corrupts it.
 *
 * Same safety contract as the compressor, and the same idempotence property:
 * running it twice must equal running it once.
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

console.log("=== AI fingerprint removal ===\n");

import { fingerprintEnabled, stripFingerprint, stripFingerprintResult } from "../../src/core/text/fingerprint/index.js";

const EM = String.fromCodePoint(0x20_14);
const EN = String.fromCodePoint(0x20_13);
const LSQUO = String.fromCodePoint(0x20_18);
const RSQUO = String.fromCodePoint(0x20_19);
const LDQUO = String.fromCodePoint(0x20_1c);
const RDQUO = String.fromCodePoint(0x20_1d);
const ELLIPSIS = String.fromCodePoint(0x20_26);
const NBSP = String.fromCodePoint(0x00_a0);
const BULLET = String.fromCodePoint(0x20_22);
const ARROW = String.fromCodePoint(0x21_92);
const ASCII_ONLY = /^[ -~\n]*$/;

// ── T1: the dashes ──
const dashed = `The router${EM}which caches results${EM}is fast.`;
const t1 = stripFingerprint(dashed);
check("T1 no em dash survives", !t1.includes(EM));
check("T1.1 the clause is still readable", /router.*caches results.*is fast/.test(t1));
check("T1.2 en dash goes too", !stripFingerprint(`pages 10${EN}20`).includes(EN));
check(
  "T1.3 a spaced em dash becomes a comma, not a run-on",
  stripFingerprint(`Fast ${EM} and cheap.`).includes(", and cheap"),
);
// A dash alone in a table cell means "none". A comma there says nothing at all.
check(
  "T1.4 a lone dash in a table cell stays a dash",
  stripFingerprint(`| P1 | work | ${EM} | S |`) === "| P1 | work | - | S |",
);
check("T1.5 a dash opening a line is a list marker", stripFingerprint(`${EM} first item`) === "- first item");

// ── T2: the rest of the typographic set ──
const typographic = `${LDQUO}Quoted${RDQUO} and ${LSQUO}single${RSQUO}${ELLIPSIS} ${BULLET} item ${ARROW} next${NBSP}word`;
const t2 = stripFingerprint(typographic);
check("T2 prose comes out plain ASCII", ASCII_ONLY.test(t2));
check("T2.1 quotes become straight", t2.includes('"Quoted"') && t2.includes("'single'"));
check("T2.2 the ellipsis becomes three dots", t2.includes("..."));
check("T2.3 the arrow becomes ASCII", t2.includes("->"));

// ── T3: American English ──
const british = "The colour of the behaviour we organise, analysed at the centre of the catalogue.";
const t3 = stripFingerprint(british);
check("T3 spelling is normalised", /color/.test(t3) && /behavior/.test(t3) && /organize/.test(t3));
check("T3.1 -yse and -re and -ogue too", /analyzed/.test(t3) && /center/.test(t3) && /catalog/.test(t3));
check(
  "T3.2 case is preserved",
  stripFingerprint("Colour and COLOUR").includes("Color") && stripFingerprint("Colour and COLOUR").includes("COLOR"),
);
check("T3.3 no false positive inside a longer word", stripFingerprint("discolouration").includes("discolouration"));
// The word boundary sits before the prefix, not before the stem, so an -ise
// stem has to accept `un` and `re` or half the family is missed.
const prefixed = stripFingerprint("An unrecognised flag, unauthorised and reorganised.");
check(
  "T3.4 a prefixed -ise stem is corrected",
  prefixed.includes("unrecognized") && prefixed.includes("unauthorized") && prefixed.includes("reorganized"),
);
check(
  "T3.5 the prefix rule invents nothing",
  stripFingerprint("unwise reprise franchise") === "unwise reprise franchise",
);

// ── T4: code, spans and URLs are data ──
const withCode = `Set it${EM}like this:\n\`\`\`js\nconst colour = "grey"; // the colour${EM}kept\n\`\`\`\ndone`;
const t4 = stripFingerprint(withCode);
check("T4 fenced code is verbatim", t4.includes(`const colour = "grey"; // the colour${EM}kept`));
check("T4.1 the prose around it is cleaned", !t4.split("```", 1)[0].includes(EM));
const spans = `Call \`getColour()\` at https://example.com/colour${EM}page for the colour.`;
const t5 = stripFingerprint(spans);
check("T4.2 an inline span keeps its British identifier", t5.includes("`getColour()`"));
check("T4.3 a URL is never rewritten", t5.includes(`https://example.com/colour${EM}page`));
check("T4.4 the surrounding prose still gets the color", t5.includes("for the color"));

// ── T5: JSON is data as well ──
const json = JSON.stringify({ colour: "grey", note: `a${EM}b` });
check("T5 JSON is returned unchanged", stripFingerprint(json) === json);

// ── T6: idempotence, or the cache replays a different string every time ──
const messy = `${LDQUO}Colour${RDQUO}${EM}the behaviour${ELLIPSIS} organised.`;
check(
  "T6 running it twice equals running it once",
  stripFingerprint(stripFingerprint(messy)) === stripFingerprint(messy),
);
check("T6.1 clean text is left alone", stripFingerprint("Plain color text.") === "Plain color text.");

// ── T7: the MCP result wrapper ──
const result = {
  content: [
    { type: "text", text: json },
    { type: "text", text: `The colour${EM}here.` },
  ],
};
const wrapped = stripFingerprintResult(result);
check("T7 a JSON content item is untouched", wrapped.content[0].text === json);
check("T7.1 a prose content item is cleaned", wrapped.content[1].text === "The color, here.");

// ── T8: one opt-out ──
const previous = process.env.RULE_MCP_NO_FINGERPRINT;
process.env.RULE_MCP_NO_FINGERPRINT = "1";
check("T8 the opt-out disables it", fingerprintEnabled() === false);
check(
  "T8.1 the result passes through untouched",
  stripFingerprintResult(result).content[1].text === `The colour${EM}here.`,
);
if (previous === undefined) {
  delete process.env.RULE_MCP_NO_FINGERPRINT;
} else {
  process.env.RULE_MCP_NO_FINGERPRINT = previous;
}
check("T8.2 enabled by default", fingerprintEnabled() === true);

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
