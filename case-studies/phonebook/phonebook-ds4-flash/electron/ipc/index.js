/**
 * FILE: electron/ipc/index.js
 * USAGE: Barrel, registers all domain IPC handler modules.
 */
const { registerContactHandlers } = require("./_contacts.js");

function registerIpcHandlers() {
  registerContactHandlers();
}

module.exports = { registerIpcHandlers };
