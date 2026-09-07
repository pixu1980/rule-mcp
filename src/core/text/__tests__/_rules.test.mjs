/** The simplicity guardrail family: each rule fires on its counterexample and only there. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SHARED_GUARDRAILS, SIMPLICITY_GUARDRAILS, getGuardrails } from "../../guardrails/index.js";
import { check, finish } from "./_simplicity.fixture.mjs";

console.log("=== Simplicity: guardrails ===\n");

// ── T4: guardrails ship everywhere ──
const simplicityIds = SIMPLICITY_GUARDRAILS.map((g) => g.id);
check("T4 three simplicity guardrails exist", simplicityIds.length === 3);
const sharedIds = new Set(SHARED_GUARDRAILS.map((g) => g.id));
check(
  "T4.1 simplicity guardrails are shared",
  simplicityIds.every((id) => sharedIds.has(id)),
);
for (const skill of ["rule-data-postgresql", "rule-backend-express", "rule-frontend-react"]) {
  const ids = new Set(getGuardrails(skill).map((g) => g.id));
  check(
    `T4.2 ${skill} enforces them`,
    simplicityIds.every((id) => ids.has(id)),
  );
}

// ── T5: they fire on slop ──
const byId = Object.fromEntries(SIMPLICITY_GUARDRAILS.map((g) => [g.id, g]));
const SPECULATIVE_SQL = `CREATE TABLE orders (id uuid primary key, total numeric);
CREATE TABLE orders_audit (id uuid primary key, order_id uuid, changed_at timestamptz);
INSERT INTO orders (id, total) VALUES ($1, $2);`;
check("T5 no-speculative-audit-table fires on a write-only audit table", byId["no-speculative-audit-table"].check(SPECULATIVE_SQL, {}).pass === false);

const USED_SQL = `${SPECULATIVE_SQL}
SELECT changed_at FROM orders_audit WHERE order_id = $1;`;
check("T5.1 it stays silent when the table is actually read", byId["no-speculative-audit-table"].check(USED_SQL, {}).pass === true);

const FUTURE_CODE = `// kept for future use, we might need it later
export const retryBudget = 3;`;
check("T5.2 no-future-use-code fires on speculative markers", byId["no-future-use-code"].check(FUTURE_CODE, {}).pass === false);

const COMMENTED_OUT = `function send(payload) {
  return post(payload);
}
// function sendV2(payload) {
//   const enriched = enrich(payload);
//   return post(enriched);
// }`;
check("T5.3 no-commented-out-code fires on a parked implementation", byId["no-commented-out-code"].check(COMMENTED_OUT, {}).pass === false);

const PROSE_COMMENTS = `// Send the payload.
// Retries are handled by the caller, deliberately: the queue owns backoff.
// See docs/adr/012 for why this is not batched.
function send(payload) {
  return post(payload);
}`;
check("T5.4 prose comments are not commented-out code", byId["no-commented-out-code"].check(PROSE_COMMENTS, {}).pass === true);

// ── T7: the case this was built for - a real session added a
//    `PaymentWebhookEvent` model plus its migration, and nothing read either.
//    PascalCase without an underscore, so the first version of the guardrail
//    passed it. Both the schema and the migration must fail. ──
const auditTable = byId["no-speculative-audit-table"];
for (const fixture of ["over-engineered-migration.sql", "over-engineered-schema.prisma"]) {
  const result = auditTable.check(readFileSync(join("tests/fixtures", fixture), "utf8"), { fileName: fixture });
  check(`T7 ${fixture} is flagged`, result.pass === false && result.detail.some((d) => /PaymentWebhookEvent/.test(d)));
}
const REVIEWED_SQL = `ALTER TABLE "Payment" ADD COLUMN "amount" DECIMAL(10,2) NOT NULL,
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "failureReason" TEXT;
CREATE UNIQUE INDEX "Payment_transactionID_key" ON "Payment"("transactionID");`;
check("T7.1 the reviewed migration passes", auditTable.check(REVIEWED_SQL, {}).pass === true);
const READ_EVENTS = `CREATE TABLE "OrderEvent" ("id" SERIAL, "orderId" INT);
INSERT INTO "OrderEvent" ("orderId") VALUES ($1);
SELECT * FROM "OrderEvent" WHERE "orderId" = $1;`;
check("T7.2 an event table with readers passes", auditTable.check(READ_EVENTS, {}).pass === true);
const PRISMA_WITH_READER = `model AuditLog { id Int @id }
model Order { id Int @id, log AuditLog? }`;
check("T7.3 a Prisma model referenced elsewhere passes", auditTable.check(PRISMA_WITH_READER, {}).pass === true);

finish();
