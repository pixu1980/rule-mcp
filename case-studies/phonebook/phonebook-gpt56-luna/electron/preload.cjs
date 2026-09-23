/**
 * Minimal isolated bridge between renderer and Electron main process.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("orbitAPI", {
  loadContacts: () => ipcRenderer.invoke("load-contacts"),
  saveContacts: (contacts) => ipcRenderer.invoke("save-contacts", contacts),
});
