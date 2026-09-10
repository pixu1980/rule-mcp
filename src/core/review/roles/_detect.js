

/** @module core/review/roles/detect */

import { activeRoles } from "./_query.js";

/**
 * Frames that turn a subject into a persona request, English and Italian.
 *
 * "security headers" is work; "act as a security engineer" is a request for a
 * role's lenses and its three documents. The frame is what separates them, so a
 * bare role id never triggers on its own.
 */
const PERSONA_FRAMES = [
  "act as",
  "acting as",
  "as a",
  "as an",
  "in the role of",
  "you are a",
  "you are an",
  "agisci come",
  "comportati come",
  "nel ruolo di",
  "fai da",
  "come un",
  "come una",
];

/** Every name a role answers to: its id, its title, and the aliases it declares. */
function roleNames(role) {
  return [role.id, role.id.replaceAll("-", " "), role.role, ...(role.aliases ?? [])].filter(Boolean).map((name) => String(name).toLowerCase());
}

/**
 * Which review persona a prompt is asking for, if any (personas D.3).
 *
 * Two ways to qualify. A multi-word name - "security engineer", "architetto
 * software" - is specific enough on its own: nobody writes it about a subject.
 * A single word - "security", "privacy" - is a subject as often as a role, so it
 * counts only inside a persona frame.
 *
 * @param {string} prompt
 * @param {Array<object>} [overlays] - higher-precedence roles, lowest first
 * @returns {object|undefined} the role, or undefined when the prompt is ordinary work
 */
export function detectRole(prompt, overlays = []) {
  const text = String(prompt ?? "").toLowerCase();

  if (text.trim() === "") {
    return;
  }

  // Word-boundary matching: "ai" matches a standalone "ai", never the "ai"
  // inside "fai" / "again", and a frame like "come un" does not fire inside
  // "become unfettered".
  const wordBoundary = (word) => new RegExp(String.raw`\b${word.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\b`);
  const framed = PERSONA_FRAMES.some((frame) => wordBoundary(frame).test(text));

  for (const role of activeRoles(overlays)) {
    for (const name of roleNames(role)) {
      if (!wordBoundary(name).test(text)) {
        continue;
      }

      if (name.includes(" ") || framed) {
        return role;
      }
    }
  }
}
