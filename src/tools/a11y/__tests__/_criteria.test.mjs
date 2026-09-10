

/** The vendored WCAG 2.2 criteria and the guardrails that cite them. */
import { CRITERIA, EARL_OUTCOMES, WCAG_EM_STEPS, WCAG_VERSION, check, checkCode, criteriaForLevel, criterion, finish } from "./_a11y.fixture.mjs";

console.log("=== A11y determinism: criteria and guardrails ===\n");

// ── T1: the vendored criteria ──
check("T1 WCAG 2.2 is what we vendored", WCAG_VERSION === "2.2");
check("T1.1 all 86 criteria are present", Object.keys(CRITERIA).length === 86);
check(
  "T1.2 a criterion carries number, title and level",
  (() => {
    const c = criterion("1.4.3");

    return c?.handle === "Contrast (Minimum)" && c.level === "AA" && c.num === "1.4.3";
  })(),
);
check("T1.3 AA includes A, because a claim at AA requires both", criteriaForLevel("AA").length === 55);
check("T1.4 A alone is smaller than AA", criteriaForLevel("A").length === 31);
check("T1.5 EARL outcomes are the five in the schema", EARL_OUTCOMES.join(",") === "passed,failed,cantTell,inapplicable,untested");
check("T1.6 WCAG-EM has its five steps", WCAG_EM_STEPS.length === 5 && WCAG_EM_STEPS[0].step === 1);

// ── T2: guardrails cite the criterion they enforce ──
const html = (body) => checkCode("rule-styleguide-a11y", body, { fileName: "page.html" });
const failed = (report, id) => report.failed.find((f) => f.id === id);

const badImage = '<img src="a.png">';
check("T2 an image with no alt fails", Boolean(failed(html(badImage), "a11y-img-alt")));
check("T2.1 the failure names the criterion", failed(html(badImage), "a11y-img-alt")?.wcag === "1.1.1");
check('T2.2 alt="" is allowed: decorative is a real answer', !failed(html('<img src="a.png" alt="">'), "a11y-img-alt"));

check("T3 a positive tabindex fails", failed(html('<div tabindex="3"></div>'), "a11y-positive-tabindex")?.wcag === "2.4.3");
check("T3.1 tabindex=0 and -1 are fine", !failed(html('<div tabindex="0"></div><div tabindex="-1"></div>'), "a11y-positive-tabindex"));

check("T4 html with no lang fails", failed(html("<html><body></body></html>"), "a11y-html-lang")?.wcag === "3.1.1");
check("T4.1 html with lang passes", !failed(html('<html lang="en"><body></body></html>'), "a11y-html-lang"));

check(
  "T5 outline:none with no replacement fails focus visible",
  failed(checkCode("rule-styleguide-a11y", "button:focus { outline: none; }", { fileName: "a.css" }), "a11y-focus-visible")?.wcag === "2.4.11",
);
check(
  "T5.1 outline:none with a visible replacement passes",
  !failed(
    checkCode("rule-styleguide-a11y", "button:focus { outline: none; box-shadow: 0 0 0 2px blue; }", {
      fileName: "a.css",
    }),
    "a11y-focus-visible",
  ),
);

check("T6 autoplaying media fails audio control", failed(html("<video autoplay></video>"), "a11y-no-autoplay")?.wcag === "1.4.2");
check("T6.1 muted autoplay is allowed", !failed(html("<video autoplay muted></video>"), "a11y-no-autoplay"));

check("T7 an iframe with no title fails", failed(html('<iframe src="x"></iframe>'), "a11y-iframe-title")?.wcag === "4.1.2");
check("T7.1 aria-hidden on a focusable element fails", failed(html('<button aria-hidden="true">Go</button>'), "a11y-aria-hidden-focusable")?.wcag === "4.1.2");

check(
  "T8 the rules do not fire on a JavaScript file",
  checkCode("rule-styleguide-a11y", "const img = 1;", { fileName: "a.js" }).failed.every((f) => !f.id.startsWith("a11y-img")),
);

// ── T3: every a11y guardrail maps to a criterion that exists ──
const { getGuardrails } = await import("../../../core/guardrails/index.js");
const a11yRules = getGuardrails("rule-styleguide-a11y").filter((g) => g.id.startsWith("a11y-") && g.wcag);
check("T9 there are a11y rules with a criterion", a11yRules.length >= 8);
check(
  "T9.1 every cited criterion exists in the vendored data",
  a11yRules.every((g) => criterion(g.wcag)),
);

finish();
