// Template Engine - Text, URL, and HTML filters

import { ensureRootAbsolute, utilSlug } from "./_helpers.js";

/**
 * @param {import("../renderer/index.js").TemplateRenderer} renderer
 */
export function registerTextFilters(renderer) {
  renderer.registerFilter("upper", (value) => String(value).toUpperCase());
  renderer.registerFilter("lower", (value) => String(value).toLowerCase());

  renderer.registerFilter("capitalize", (value) => {
    const str = String(value);
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  });

  renderer.registerFilter("slug", (value) => utilSlug(value));
  renderer.registerFilter("absUrl", (value) => ensureRootAbsolute(value));

  renderer.registerFilter("escapeHtml", (value) => {
    const htmlEscapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      // '/' not required in modern escaping map
    };
    return String(value).replace(/[&<>"']/g, (s) => htmlEscapeMap[s]);
  });

  renderer.registerFilter("raw", (value) => value); // No escaping

  renderer.registerFilter("striptags", (value) => {
    return String(value).replace(/<[^>]*>/g, "");
  });

  renderer.registerFilter("trim", (value) => String(value).trim());
  renderer.registerFilter("truncate", (value, length = 100) => {
    const str = String(value);
    return str.length > length ? `${str.substring(0, length)}...` : str;
  });

  renderer.registerFilter("slugify", (value) => {
    return String(value)
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  });

  renderer.registerFilter("urlencode", (value) => {
    return encodeURIComponent(String(value));
  });

  renderer.registerFilter("pad", (value, length = 2, char = "0") => {
    return String(value).padStart(length, char);
  });
}
