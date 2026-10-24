/**
 * @module scripts/audits/decision-models/corpus-measure
 *
 * The arithmetic and the question shapes the corpus measurement command needs.
 *
 * The command is the only place that loads skills, routes prompts or talks to a
 * model. Everything here is pure, so the ruler can be asserted without a router:
 * a changed count is a failed test before it is a changed number in an audit.
 */

/** A rate rounded to three decimals, so two runs print the same string. */
function rate(part, total) {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 1000;
}

/** The count a report quotes, from rows that carry `exact` and `inAlternatives`. */
export function summarize(rows) {
  const total = rows.length;
  const exact = rows.filter((row) => row.exact).length;
  const top = rows.filter((row) => row.exact || row.inAlternatives).length;

  return { total, exact, top, exactRate: rate(exact, total), topRate: rate(top, total) };
}

/** A percentage with one decimal, the form the command prints. */
export function percent(part, total) {
  return `${((part / total) * 100).toFixed(1)}%`;
}

/** One model-off/model-on line: exact and top-or-alternative. */
export function summaryLine(label, run) {
  return `${label}: exact ${run.exact}/${run.total} (${percent(run.exact, run.total)}), top-or-alternative ${run.top}/${run.total} (${percent(run.top, run.total)})`;
}

/** The route followed by its alternatives, capped at the options the model may see. */
export function shortlistFor(row, size = 5) {
  return [row.got, ...(row.alternatives ?? [])].slice(0, Number.isInteger(size) && size > 0 ? size : 1);
}

/**
 * One `choice` question. A shortlist describes its labels because the audit
 * measured that shape; the catalog uses bare names because 83 descriptions do
 * not fit the token budget the prototype measured.
 */
export function buildQuestion(options, { described = true, instructions = "Which skill should answer this request?" } = {}) {
  const pick = { type: "choice", instructions };

  if (described) {
    pick.criteria = Object.fromEntries(options.map(({ name, description }) => [name, description]));
  } else {
    pick.options = options.map(({ name }) => name);
  }

  return { pick };
}

/** The chosen label, from the two answer shapes the endpoint has returned. */
export function pickOf(answer) {
  const value = answer?.answers?.pick;

  return typeof value === "string" ? value : (value?.choice ?? null);
}

/** Aggregate one model run: fixes, addressable misses, latency and input tokens. */
export function applyPicks(picks) {
  const mean = (values) => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);

  return {
    fixed: picks.filter((pick) => pick.fixed).length,
    addressable: picks.length,
    meanMs: Math.round(mean(picks.map((pick) => pick.ms))),
    meanInputTokens: Math.round(mean(picks.map((pick) => pick.inputTokens))),
    picks,
  };
}

/** The differences between a committed model-off run and the live one. */
export function compareOff(expected, actual) {
  const differences = [];

  for (const key of ["total", "exact", "top"]) {
    if (expected[key] !== actual[key]) {
      differences.push(`off.${key}: fixture ${expected[key]}, live ${actual[key]}`);
    }
  }

  return differences;
}
