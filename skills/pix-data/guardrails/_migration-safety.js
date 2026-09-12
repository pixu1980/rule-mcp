/** Guardrail `migration-safety`: Safe DDL operations. */
import { countedVerdict } from "../../../src/shared/index.js";

export const migrationSafety = {
  id: "migration-safety",
  label: "Safe DDL operations",
  description: "DDL must use IF NOT EXISTS / IF EXISTS for idempotent migrations.",
  check: (code) => {
    const hasDdl = /CREATE\s+TABLE|DROP\s+TABLE|ALTER\s+TABLE/i.test(code);

    if (!hasDdl) {
      return { pass: true, note: "No DDL found, skipping" };
    }

    const unsafeCreate = code.match(/CREATE\s+TABLE\s+(?!.*IF\s+NOT\s+EXISTS)/gi) || [];
    const unsafeDrop = code.match(/DROP\s+TABLE\s+(?!.*IF\s+EXISTS)/gi) || [];
    const violations = [...unsafeCreate, ...unsafeDrop];

    return countedVerdict(violations, { suggestion: "Use CREATE TABLE IF NOT EXISTS, DROP TABLE IF EXISTS for safe, idempotent migrations." });
  },
};
