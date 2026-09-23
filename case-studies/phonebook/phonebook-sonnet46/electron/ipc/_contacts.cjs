/**
 * @file electron/ipc/_contacts.cjs
 * @description IPC handlers for contact CRUD operations.
 * Contacts are persisted as JSON in the user's app data directory.
 */
"use strict";

const { ipcMain } = require("electron");
const fs = require("fs");
const { getContactsFilePath } = require("../helpers/index.cjs");

/**
 * Reads contacts from disk; initialises file if it does not exist.
 * @returns {import('../../src/helpers/_sampleData.js').Contact[]}
 */
function readContacts() {
  const filePath = getContactsFilePath();

  if (!fs.existsSync(filePath)) {
    // First launch: no data yet — renderer will seed with sample data and call save
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), "utf8");
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

/**
 * Writes contacts array to disk atomically.
 * @param {object[]} contacts
 */
function writeContacts(contacts) {
  const filePath = getContactsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(contacts, null, 2), "utf8");
}

/**
 * Registers `contacts:load` and `contacts:save` IPC handlers.
 */
function registerContactHandlers() {
  ipcMain.handle("contacts:load", () => {
    return readContacts();
  });

  ipcMain.handle("contacts:save", (_, contacts) => {
    try {
      writeContacts(contacts);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { registerContactHandlers };
