// Template Engine - Filter helpers (shared by filter families)

import { marked } from "marked";

export function createMarkedOptions() {
  return {
    gfm: true,
    breaks: false,
  };
}

export function renderMarkdown(value) {
  try {
    return marked(String(value), createMarkedOptions());
  } catch {
    return String(value);
  }
}

export function utilSlug(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ensureRootAbsolute(url) {
  if (url === undefined || url === null) return "";
  const s = String(url).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s; // absolute external
  if (s.startsWith("/")) return s; // already root-absolute
  if (s.startsWith("./")) return s.slice(1); // "./tags/x.html" -> "/tags/x.html"
  return `/${s.replace(/^\.?\/*/, "")}`; // "tags/x.html" -> "/tags/x.html"
}

export function getTagHref(tag) {
  if (!tag) return "/tags/";
  if (typeof tag === "object") {
    if (tag.url) return ensureRootAbsolute(tag.url);
    const keyOrName = tag.key || tag.name || tag.label || String(tag);
    return `/tags/${utilSlug(keyOrName)}.html`;
  }
  return `/tags/${utilSlug(tag)}.html`;
}

// Tags whose display label should be fully uppercase
const TAG_UPPERCASE_MAP = new Map([
  ["css", "CSS"],
  ["html", "HTML"],
]);

function applyTagDisplayCase(label) {
  const key = String(label).toLowerCase().trim();
  return TAG_UPPERCASE_MAP.get(key) || label;
}

export function getTagLabel(tag) {
  if (!tag) return "";
  const raw = typeof tag === "object" ? tag.label || tag.name || String(tag) : String(tag);
  return applyTagDisplayCase(raw);
}
