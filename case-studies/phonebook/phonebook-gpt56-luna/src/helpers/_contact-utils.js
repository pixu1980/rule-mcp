/**
 * Pure helpers for normalizing, searching, sorting, and presenting contacts.
 */

/**
 * Normalize a contact into a stable view model used by the renderer.
 * @param {Record<string, unknown>} contact Raw contact data.
 * @returns {Record<string, unknown>} Searchable contact view model.
 */
export function normalizeContact(contact) {
  const firstName = String(contact.firstName ?? "").trim();
  const lastName = String(contact.lastName ?? "").trim();
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Unnamed contact";
  return {
    ...contact,
    firstName,
    lastName,
    displayName,
    searchable: [displayName, contact.company, contact.email, contact.tags].filter(Boolean).join(" ").toLowerCase(),
  };
}

/**
 * Filter contacts according to the current search and navigation view.
 * @param {Array<Record<string, unknown>>} contacts Contacts to filter.
 * @param {{query?: string, view?: string}} options Filter options.
 * @returns {Array<Record<string, unknown>>} New sorted list of visible contacts.
 */
export function getVisibleContacts(contacts, { query = "", view = "all" } = {}) {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleContacts = contacts
    .map(normalizeContact)
    .filter((contact) => (view === "favorites" ? contact.favorite : true))
    .filter((contact) => (normalizedQuery ? contact.searchable.includes(normalizedQuery) : true));
  return visibleContacts.sort((first, second) =>
    view === "recent"
      ? new Date(String(second.updatedAt)).getTime() - new Date(String(first.updatedAt)).getTime()
      : String(first.displayName).localeCompare(String(second.displayName)),
  );
}

/**
 * Build a readable two-letter avatar fallback.
 * @param {{firstName?: string, lastName?: string}} contact Contact identity.
 * @returns {string} Two uppercase initials or question marks.
 */
export function getInitials(contact) {
  const first = String(contact.firstName ?? "")
    .trim()
    .charAt(0);
  const last = String(contact.lastName ?? "")
    .trim()
    .charAt(0);
  return `${first}${last}`.toUpperCase() || "??";
}

/**
 * Format an ISO date for the app's compact activity labels.
 * @param {string} value ISO date string.
 * @returns {string} Localized short date.
 */
export function formatContactDate(value) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}
