/**
 * @file electron/preload.cjs
 * @description Context bridge, exposes the `phonebook` API to the renderer.
 * Only `invoke`-based IPC channels are exposed. Never exposes nodeRequire or process.
 */
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("phonebook", {
  /** Load all contacts from disk. @returns {Promise<Contact[]>} */
  loadContacts: () => ipcRenderer.invoke("contacts:load"),

  /** Persist the full contact array to disk. @param {Contact[]} contacts @returns {Promise<{ok: boolean}>} */
  saveContacts: (contacts) => ipcRenderer.invoke("contacts:save", contacts),
});
