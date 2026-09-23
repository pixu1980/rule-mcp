/**
 * @file electron/helpers/_paths.cjs
 * @description Resolves persistent storage paths for the main process.
 */
"use strict";

const { app } = require("electron");
const path = require("path");
const fs = require("fs");

/**
 * Returns the absolute path to the contacts JSON file in userData.
 * Creates the directory if it does not exist.
 * @returns {string}
 */
function getContactsFilePath() {
  const dataDir = app.getPath("userData");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "contacts.json");
}

module.exports = { getContactsFilePath };
