/**
 * @module test/simplicity.test
 *
 * Verifies the anti-over-engineering constraint:
 *   - the workflow reminder states the minimal-change rule and the proactive-ADR rule
 *   - the router emits a scope contract, and a doc followup on structural prompts
 *   - the simplicity guardrails ship in SHARED (so every skill enforces them)
 *   - those guardrails fire on slop and stay silent on this repo's own source
 *     (a new guardrail that fails on committed code is a false positive, not a find)
 */

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("=== Simplicity / anti-over-engineering Tests ===\n");

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { SHARED_GUARDRAILS, SIMPLICITY_GUARDRAILS } from "../src/core/guardrail-defs.js";
import { getGuardrails } from "../src/core/guardrails.js";
import { loadAllSkills } from "../src/core/skills.js";
import { callTool } from "../src/tools/router.js";

await loadAllSkills();

// ── T1: the workflow reminder carries the constraint ──
const routed = await callTool("pix_tool", { prompt: "add a payments table migration" });
const reminder = routed.content.find((item) => item.text?.includes("## PIX WORKFLOW REMINDER"))?.text ?? "";
check("T1 reminder states the minimal-change rule", /minimal change/i.test(reminder));
check("T1.1 reminder forbids unrequested scope", /unrequested/i.test(reminder));
check(
  "T1.2 reminder asks for the ADR unprompted",
  /rule_tool_process_adr/.test(reminder) && /without being asked/i.test(reminder),
);

// ── T2: the router emits a scope contract ──
const routing = JSON.parse(routed.content[0].text);
check("T2 routing carries a scope_contract", Boolean(routing.scope_contract));
check(
  "T2.1 scope_contract lists what needs an explicit request",
  Array.isArray(routing.scope_contract?.forbidden_without_explicit_request) &&
    routing.scope_contract.forbidden_without_explicit_request.length > 0,
);
check(
  "T2.2 scope_contract asks to declare out-of-scope up front",
  Array.isArray(routing.scope_contract?.declare_first) && routing.scope_contract.declare_first.includes("out_of_scope"),
);

// ── T3: proactive documentation on structural prompts only ──
check("T3 structural prompt gets a doc followup", routing.docs_followup?.tool === "rule_tool_process_adr");
check("T3.1 doc followup reaches next_tools", routing.next_tools.includes("rule_tool_process_adr"));
const cosmetic = await callTool("pix_tool", { prompt: "center a button label" });
const cosmeticRouting = JSON.parse(cosmetic.content[0].text);
check("T3.2 cosmetic prompt gets no doc followup", !cosmeticRouting.docs_followup);

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
check(
  "T5 no-speculative-audit-table fires on a write-only audit table",
  byId["no-speculative-audit-table"].check(SPECULATIVE_SQL, {}).pass === false,
);

const USED_SQL = `${SPECULATIVE_SQL}
SELECT changed_at FROM orders_audit WHERE order_id = $1;`;
check(
  "T5.1 it stays silent when the table is actually read",
  byId["no-speculative-audit-table"].check(USED_SQL, {}).pass === true,
);

const FUTURE_CODE = `// kept for future use, we might need it later
export const retryBudget = 3;`;
check(
  "T5.2 no-future-use-code fires on speculative markers",
  byId["no-future-use-code"].check(FUTURE_CODE, {}).pass === false,
);

const COMMENTED_OUT = `function send(payload) {
  return post(payload);
}
// function sendV2(payload) {
//   const enriched = enrich(payload);
//   return post(enriched);
// }`;
check(
  "T5.3 no-commented-out-code fires on a parked implementation",
  byId["no-commented-out-code"].check(COMMENTED_OUT, {}).pass === false,
);

const PROSE_COMMENTS = `// Send the payload.
// Retries are handled by the caller, deliberately: the queue owns backoff.
// See docs/adr/012 for why this is not batched.
function send(payload) {
  return post(payload);
}`;
check(
  "T5.4 prose comments are not commented-out code",
  byId["no-commented-out-code"].check(PROSE_COMMENTS, {}).pass === true,
);

// ── T7: the case this was built for - a real session added a
//    `PaymentWebhookEvent` model plus its migration, and nothing read either.
//    PascalCase without an underscore, so the first version of the guardrail
//    passed it. Both the schema and the migration must fail. ──
const auditTable = byId["no-speculative-audit-table"];
for (const fixture of ["over-engineered-migration.sql", "over-engineered-schema.prisma"]) {
  const result = auditTable.check(readFileSync(join("test/fixtures", fixture), "utf8"), { fileName: fixture });
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

// ── T8: a reduction request routes to the simplicity skill and asks for no ADR.
//    The real corrective prompt is dominated by domain nouns (payment, schema,
//    webhook, table) which used to swamp the signal. ──
const REDUCTION =
  "can we avoid editing so much the payment database schema and keep it as close as possible " +
  "to the existing? do we need the webhook event table? my concern is that we are over engineering";
const reduction = JSON.parse((await callTool("pix_tool", { prompt: REDUCTION })).content[0].text);
check("T8 reduction prompt routes to simplicity", reduction.route === "rule-process-simplicity");
check(
  "T8.1 the domain skill stays reachable",
  reduction.next_tools.some((t) => t.startsWith("rule_tool_data")) ||
    reduction.alternatives.some((a) => a.route.startsWith("rule-data")),
);
check("T8.2 no ADR followup on a reduction request", !reduction.docs_followup);
const build = JSON.parse(
  (await callTool("pix_tool", { prompt: "add a payments table and its prisma migration" })).content[0].text,
);
check("T8.3 a build request still gets the ADR followup", build.docs_followup?.tool === "rule_tool_process_adr");
check("T8.4 a build request still routes to its domain", build.route !== "rule-process-simplicity");

// ── T8.5: a skill directory that appears after startup must not break routing.
//    Skill names are read from disk on every call, the tool registry is built
//    once at load time - a live server that saw a new skill on disk offered a
//    tool it had never registered, and its own output validation then rejected
//    the whole call as invented. ──
const { listTools, retainTools } = await import("../src/tools/router.js");
const before = listTools().map((t) => t.name);
retainTools(before.filter((name) => name !== "rule_tool_process_simplicity"));
const degraded = await callTool("pix_tool", { prompt: REDUCTION });
check("T8.5 routing survives an unregistered skill", !degraded.isError);
const degradedRouting = JSON.parse(degraded.content[0].text);
check(
  "T8.6 the unregistered tool is not advertised",
  !degradedRouting.next_tools.includes("rule_tool_process_simplicity"),
);
check("T8.7 the route itself still names the skill", degradedRouting.route === "rule-process-simplicity");
await loadAllSkills(true);

// ── T9: the skill answers the question the session had to discover by hand ──
const simplicitySkill = readFileSync("skills/rule-process-simplicity/SKILL.md", "utf8");
check(
  "T9 the skill carries a schema-change checklist",
  /## Schema changes/.test(simplicitySkill) &&
    /who writes it/i.test(simplicitySkill) &&
    /who reads it/i.test(simplicitySkill),
);

// ── T6: baseline - the repo's own committed source must stay clean ──
const sourceFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (/\.(?:js|mjs)$/.test(entry)) {
      sourceFiles.push(full);
    }
  }
};
walk("src");
// guardrail-defs.js carries the patterns themselves, so it matches by construction.
const scanned = sourceFiles.filter(
  (file) =>
    !file.endsWith("guardrail-defs.js") &&
    // The target splits guardrail definitions under src/core/guardrails/;
    // the source keeps them in the single guardrail-defs.js that its own
    // baseline exempts. The definitions' example markers ("for future use",
    // "just in case") are the rule's vocabulary, not violations of it.
    !file.startsWith(join("src", "core", "guardrails")),
);
const offenders = [];
for (const file of scanned) {
  const code = readFileSync(file, "utf8");
  for (const guardrail of SIMPLICITY_GUARDRAILS) {
    if (!guardrail.check(code, { fileName: file }).pass) {
      offenders.push(`${file} → ${guardrail.id}`);
    }
  }
}
check(`T6 simplicity guardrails pass on all ${scanned.length} src files`, offenders.length === 0);
if (offenders.length > 0) {
  console.log(`     ${offenders.slice(0, 10).join("\n     ")}`);
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
setTimeout(() => process.exit(fail > 0 ? 1 : 0), 100);
