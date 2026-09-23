

/** The WCAG-EM report builder: structure, EARL JSON-LD, honest conformance. */
import { WCAG_EM_STEPS, buildReport, check, criteriaForLevel, finish } from "./_a11y.fixture.mjs";

console.log("=== A11y determinism: the report ===\n");

// ── T4: the report ──
const report = buildReport({
  scope: { title: "Checkout", url: "https://example.com/checkout", level: "AA" },
  sample: ["/checkout", "/checkout/payment"],
  results: [
    { criterion: "1.1.1", outcome: "failed", note: "Two product images have no alt" },
    { criterion: "1.4.3", outcome: "passed" },
    { criterion: "1.2.2", outcome: "inapplicable", note: "No prerecorded media" },
  ],
});
check("T10 the report states the conformance target", report.markdown.includes("AA"));
check("T10.1 it names the criterion, not only the number", report.markdown.includes("Non-text Content"));
check("T10.2 untested criteria are counted, not hidden", report.summary.untested === 55 - 3 && report.summary.failed === 1);
check("T10.3 a failure blocks the claim", /does not conform/i.test(report.markdown) && report.summary.conforms === false);
check(
  "T10.4 the five WCAG-EM steps are present",
  WCAG_EM_STEPS.every((s) => report.markdown.includes(s.name)),
);
check(
  "T10.5 EARL output is valid JSON-LD with a context",
  (() => {
    const earl = JSON.parse(report.earl);

    return Boolean(earl["@context"]) && Array.isArray(earl["@graph"]) && earl["@graph"].length === 3;
  })(),
);
check(
  "T10.6 an EARL assertion carries outcome and test",
  (() => {
    const first = JSON.parse(report.earl)["@graph"][0];

    return first["@type"] === "Assertion" && first.result.outcome === "earl:failed" && first.test.title.includes("Non-text");
  })(),
);
check(
  "T10.7 an unknown criterion is rejected, not silently dropped",
  (() => {
    try {
      buildReport({
        scope: { title: "x", url: "https://x", level: "AA" },
        sample: ["/"],
        results: [{ criterion: "9.9.9", outcome: "passed" }],
      });

      return false;
    } catch (error) {
      return /9\.9\.9/.test(error.message);
    }
  })(),
);
check(
  "T10.8 an unknown outcome is rejected",
  (() => {
    try {
      buildReport({
        scope: { title: "x", url: "https://x", level: "AA" },
        sample: ["/"],
        results: [{ criterion: "1.1.1", outcome: "probably" }],
      });

      return false;
    } catch (error) {
      return /probably/.test(error.message);
    }
  })(),
);
check(
  "T10.9 all-passed with a full sweep conforms",
  (() => {
    const full = buildReport({
      scope: { title: "x", url: "https://x", level: "AA" },
      sample: ["/"],
      results: criteriaForLevel("AA").map((c) => ({ criterion: c.num, outcome: "passed" })),
    });

    return full.summary.conforms === true && full.summary.untested === 0;
  })(),
);

finish();
