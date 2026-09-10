

/**
 * @module tools/a11y
 *
 * `rule_tool_a11y_report`: turns a set of per-criterion outcomes into a report
 * structured by the WCAG Evaluation Methodology, plus EARL as JSON-LD.
 *
 * Why a tool and not a prompt. An accessibility report is a claim someone may
 * have to defend, and the two things that make it defensible are mechanical:
 * every criterion in the conformance target is accounted for, and anything not
 * checked is reported as untested rather than omitted. A model asked to write
 * the same report will quietly drop the criteria nobody mentioned, and the gap
 * between "we checked 12 things" and "we conform at AA" is exactly where a
 * conformance claim goes wrong.
 *
 * So the rules here are deliberate and not negotiable:
 *   - an unknown criterion number is an error, never a silent skip
 *   - an unknown outcome is an error; EARL has five and they mean different things
 *   - untested criteria are counted and named
 *   - a single failure, or any untested criterion, blocks the claim
 *
 * No model, no network, no clock beyond what the caller passes: same input,
 * same report, so the result cache can replay it.
 *
 * @see module:core/wcag-data - the vendored criteria
 * @see https://www.w3.org/TR/WCAG-EM/ - the methodology
 * @see https://www.w3.org/TR/EARL10-Schema/ - the result vocabulary
 */

export * from "./_report.js";
export * from "./_tool.js";
