// rule-architect validators - showIf logic, required fields, prefill engine
// Pure logic, no DOM. Used by both rule-architect-cli and rule-architect-web.

/**
 * Check if field should be visible given collected values.
 * Supports: equality, array (OR), negation { not: value }, compound (AND across conditions).
 */
export function isFieldVisible(field, values) {
  if (!field.showIf) return true;
  for (const [condKey, condVal] of Object.entries(field.showIf)) {
    const actual = values[condKey];
    if (Array.isArray(condVal)) {
      if (!condVal.includes(actual)) return false;
    } else if (typeof condVal === "object" && condVal !== null && "not" in condVal) {
      if (actual === condVal.not) return false;
    } else {
      if (actual !== condVal) return false;
    }
  }
  return true;
}

/**
 * Check if field is required (has required: true AND is visible).
 */
export function isFieldRequired(field, values) {
  if (!field.required) return false;
  return isFieldVisible(field, values);
}

/**
 * Filter steps by tier. Steps with tier <= current tier are visible.
 */
const TIER_ORDER = { starter: 0, standard: 1, deep: 2 };

export function visibleSteps(steps, tier) {
  return steps.filter((s) => {
    // Step 0 (depth) always visible
    if (s.key === "step-0-depth") return true;
    return TIER_ORDER[s.tier] <= TIER_ORDER[tier];
  });
}

/**
 * Apply prefillMap to auto-populate values from earlier steps.
 */
export function applyPrefill(values, prefillMap) {
  if (!prefillMap) return { ...values };
  const result = { ...values };

  for (const [targetKey, rule] of Object.entries(prefillMap)) {
    if (!result[targetKey] || rule.override) {
      if (typeof rule.from === "string") {
        result[targetKey] = values[rule.from] || "";
      } else if (Array.isArray(rule.from) && rule.transform === "featuresFromSketch") {
        const features = rule.from.map((k) => values[k] || "").filter(Boolean);
        if (features.length > 0) {
          result[targetKey] = features.map((name) => ({ feature: name, description: "" }));
        }
      } else if (rule.transform === "personaFromSketch") {
        const name = values[rule.from] || "";
        if (name) {
          result[targetKey] = [{ name, description: "", goal: "", pain: "", behavior: "" }];
        }
      } else if (rule.transform === "termsFromSketch") {
        const lines = (values[rule.from] || "").split("\n").filter(Boolean);
        if (lines.length > 0) {
          result[targetKey] = lines.map((term) => ({ term, definition: "" }));
        }
      }
    }
  }

  return result;
}

/**
 * Walk all steps and collect defaults. For pre-populating the form.
 */
export function collectDefaults(steps, optionGroups) {
  const values = {};
  for (const step of steps) {
    for (const field of step.fields) {
      if (field.default !== undefined) {
        values[field.key] = field.default;
      }
    }
  }
  return values;
}
