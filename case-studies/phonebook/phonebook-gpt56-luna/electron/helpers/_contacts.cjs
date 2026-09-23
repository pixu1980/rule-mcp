/**
 * File-backed contact store for the Electron main process.
 */
const fs = require("node:fs");
const path = require("node:path");

/**
 * Read the contact archive, creating it with an empty collection on first launch.
 * @param {string} filePath User data file path.
 * @returns {Array<Record<string, unknown>>} Stored contacts.
 */
function readContacts(filePath) {
  if (!fs.existsSync(filePath)) {
    const seedPath = path.join(__dirname, "..", "data", "contacts.json");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.copyFileSync(seedPath, filePath);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * Validate and atomically replace the contact archive.
 * @param {string} filePath User data file path.
 * @param {Array<Record<string, unknown>>} contacts Contact collection.
 * @returns {{ok: boolean}} Persistence result.
 */
function writeContacts(filePath, contacts) {
  if (!Array.isArray(contacts)) throw new TypeError("Contacts must be an array");
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(contacts, null, 2));
  fs.renameSync(temporaryPath, filePath);
  return { ok: true };
}

module.exports = { readContacts, writeContacts };
