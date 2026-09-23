/**
 * IPC handlers for the contact archive domain.
 */
const { ipcMain } = require("electron");
const { readContacts, writeContacts } = require("../helpers/_contacts.cjs");

/**
 * Register safe request/response channels for contact persistence.
 * @param {string} filePath User data archive path.
 * @returns {void}
 */
function registerContactHandlers(filePath) {
  ipcMain.handle("load-contacts", () => readContacts(filePath));
  ipcMain.handle("save-contacts", (_event, contacts) => writeContacts(filePath, contacts));
}

module.exports = { registerContactHandlers };
