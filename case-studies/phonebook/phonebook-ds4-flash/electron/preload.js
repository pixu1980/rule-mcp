/**
 * FILE: electron/preload.js
 * USAGE: Context bridge, exposes safe IPC channels to the renderer process.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("qt", {
  /** Load all contacts from the archive */
  loadContacts: () => ipcRenderer.invoke("contacts:load"),
  /** Save a single contact (create or update) */
  saveContact: (data) => ipcRenderer.invoke("contacts:save", data),
  /** Delete a contact by ID */
  deleteContact: (id) => ipcRenderer.invoke("contacts:delete", id),
  /** Load a contact by ID */
  getContact: (id) => ipcRenderer.invoke("contacts:get", id),
});
