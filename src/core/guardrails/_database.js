

/** The database guardrail family. */
import { countedVerdict } from "../../shared/index.js";
export const DATABASE_GUARDRAILS = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
    id: "connection-pool",
    label: "Connection pooling",
    description: "Database clients should use connection pooling with explicit max pool size.",
    check: (code) => {
      const hasPool = /new\s+Pool\(|createPool\(|maxPoolSize|connectionLimit|pool_size|max\s*:\s*\d+/i.test(code);
      const hasClient = /new\s+(?:pg\.)?Client\(|createConnection\(/i.test(code);

      if (hasClient && !hasPool) {
        const isServer = /app\.(?:listen|get|post)|createServer/i.test(code);

        if (!isServer) {
          return { pass: true, note: "Script-style DB client, pool not required" };
        }

        return {
          pass: false,
          failCount: 1,
          detail: ["Client without pool in server code"],
          suggestion: "Use Pool instead of Client for servers: new Pool({ max: 20 }).",
        };
      }

      if (!hasClient && !hasPool && !/Pool|pool/i.test(code)) {
        return { pass: true, note: "No DB client or ORM-managed pooling, skipping" };
      }

      return { pass: true, note: hasPool ? "Connection pool detected" : "ORM likely handles pooling" };
    },
  },
];
