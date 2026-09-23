/**
 * Main-process IPC barrel.
 */
const { registerContactHandlers } = require("./_contacts.cjs");

/**
 * Register all application IPC domains.
 * @param {string} filePath User data archive path.
 * @returns {void}
 */
function registerIpcHandlers(filePath) {
  registerContactHandlers(filePath);
}

module.exports = { registerIpcHandlers };
