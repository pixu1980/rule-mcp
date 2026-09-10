

/** @module core/scaffold/templates/lookup */

import { COMPONENT_TEMPLATES } from "../_template-data.data.js";

export function listTemplateCategories() {
  return Object.entries(COMPONENT_TEMPLATES).map(([name, t]) => ({
    name,
    description: t.description,
    frameworks: ["vanilla", "react", "vue", "svelte", "angular", "solid", "astro"],
  }));
}

export function getTemplate(component, framework = "vanilla") {
  const t = COMPONENT_TEMPLATES[component];

  if (!t) {
    return null;
  }

  if (framework === "vanilla" && t.vanilla) {
    return t.vanilla;
  }

  const key = framework;

  if (t[key]) {
    return t[key];
  }

  if (t.vanilla) {
    return t.vanilla;
  }

  return null;
}
