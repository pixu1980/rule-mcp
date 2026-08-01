// skills/rule-architect/normalize.mjs
//
// Phase 4, Task 3: the pure normalization layer that wires raw wizard
// answers onto the `templates.json` placeholder keys, using the declarative
// tables in `field-map.mjs`. Runs before placeholder replacement in
// generator.mjs's `generateContext`/`generateContextContent`.
//
// Pipeline: RENAMES -> COMPOSITION -> DERIVED (in that order, every call —
// see the idempotency note below).
import { RENAMES, COMPOSITION, DERIVED } from "./field-map.mjs";

// Sets `target[key] = value` unless `value` is empty/nullish and `target[key]`
// already holds a non-empty value — i.e. never clobber a good fallback with
// an empty override. A non-empty `value` always wins: this is what gives a
// detailed repeatable group (e.g. FEATURES) precedence over its flat-fallback
// rename (TOP_FEATURE_* -> FEATURE_*) per the plan's documented precedence.
// Used for COMPOSITION and DERIVED, where the "wiring" data is meant to win
// over a plain rename fallback.
function setPreferNonEmpty(target, key, value) {
  if (value === undefined || value === null) return;
  if (value === "") {
    if (target[key] === undefined || target[key] === null) target[key] = value;
    return;
  }
  target[key] = value;
}

// Sets `target[key] = value` ONLY when `target[key]` is currently
// absent/empty — a present non-empty value at `key` always wins and is
// never clobbered. Used for RENAMES: some rename targets (PROJECT_NAME,
// PROJECT_ELEVATOR_PITCH) are ALSO directly-collected refined flat fields
// (step-7 final answers), distinct from their rough step-1 `_SKETCH`
// source. A rename must therefore only fill the target when the refined
// field was left blank — never overwrite an already-answered refined value
// with the rough sketch (fix round 1: this used to be `setPreferNonEmpty`,
// which inverted the precedence and let the sketch clobber the refined
// answer since the sketch is non-empty).
function setIfAbsent(target, key, value) {
  if (value === undefined || value === null) return;
  const existing = target[key];
  const existingIsEmpty = existing === undefined || existing === null || existing === "";
  if (existingIsEmpty) target[key] = value;
}

function applyRenames(answers) {
  const result = { ...answers };
  for (const [oldKey, newKey] of Object.entries(RENAMES)) {
    if (Object.prototype.hasOwnProperty.call(result, oldKey)) {
      setIfAbsent(result, newKey, result[oldKey]);
    }
  }
  return result;
}

// Mirrors interview.js's getRepeatableCount: an explicit `${group}_count`
// wins; otherwise scan upward while ANY declared subfield has a non-empty
// value at that index (same "stop at first empty index" rule the wizard
// UI uses). Unlike the wizard UI — which always reports >=1 so it can render
// an empty first row — a group that was never answered here yields count 0:
// we never want to synthesize a phantom first entry for a group with no data.
function getGroupCount(answers, group, subfields) {
  const stored = Number.parseInt(answers[`${group}_count`], 10);
  if (Number.isFinite(stored) && stored > 0) return stored;
  let count = 0;
  for (let i = 1; i <= 100; i++) {
    const hasAny = subfields.some((sf) => {
      const v = answers[`${group}_${i}_${sf}`];
      return v !== undefined && v !== null && v !== "";
    });
    if (!hasAny) break;
    count = i;
  }
  return count;
}

function applyComposition(answers) {
  const result = { ...answers };

  // Group COMPOSITION rules by `group` so the repeatable count is computed
  // once per group (from the union of all its declared subfields), even
  // though multiple rules can share a group (e.g. DOMAIN_TERMS: term + definition).
  const groupSubfields = new Map();
  for (const rule of COMPOSITION) {
    if (!groupSubfields.has(rule.group)) groupSubfields.set(rule.group, new Set());
    groupSubfields.get(rule.group).add(rule.subfield);
  }

  const counts = new Map();
  for (const rule of COMPOSITION) {
    const { group, subfield, template, aliases = [] } = rule;
    if (!counts.has(group)) {
      counts.set(group, getGroupCount(result, group, [...groupSubfields.get(group)]));
    }
    const count = counts.get(group);

    for (let i = 1; i <= count; i++) {
      const value = result[`${group}_${i}_${subfield}`];
      setPreferNonEmpty(result, template.replace("{i}", String(i)), value);
      for (const alias of aliases) {
        setPreferNonEmpty(result, alias.replace("{i}", String(i)), value);
      }
    }
  }
  return result;
}

function applyDerived(answers, spec) {
  const result = { ...answers };
  for (const rule of DERIVED) {
    let value;
    try {
      value = rule.from(result, spec);
    } catch {
      value = undefined; // never throw on missing groups/spec
    }
    setPreferNonEmpty(result, rule.template, value);
  }
  return result;
}

// The wizard stores a select's option KEY ("react", "vanilla-css"), while the
// human label lives in wizard-spec.json. Templates want prose, so AGENTS.md
// used to read "Frontend: react" / "CSS approach: vanilla-css".
//
// Some labels are decorated for the wizard UI rather than written as prose:
// STACK_LINT_TOOL's label is "Biome — rule-toolchain-biome" and
// DEVOPS_TEST_FRAMEWORK's is "Vitest — Fast Vite-native test runner". Taking
// the bare label would make those lines WORSE than the key, so everything
// from the em-dash separator onwards is dropped: the part before it is the
// name, the part after is a hint for the person filling the form.
function proseLabel(label) {
  return String(label).split(" — ")[0].trim();
}

function optionsForField(field, spec) {
  if (typeof field.options === "string") return spec?.optionGroups?.[field.options] || [];
  return Array.isArray(field.options) ? field.options : [];
}

function findSelectField(spec, fieldKey) {
  for (const step of spec?.steps || []) {
    for (const field of step.fields || []) {
      if (field.key === fieldKey && field.type === "select") return field;
    }
  }
  return undefined;
}

/**
 * The prose label a select field's option KEY resolves to, or undefined when
 * the field/option/spec is unknown. Exported so `emitWhen` gates in
 * templates.json can stay authored against stable option keys even though
 * `normalizeAnswers` rewrites the stored answer to its label.
 */
export function optionLabelFor(spec, fieldKey, value) {
  const field = findSelectField(spec, fieldKey);
  if (!field) return undefined;
  const option = optionsForField(field, spec).find((o) => o && o.key === value);
  return option && option.label ? proseLabel(option.label) : undefined;
}

// Runs LAST, after DERIVED: `resolveStackName` looks its value up BY KEY via
// spec.optionGroups, so it must still see the raw key when it runs.
//
// Only `select` fields are touched — free-text answers (BUILD_COMMAND,
// NODE_VERSION, the textareas) are never rewritten. Resolution is keyed on
// an exact option-key match, which also makes this idempotent: on a second
// pass the value is already a label and matches no key, so it is left alone.
function applyOptionLabels(answers, spec) {
  const steps = spec?.steps;
  if (!Array.isArray(steps)) return answers;

  const result = { ...answers };
  for (const step of steps) {
    for (const field of step.fields || []) {
      if (field.type !== "select") continue;
      const value = result[field.key];
      if (value === undefined || value === null || value === "") continue;

      const option = optionsForField(field, spec).find((o) => o && o.key === value);
      if (option && option.label) result[field.key] = proseLabel(option.label);
    }
  }
  return result;
}

/**
 * Wire raw wizard answers onto the template-placeholder keys `templates.json`
 * expects: apply direct RENAMES, expand repeatable groups per COMPOSITION,
 * compute DERIVED singles, then resolve select option keys to human labels.
 *
 * Pure (never mutates `answers`, always returns a new object). Idempotent:
 * since no source key is ever deleted, re-running the full pipeline on its
 * own output recomputes every renamed/composed/derived key to the same
 * value. Never throws on missing groups/spec (missing groups just yield
 * count 0; DERIVED failures are swallowed to `undefined`).
 *
 * @param {object} answers - collected wizard field values
 * @param {object} [spec] - wizard-spec.json content (only DERIVED's
 *   STACK_NAME resolver reads `spec.optionGroups`; safe to omit/null).
 * @returns {object} a new answers object with the normalized keys added
 */
export function normalizeAnswers(answers, spec) {
  if (!answers || typeof answers !== "object") return {};
  let result = applyRenames(answers);
  result = applyComposition(result);
  result = applyDerived(result, spec);
  result = applyOptionLabels(result, spec);
  return result;
}
