/** Guardrail `parameterized-queries`: Parameterized database queries. */
export const parameterizedQueries = {
  id: "parameterized-queries",
  label: "Parameterized database queries",
  description: "Queries must use placeholders ($1, ?, :name), not string concatenation.",
  check: (code) => {
    const hasQuery = /\.query\(|\.execute\(|db\.run\(|db\.all\(|db\.get\(|Model\.find|Model\.aggregate/i.test(code);

    if (!hasQuery) {
      return { pass: true, note: "No database queries found, skipping" };
    }

    const isBad = /\.query\(`[^`]*\${[^}]+\}[^`]*`\)|\.query\(["'][^"']*["']\s*\+\s*\w+/gi.test(code);

    return {
      pass: !isBad,
      failCount: isBad ? 1 : 0,
      detail: isBad ? ["Query uses string concatenation or template substitution"] : [],
      suggestion: "Use parameterized queries: db.query('SELECT * FROM t WHERE id = $1', [id]).",
    };
  },
};
