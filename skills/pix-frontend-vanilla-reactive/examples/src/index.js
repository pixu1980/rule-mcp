// ═══════════════════════════════════════════════════════════════════════════════
//  rule-frontend-vanilla-reactive - Structured Demo Entry Point
//  ── App mounts via <app-root> custom element (connectedCallback)
// ═══════════════════════════════════════════════════════════════════════════════

import { registerFilter } from "./core/index.js";

// Register filters (called once at module load)
registerFilter("upper", (v) => String(v).toUpperCase());
registerFilter("lower", (v) => String(v).toLowerCase());
registerFilter("capitalize", (v) => {
  const s = String(v);
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
});
registerFilter("slugify", (v) =>
  String(v)
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, ""),
);
registerFilter("trim", (v) => String(v).trim());
registerFilter("escapeHtml", (v) =>
  String(v).replace(
    /[&<>"']/g,
    (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[s] || s,
  ),
);
registerFilter("striptags", (v) => String(v).replace(/<[^>]*>/g, ""));
registerFilter("raw", (v) => v);
registerFilter("json", (v) => {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
});
registerFilter("default", (v, d = "") => (v !== undefined && v !== null && v !== "" ? v : d));
registerFilter("truncate", (v, l = 100) => {
  const s = String(v);
  return s.length > l ? s.slice(0, l) + "..." : s;
});
registerFilter("length", (v) => (Array.isArray(v) || typeof v === "string" ? v.length : 0));
registerFilter("first", (v) => (Array.isArray(v) && v.length ? v[0] : v));
registerFilter("last", (v) => (Array.isArray(v) && v.length ? v[v.length - 1] : v));
registerFilter("join", (v, sep = ", ") =>
  Array.isArray(v) ? v.map((i) => (typeof i === "object" && i?.label ? i.label : String(i))).join(sep) : v,
);
registerFilter("tagLabel", (tag) => {
  if (!tag) return "";
  const raw = typeof tag === "object" ? tag.label || tag.name || String(tag) : String(tag);
  return raw;
});
registerFilter("tagHref", (tag) => {
  if (!tag) return "/tags/";
  if (typeof tag === "object")
    return tag.url
      ? tag.url.startsWith("/")
        ? tag.url
        : "/" + tag.url
      : "/tags/" + String(tag.key || tag.name || tag) + ".html";
  return "/tags/" + String(tag) + ".html";
});
registerFilter("date", (value, format = "en-US") => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  if (format === "YYYY-MM-DD") return d.toISOString().split("T")[0];
  try {
    return d.toLocaleDateString(format);
  } catch {
    return d.toLocaleDateString("en-US");
  }
});
registerFilter("timeAgo", (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(diff / 86400000);
  if (days < 30) return days + "d ago";
  return d.toLocaleDateString("en-US");
});
registerFilter("urlencode", (v) => encodeURIComponent(String(v)));
registerFilter("sortBy", (array, prop, dir = "asc") => {
  if (!Array.isArray(array)) return array;
  return [...array].sort((a, b) => {
    let va = a[prop],
      vb = b[prop];
    return dir === "desc" ? (va < vb ? 1 : -1) : va > vb ? 1 : -1;
  });
});

// Import App to trigger the module (CSS fetch + element definition)
import "./components/App/index.js";
