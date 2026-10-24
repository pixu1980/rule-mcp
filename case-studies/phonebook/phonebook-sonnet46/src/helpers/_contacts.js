/**
 * @file src/helpers/_contacts.js
 * @description Contact utility functions: avatar color derivation, initials,
 * filtering, sorting, and alphabetical grouping.
 */

/** @type {string[]} Ordered avatar palette, 12 tokens. */
const AVATAR_PALETTE = [
  "var(--avatar-0)",
  "var(--avatar-1)",
  "var(--avatar-2)",
  "var(--avatar-3)",
  "var(--avatar-4)",
  "var(--avatar-5)",
  "var(--avatar-6)",
  "var(--avatar-7)",
  "var(--avatar-8)",
  "var(--avatar-9)",
  "var(--avatar-10)",
  "var(--avatar-11)",
];

/**
 * Derives an avatar color index (0-11) deterministically from a name string.
 * @param {string} name
 * @returns {number}
 */
export function getAvatarColorIndex(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % AVATAR_PALETTE.length;
}

/**
 * Returns the CSS color value for an avatar background.
 * @param {string} name
 * @returns {string}
 */
export function getAvatarColor(name) {
  return AVATAR_PALETTE[getAvatarColorIndex(name)];
}

/**
 * Returns uppercase initials (up to 2 letters) from first and last name.
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
export function getInitials(firstName = "", lastName = "") {
  const f = firstName.trim()[0] ?? "";
  const l = lastName.trim()[0] ?? "";
  return (l ? f + l : f + (firstName.trim()[1] ?? "")).toUpperCase();
}

/**
 * Formats a YYYY-MM-DD date string to a localized readable form.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatBirthday(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Returns the display label for a phone/email type (capitalized).
 * @param {string} label
 * @returns {string}
 */
export function formatLabel(label = "") {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Filters a contact array by group and search query.
 * @param {object[]} contacts
 * @param {string} query
 * @param {string} group  "all" | "favorites" | groupName
 * @returns {object[]}
 */
export function filterContacts(contacts, query, group) {
  let result = [...contacts];

  if (group === "favorites") {
    result = result.filter((c) => c.favorite);
  } else if (group !== "all") {
    result = result.filter((c) => c.groups?.includes(group));
  }

  if (query.trim()) {
    const q = query.toLowerCase();
    result = result.filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      const company = (c.company ?? "").toLowerCase();
      const phone = c.phones?.some((p) => p.value.includes(q)) ?? false;
      const email = c.emails?.some((e) => e.value.toLowerCase().includes(q)) ?? false;
      return name.includes(q) || company.includes(q) || phone || email;
    });
  }

  return result.sort((a, b) => {
    const nameA = `${a.lastName ?? ""} ${a.firstName ?? ""}`.toLowerCase();
    const nameB = `${b.lastName ?? ""} ${b.firstName ?? ""}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

/**
 * Groups sorted contacts by first letter of last name (or first name fallback).
 * @param {object[]} sortedContacts
 * @returns {Array<{letter: string, contacts: object[]}>}
 */
export function groupByLetter(sortedContacts) {
  const map = new Map();
  sortedContacts.forEach((c) => {
    const letter = (c.lastName?.[0] ?? c.firstName?.[0] ?? "#").toUpperCase();
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter).push(c);
  });
  return Array.from(map.entries()).map(([letter, contacts]) => ({
    letter,
    contacts,
  }));
}

/**
 * Generates a unique ID for new dynamic form fields.
 * @returns {string}
 */
export function newId() {
  return Math.random().toString(36).slice(2, 10);
}
