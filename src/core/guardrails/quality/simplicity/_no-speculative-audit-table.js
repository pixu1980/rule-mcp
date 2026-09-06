/** Guardrail `no-speculative-audit-table`: No audit/history table without a consumer */
export const noSpeculativeAuditTable = {
  id: "no-speculative-audit-table",
  label: "No audit/history table without a consumer",
  description:
    "A new audit/history/log/event/archive table that nothing else in the change reads or writes is speculative structure. Covers SQL `CREATE TABLE` and Prisma `model` blocks, in snake_case or PascalCase. Add it when a consumer exists.",
  check: (code) => {
    // Name-shape check, not a naming-convention check: the first version of
    // this rule matched `_events` and silently passed `PaymentWebhookEvent`,
    // which is exactly the table a real session had to remove ten hours and
    // one applied migration later. Split on separators AND case boundaries.
    const suffix =
      /^(?:audit|audits|history|histories|log|logs|event|events|archive|archives|journal|trail|snapshot|snapshots)$/i;
    const lastToken = (name) =>
      name
        .replaceAll(/["`']/g, "")
        .split(".")
        .pop()
        .split(/[_\s-]+|(?<=[a-z0-9])(?=[A-Z])/)
        .findLast(Boolean) ?? "";
    const created = [
      ...[...code.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?["`']?([\w.]+)["`']?/gi)].map(
        (match) => match[1],
      ),
      ...[...code.matchAll(/^\s*model\s+([A-Za-z_]\w*)\s*\{/gm)].map((match) => match[1]),
    ].map((name) => name.replaceAll(/["`']/g, "").split(".").pop());
    const auditLike = [...new Set(created.filter((name) => suffix.test(lastToken(name))))];

    if (auditLike.length === 0) {
      return { pass: true, note: "No audit-style table created" };
    }

    const orphans = auditLike.filter((name) => {
      // Strip the table's own definition - its DDL statements and, for Prisma,
      // the whole model block - then look for any surviving mention.
      const ddl = new RegExp(String.raw`create\s+(?:unique\s+)?(?:table|index)[^;]*?\b${name}\b[^;]*;?`, "gi");
      const model = new RegExp(String.raw`^\s*model\s+${name}\s*\{[\s\S]*?^\}`, "gm");

      return !new RegExp(String.raw`\b${name}\b`, "i").test(code.replace(ddl, " ").replace(model, " "));
    });

    return {
      pass: orphans.length === 0,
      failCount: orphans.length,
      detail: orphans,
      suggestion: "Drop the table until something reads or writes it, or show the consumer in the same change.",
    };
  },
};
