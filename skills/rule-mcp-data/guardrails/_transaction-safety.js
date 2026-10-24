/** Guardrail `transaction-safety`: Multi-statement transactions. */
export const transactionSafety = {
  id: "transaction-safety",
  label: "Multi-statement transactions",
  description: "Multiple mutations should be wrapped in a transaction.",
  check: (code) => {
    const mutations = code.match(/\.(?:insert|create|update|delete|save)\s*\(/gi) || [];

    if (mutations.length < 2) {
      return { pass: true, note: "Less than 2 mutations, transaction not required" };
    }

    const hasTx = /BEGIN|COMMIT|ROLLBACK|transaction\(|tx\s*=>|@Transactional/i.test(code);

    return {
      pass: hasTx,
      failCount: hasTx ? 0 : 1,
      detail: hasTx ? [] : [`${mutations.length} mutations without transaction`],
      suggestion: "Wrap multiple mutations in one transaction: open a transaction and run the writes inside it.",
    };
  },
};
