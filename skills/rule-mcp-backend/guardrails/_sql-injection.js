/** @module core/guardrails/backend/sql-injection */

export const sqlInjection = {
  id: "sql-injection",
  label: "No SQL injection via string concatenation",
  description: "All SQL queries must use parameterized placeholders ($1, ?, :name). No string concatenation with user input.",
  check: (code) => {
    // Any receiver, not only one called `db`: this project's own naming rules
    // would call it `database` or `pool`, and a rule that misses those is a
    // rule that passes the code most likely to be written here.
    // The receiver is not part of the pattern - `.query(` is the anchor, so a
    // query on `database` or `pool` is caught as readily as one on `db`. Every
    // quantifier is bounded: an unbounded scan from every position in a long
    // line is the backtracking the 1.1 corpus exists to catch.
    const concatPatterns = [
      /\.(?:query|execute)\(["'](?:SELECT|INSERT|UPDATE|DELETE)[^"']{0,200}["'][\t ]{0,4}\+[\t ]{0,4}[\w.]{1,64}/gi,
      /\.(?:query|execute)\(`(?:SELECT|INSERT|UPDATE|DELETE)[^`]{0,200}\${/gi,
    ];
    const violations = [];

    for (const re of concatPatterns) {
      const m = code.match(re);

      if (m) {
        violations.push(...m);
      }
    }

    const hasQuery = /\.query\(|\.execute\(|Model\.find/i.test(code);

    if (!hasQuery) {
      return { pass: true, note: "No SQL queries found, skipping" };
    }

    return {
      pass: violations.length === 0,
      failCount: violations.length,
      detail: violations.slice(0, 5),
      suggestion: "Use parameterized queries: db.query('SELECT ... WHERE id = $1', [id]). Never concatenate user input into SQL strings.",
    };
  },
};
