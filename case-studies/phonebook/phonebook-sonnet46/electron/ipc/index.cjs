/**
 * @file electron/ipc/index.cjs
 * @description Barrel, registers all IPC handler modules.
 */
"use strict";

const { registerContactHandlers } = require("./_contacts.cjs");

/**
 * Registers all IPC handlers for the application.
 */
function registerIpcHandlers() {
  registerContactHandlers();
}

module.exports = { registerIpcHandlers };
