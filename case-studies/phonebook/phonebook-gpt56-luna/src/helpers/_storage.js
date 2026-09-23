/**
 * Persistence adapter that uses Electron IPC when available and localStorage in browser development.
 */
import { sampleContacts } from "../data/_contacts.js";

/**
 * Load contacts from the native store or the browser fallback.
 * @returns {Promise<Array<Record<string, unknown>>>} Stored contacts.
 */
export async function loadContacts() {
  if (window.orbitAPI?.loadContacts) return window.orbitAPI.loadContacts();
  const stored = window.localStorage.getItem("orbit-contacts");
  return stored ? JSON.parse(stored) : sampleContacts;
}

/**
 * Save contacts through the native store or the browser fallback.
 * @param {Array<Record<string, unknown>>} contacts Contacts to persist.
 * @returns {Promise<{ok: boolean}>} Persistence result.
 */
export async function saveContacts(contacts) {
  if (window.orbitAPI?.saveContacts) return window.orbitAPI.saveContacts(contacts);
  window.localStorage.setItem("orbit-contacts", JSON.stringify(contacts));
  return { ok: true };
}
