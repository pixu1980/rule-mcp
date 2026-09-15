

/** The workflow reminder and routing carry the simplicity contract. */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ownedGuardrails } from "../../guardrails/index.js";
import "../../guardrails/__tests__/_install.fixture.mjs";

// The simplicity rules live in the skills that own them (ADR 089).
const SIMPLICITY_IDS = new Set(["no-speculative-audit-table", "no-future-use-code", "no-commented-out-code"]);
const SIMPLICITY_GUARDRAILS = [...ownedGuardrails("rule-process-simplicity"), ...ownedGuardrails("rule-styleguide-comments")].filter((rule) => SIMPLICITY_IDS.has(rule.id));
import { loadAllSkills } from "../../skills/index.js";
import { callTool } from "../../../tools/router/index.js";
import { check, finish } from "./_simplicity.fixture.mjs";

await loadAllSkills(true);
console.log("=== Simplicity: reminder and routing ===\n");

await loadAllSkills();

// ── T1: the workflow reminder carries the constraint ──
const routed = await callTool("pix_tool", { prompt: "add a payments table migration" });
const reminder = routed.content.find((item) => item.text?.includes("## PIX WORKFLOW REMINDER"))?.text ?? "";
check("T1 reminder states the minimal-change rule", /minimal change/i.test(reminder));
check("T1.1 reminder forbids unrequested scope", /unrequested/i.test(reminder));
check("T1.2 reminder asks for the ADR unprompted", /rule_tool_process_adr/.test(reminder) && /without being asked/i.test(reminder));

// ── T2: the router emits a scope contract ──
const routing = JSON.parse(routed.content[0].text);
check("T2 routing carries a scope_contract", Boolean(routing.scope_contract));
check(
  "T2.1 scope_contract lists what needs an explicit request",
  Array.isArray(routing.scope_contract?.forbidden_without_explicit_request) && routing.scope_contract.forbidden_without_explicit_request.length > 0,
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
  reduction.next_tools.some((t) => t.startsWith("rule_tool_data")) || reduction.alternatives.some((a) => a.route.startsWith("rule-data")),
);
check("T8.2 no ADR followup on a reduction request", !reduction.docs_followup);
const build = JSON.parse((await callTool("pix_tool", { prompt: "add a payments table and its prisma migration" })).content[0].text);
check("T8.3 a build request still gets the ADR followup", build.docs_followup?.tool === "rule_tool_process_adr");
check("T8.4 a build request still routes to its domain", build.route !== "rule-process-simplicity");

// ── T8.5: a skill directory that appears after startup must not break routing.
//    Skill names are read from disk on every call, the tool registry is built
//    once at load time - a live server that saw a new skill on disk offered a
//    tool it had never registered, and its own output validation then rejected
//    the whole call as invented. ──
const { listTools, retainTools } = await import("../../../tools/router/index.js");
const before = listTools().map((t) => t.name);
retainTools(before.filter((name) => name !== "rule_tool_process_simplicity"));
const degraded = await callTool("pix_tool", { prompt: REDUCTION });
check("T8.5 routing survives an unregistered skill", !degraded.isError);
const degradedRouting = JSON.parse(degraded.content[0].text);
check("T8.6 the unregistered tool is not advertised", !degradedRouting.next_tools.includes("rule_tool_process_simplicity"));
check("T8.7 the route itself still names the skill", degradedRouting.route === "rule-process-simplicity");
await loadAllSkills(true);

// ── T9: the skill answers the question the session had to discover by hand ──
const simplicitySkill = readFileSync("skills/rule-process-simplicity/SKILL.md", "utf8");
check(
  "T9 the skill carries a schema-change checklist",
  /## Schema changes/.test(simplicitySkill) && /who writes it/i.test(simplicitySkill) && /who reads it/i.test(simplicitySkill),
);

// ── T6: baseline - the repo's own committed source must stay clean ──
const sourceFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Co-located unit tests are checked by the test runner, not this sweep.
      if (entry !== "__tests__") {
        walk(full);
      }
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

finish();
setTimeout(() => process.exit(0), 100);
