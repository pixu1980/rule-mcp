// skills/rule-architect/field-map.mjs
//
// Declarative data that Phase 4 (Task 3, `normalizeAnswers`) will use to wire
// existing interview answers to `templates.json` placeholders — no logic
// lives here, only the mapping tables from the architect plan for
// `normalizeAnswers` fill-wiring ("Concrete mapping" + Task 1). Grounded
// against the real placeholder set in `templates.json` (177 unique `[KEY]`
// tokens as of this writing) and the field list in `wizard-spec.json`.
//
// Shapes:
//   RENAMES:       { wizardKey: templateKey }               — 1:1 flat renames
//   COMPOSITION:   [{ group, subfield, template, aliases? }] — repeatable group
//                  → numbered placeholder(s); `template`/`aliases` use `{i}`
//                  for the 1-based index, expanded against
//                  `${group}_${i}_${subfield}` answers (the
//                  interview.js repeatable key convention).
//   DERIVED:       [{ template, from(answers, spec) }]        — single
//                  placeholders computed from other answers (a specific
//                  repeatable entry, or an optionGroup label lookup). `spec`
//                  is the full `wizard-spec.json` content (Task 3's
//                  `normalizeAnswers(answers, spec)` already receives it);
//                  entries that don't need it just ignore the 2nd arg.
//   DEFER_PHASE5:  Set<string>                                — meaningful
//                  template placeholders with no interview source in this
//                  phase; left for Phase 5's conditional-emit templates.
//   JUNK:          Set<string>                                — placeholder-
//                  shaped tokens (`[A-Z_0-9]+`) that are literal prose in
//                  templates.json, not real placeholders. Excluded from the
//                  coverage metric entirely (not "deferred", just not real).

// ---------------------------------------------------------------------------
// RENAMES — direct wizard-key -> template-key renames.
// ---------------------------------------------------------------------------
// The 5 renames called out in the plan's "Concrete mapping", plus the
// confirmed PROJECT_PITCH_SKETCH -> PROJECT_ELEVATOR_PITCH (the plan asked
// Task 1 to "verify the template key exists" — confirmed present in
// specs/01-product.md), plus 2 more discovered while grounding the mapping
// against real template prose (plan line 89: "Task 1 grounds them against
// real template prose"):
//   - MONITORING -> MONITORING_TOOL: wizard field label is literally
//     "Monitoring & Error Tracking" (step-17-deployment) and
//     specs/08-deployment.md has a "## Monitoring & Error Tracking" section
//     whose body is exactly `[MONITORING_TOOL]`. Distinct from
//     DEVOPS_MONITORING (already an identical-name flat field, unaffected).
//   - DATA_PORTABILITY -> DATA_EXPORT: wizard field label is literally
//     "Data Portability" (step-18-security) and specs/09-security.md has a
//     "## Data Portability" section whose body is exactly `[DATA_EXPORT]`.
export const RENAMES = {
  PROJECT_NAME_SKETCH: "PROJECT_NAME",
  PROJECT_PITCH_SKETCH: "PROJECT_ELEVATOR_PITCH",
  TOP_FEATURE_1: "FEATURE_1",
  TOP_FEATURE_2: "FEATURE_2",
  TOP_FEATURE_3: "FEATURE_3",
  PRIMARY_PERSONA_SKETCH: "PERSONA_1",
  MONITORING: "MONITORING_TOOL",
  DATA_PORTABILITY: "DATA_EXPORT",
};

// ---------------------------------------------------------------------------
// COMPOSITION — repeatable group (wizard `${group}_${i}_${subfield}`) ->
// numbered template placeholder(s) (`template` with `{i}`, plus optional
// `aliases` fed from the SAME source).
// ---------------------------------------------------------------------------
export const COMPOSITION = [
  { group: "KEY_VALUE_PROPS", subfield: "valueProp", template: "KEY_VALUE_PROP_{i}" },

  { group: "DOMAIN_TERMS", subfield: "term", template: "DOMAIN_TERM_{i}" },
  { group: "DOMAIN_TERMS", subfield: "definition", template: "DOMAIN_TERM_{i}_DEF" },

  { group: "DOMAIN_CONSTRAINTS", subfield: "constraint", template: "DOMAIN_CONSTRAINT_{i}" },
  // NOTE: DOMAIN_CONSTRAINTS.reason has no template placeholder — intentionally unmapped.

  { group: "DOMAIN_NOTES", subfield: "note", template: "DOMAIN_NOTE_{i}" },

  // DECISION (a): CORE_FUNCTION_{i}/_DESC fed from PRIMARY_FUNCTIONS (same
  // source as PRIMARY_FUNCTION_{i}/_DESC), per the human-approved default in
  // the task brief. Not domain-overfit: "primary functional area" and "core
  // capability" are the same underlying concept in this wizard, just
  // rendered into two different template sections (functional-analysis.md
  // §6 vs §7 / 03-calculation-engine.md's "Functional areas" vs "Capability
  // map"). Same source, two aliases.
  { group: "PRIMARY_FUNCTIONS", subfield: "name", template: "PRIMARY_FUNCTION_{i}", aliases: ["CORE_FUNCTION_{i}"] },
  {
    group: "PRIMARY_FUNCTIONS",
    subfield: "description",
    template: "PRIMARY_FUNCTION_{i}_DESC",
    aliases: ["CORE_FUNCTION_{i}_DESC"],
  },

  { group: "ENTITIES", subfield: "name", template: "ENTITY_{i}" },
  { group: "ENTITIES", subfield: "description", template: "ENTITY_{i}_DESC" },
  // NOTE: ENTITIES.plural/attributes/relationships have no direct template
  // placeholder in this phase — unmapped (attributes/relationships are also
  // not flattened by interview.js's renderRepeatableGroup today; see
  // ENTITIES nested repeatable-inline subfields).

  { group: "PERSONAS", subfield: "name", template: "PERSONA_{i}" },
  { group: "PERSONAS", subfield: "description", template: "PERSONA_{i}_DESC" },
  // NOTE: PERSONAS.goal/pain/behavior have no direct template placeholder.

  // DECISION (b): FEATURE_{i} precedence — the detailed FEATURES repeatable
  // wins when present; TOP_FEATURE_1..3 (renamed to FEATURE_1..3 above) is
  // the fallback. This entry is the "wins" source; Task 3's
  // `normalizeAnswers` must apply COMPOSITION after RENAMES so FEATURES
  // overwrites the TOP_FEATURE_* fallback when both are present (per the
  // human-approved default in the task brief).
  { group: "FEATURES", subfield: "feature", template: "FEATURE_{i}" },

  { group: "CORE_FLOWS", subfield: "flow", template: "FLOW_{i}" },

  { group: "USER_STORIES", subfield: "story", template: "USER_STORY_{i}" },
  // NOTE: USER_STORIES.acceptance/priority have no direct template placeholder.

  { group: "SCOPE_ITEMS", subfield: "item", template: "SCOPE_ITEM_{i}" },

  // DECISION (c): NON_GOAL_{i} fed from OUT_OF_SCOPE_ITEMS (same source as
  // OUT_OF_SCOPE_ITEM_{i}), per the human-approved default in the task
  // brief. "Out of scope (MVP)" and "Non-goals (v1)" are the same list
  // rendered into two template sections (functional-analysis.md §5 vs
  // 01-product.md).
  { group: "OUT_OF_SCOPE_ITEMS", subfield: "item", template: "OUT_OF_SCOPE_ITEM_{i}", aliases: ["NON_GOAL_{i}"] },

  // EXTERNAL_SERVICES (service, purpose): grepped templates.json for an
  // integration/external-service placeholder family and found none — the
  // only "Integration" hit is unrelated prose ("Integration: persistence
  // adapters..." in 06-quality-acceptance.md). No template placeholder
  // exists for this group in the current template set, so there is
  // deliberately no COMPOSITION entry for it (not a defer-set placeholder
  // either, since there's no placeholder to defer — this is a wizard group
  // with no template consumer yet).

  // Phase 8: framework-neutral pack prose. These groups feed the placeholders
  // that replace the hardcoded vanilla-JS/Custom-Elements/Parcel assumptions
  // in README/constraints/project-context/specs so the pack reflects the
  // user's actual stack instead of the prototype's.
  { group: "ARCHITECTURE_PRINCIPLES", subfield: "principle", template: "ARCH_PRINCIPLE_{i}" },
  { group: "TECH_CONSTRAINTS", subfield: "constraint", template: "TECH_CONSTRAINT_{i}" },
  { group: "GUIDANCE_LINKS", subfield: "reference", template: "GUIDANCE_LINK_{i}" },
];

// Looks up an optionGroup entry's human `label` for a given option `key`.
// optionGroup entries are either `{key,label,...}` objects or bare strings
// (wizard-spec.json uses both shapes across different groups).
function labelForOption(optionGroup, key) {
  if (!Array.isArray(optionGroup) || !key) return undefined;
  const found = optionGroup.find((o) => (typeof o === "string" ? o === key : o?.key === key));
  if (found === undefined) return undefined;
  return typeof found === "string" ? found : found.label;
}

// STACK_NAME (fix-round 1, Finding 2): prefer FRONTEND_FRAMEWORK's human
// label, else BACKEND_FRAMEWORK's, resolved via spec.optionGroups
// (frontendFrameworks / backendFrameworks are `{key,label,...}` arrays — see
// wizard-spec.json). Neither is a hard requirement (a "library" or "agent"
// project type may leave both at "none"), so when neither framework is set
// this falls back to the selected PROJECT_TYPE's label, then to the raw
// framework/project-type key, so STACK_NAME is never silently empty.
function resolveStackName(answers, spec) {
  const optionGroups = spec?.optionGroups || {};
  const frontendKey = answers?.FRONTEND_FRAMEWORK;
  if (frontendKey && frontendKey !== "none") {
    const label = labelForOption(optionGroups.frontendFrameworks, frontendKey);
    if (label) return label;
  }
  const backendKey = answers?.BACKEND_FRAMEWORK;
  if (backendKey && backendKey !== "none") {
    const label = labelForOption(optionGroups.backendFrameworks, backendKey);
    if (label) return label;
  }
  const projectTypeKey = answers?.PROJECT_TYPE;
  const projectTypeLabel = labelForOption(optionGroups.projectTypes, projectTypeKey);
  return projectTypeLabel || frontendKey || backendKey || projectTypeKey || "";
}

// ---------------------------------------------------------------------------
// DERIVED — single placeholders computed from other answers.
// ---------------------------------------------------------------------------
export const DERIVED = [
  { template: "PRIMARY_ENTITY", from: (answers) => answers["ENTITIES_1_name"] },
  { template: "SECONDARY_ENTITY", from: (answers) => answers["ENTITIES_2_name"] },
  { template: "USER_PERSONA", from: (answers) => answers["PERSONAS_1_name"] },
  { template: "STACK_NAME", from: (answers, spec) => resolveStackName(answers, spec) },
];

// ---------------------------------------------------------------------------
// DEFER_PHASE5 — meaningful placeholders with no wizard source in Phase 4.
// ---------------------------------------------------------------------------
// The plan's domain-overfit list, plus 3 more found while grounding the set
// against real template prose (spec 08-deployment.md / 09-security.md ask
// for things the wizard does not currently collect, and adding new
// interview questions is out of scope for this phase per Global
// Constraints): ANALYTICS_TOOL, BUILD_OUTPUT_DIR, PREVIEW_COMMAND.
// (STACK_NAME was deferred here in the first pass, but a review — Finding 2,
// fix round 1 — correctly pointed out DERIVED already handles non-1:1 cases;
// it's now a DERIVED entry above, resolved from FRONTEND_FRAMEWORK/
// BACKEND_FRAMEWORK via spec.optionGroups.)
// F4 (DEVOPS_*/PROCESS_* gap): NOT deferred — every DEVOPS_*/PROCESS_*
// template placeholder already has an identically-named flat wizard field
// (e.g. DEVOPS_CI, PROCESS_ADR), so they are "already-collected flat keys"
// today with zero wiring needed. Task 4 Step 1 can close F4 as a no-op.
export const DEFER_PHASE5 = new Set([
  "UNIT_CONVENTION_1",
  "UNIT_CONVENTION_2",
  "PROPERTY_TEST_FOCUS_1",
  "UNIT_TEST_FOCUS_1",
  "EDGE_CASE_1",
  "EDGE_CASE_2",
  "EDGE_CASE_3",
  "EDGE_CASE_4",
  "EDGE_CASE_TEST_1",
  "EDGE_CASE_TEST_2",
  "EDGE_CASE_TEST_3",
  "DOMAIN_SPECIFIC_ASSUMPTION_1",
  "DOMAIN_SPECIFIC_ASSUMPTION_2",
  "DOMAIN_SPECIFIC_ASSUMPTION_3",
  "DOMAIN_UX_REQUIREMENT_1",
  "DOMAIN_DATA_PRINCIPLE_1",
  "EXPLAIN_REQ_1",
  "ROBUSTNESS_REQ_1",
  "PRIVACY_REQ_1",
  "OPEN_QUESTION_1",
  "OPEN_QUESTION_2",
  "OPEN_QUESTION_3",
  "PERF_TARGET_1",
  "ADR_LOCATION",
  "ADR_1",
  "ADR_1_CONTEXT",
  "ADR_1_DECISION",
  "ADR_1_RATIONALE",
  "ADR_1_CONSEQUENCES",
  "ADR_2",
  "ADR_2_CONTEXT",
  "ADR_2_DECISION",
  "ADR_2_RATIONALE",
  "ADR_2_CONSEQUENCES",
  "MVP_STEP_1",
  "MVP_STEP_2",
  "MVP_STEP_3",
  "MVP_STEP_4",
  "MVP_STEP_5",
  "USER_NEED_1",
  "USER_NEED_2",
  "USER_NEED_3",
  "USER_NEED_4",
  "ADVANCED_USER_NEED_1",
  "ADVANCED_USER_NEED_2",
  "CONTEXT_AND_OBJECTIVE",
  "PROJECT_DISCLAIMER",
  "LIST_PRIMARY_SCREENS_AND_FEATURES",
  "DOMAIN_ENTITY_MANAGER",
  "DOMAIN_LOGIC_AREA",
  // Found grounding the set against real template prose (see comment above):
  "ANALYTICS_TOOL",
  "BUILD_OUTPUT_DIR",
  "PREVIEW_COMMAND",
]);

// ---------------------------------------------------------------------------
// JUNK — placeholder-shaped tokens (`[A-Z_0-9]+`) that are literal prose in
// templates.json, confirmed by grepping context:
//   - `[X]`  in analysis/implementation-roadmap.md: "flip a milestone to
//     `[X]`" — describes the `- [X]` checkbox convention, not a placeholder.
//   - `[NN]` in specs/07-architecture-decision-records.md, inside the ADR
//     Template code fence: "# ADR [NN]: [Title]" — a literal example
//     heading for humans to copy, not a placeholder (note `[Title]` isn't
//     matched by the generator's `[A-Z_0-9]+` regex at all, since it's
//     mixed-case).
// ---------------------------------------------------------------------------
export const JUNK = new Set(["X", "NN"]);

// ---------------------------------------------------------------------------
// GENERATOR_DERIVED — placeholders the GENERATOR fills, not the interview.
// ---------------------------------------------------------------------------
// These cannot come from RENAMES/COMPOSITION/DERIVED because they depend on
// the render itself rather than on any answer:
//   - DOC_MAP: README.md's documentation index, built from the list of
//     templates actually emitted for this project (see buildDocMap in
//     generator.mjs). It has to be computed after `emitWhen` has decided
//     which files exist, otherwise the index would link files that were
//     never written.
export const GENERATOR_DERIVED = new Set(["DOC_MAP"]);
