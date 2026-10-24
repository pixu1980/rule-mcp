/** Guardrail `connection-pool`: Connection pooling. */
export const connectionPool = {
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
};
