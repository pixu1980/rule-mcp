/**
 * Thin Electron lifecycle entry point for Orbit Contacts.
 */
const path = require("node:path");
const { app, BrowserWindow } = require("electron");
const { registerIpcHandlers } = require("./ipc/index.cjs");

let mainWindow;

/**
 * Create the isolated renderer window.
 * @returns {BrowserWindow} Main application window.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 860,
    minHeight: 620,
    title: "Orbit Contacts",
    backgroundColor: "#f4f5f8",
    titleBarStyle: "hiddenInset",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  if (process.env.ELECTRON_RENDERER_URL) mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  else mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  mainWindow.on("closed", () => { mainWindow = null; });
  return mainWindow;
}

app.whenReady().then(() => {
  registerIpcHandlers(path.join(app.getPath("userData"), "contacts.json"));
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
