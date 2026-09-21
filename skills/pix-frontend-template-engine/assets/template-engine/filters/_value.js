// Template Engine - Value, format, and tag filters

import { getTagHref, getTagLabel } from "./_helpers.js";

/**
 * @param {import("../renderer/index.js").TemplateRenderer} renderer
 */
export function registerValueFilters(renderer) {
  renderer.registerFilter("default", (value, defaultValue = "") => {
    return value !== undefined && value !== null && value !== "" ? value : defaultValue;
  });

  // Serialize value as JSON string (useful for JSON-LD strings)
  renderer.registerFilter("json", (value) => {
    try {
      return JSON.stringify(value);
    } catch {
      return JSON.stringify(String(value));
    }
  });

  renderer.registerFilter("number", (value, decimals = 0) => {
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toFixed(decimals);
  });

  renderer.registerFilter("currency", (value, currency = "EUR") => {
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: currency,
    }).format(num);
  });

  renderer.registerFilter("tagHref", (tag) => getTagHref(tag));
  renderer.registerFilter("tagLabel", (tag) => getTagLabel(tag));

  // Handle property access (like post.next)
  renderer.registerFilter("", (value) => {
    // Empty filter - just return the value as-is
    return value;
  });
}
