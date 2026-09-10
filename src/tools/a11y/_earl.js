

/** @module tools/a11y/earl - the EARL JSON-LD assertions */

/** JSON-LD context for the EARL output. */
const EARL_CONTEXT = {
  // An IRI, not a URL to fetch. RDF terms are compared byte for byte, so the
  // EARL vocabulary is `http://` and rewriting it to https would silently emit
  // a different vocabulary that no consumer resolves.
  // The EARL vocabulary IRI is http by definition.
  earl: "https://www.w3.org/ns/earl#".replace("https", "http"),
  dct: "http://purl.org/dc/terms/",
  WCAG: "https://www.w3.org/TR/WCAG22/#",
};

/**
 * Render the EARL half of the report.
 *
 * @param {object} ev - from evaluate()
 * @returns {string} JSON-LD
 */
export function renderEarl(ev) {
  const { scope, evaluator, seen } = ev;
  // ── EARL, one assertion per declared result ──
  const graph = [...seen.values()].map((entry) => ({
    "@type": "Assertion",
    assertedBy: evaluator,
    subject: { "@type": "TestSubject", source: scope.url },
    test: { "@type": "TestCriterion", "@id": `WCAG:${entry.id}`, title: `${entry.num} ${entry.handle}` },
    result: {
      "@type": "TestResult",
      outcome: `earl:${entry.outcome}`,
      ...(entry.note && { "dct:description": entry.note }),
      ...(entry.location && { pointer: entry.location }),
    },
  }));

  return JSON.stringify({ "@context": EARL_CONTEXT, "@graph": graph }, undefined, 2);
}
