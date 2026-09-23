/**
 * FILE: electron/main.js
 * USAGE: Thin Electron main process — app lifecycle, window creation, IPC registration.
 */
const { app, BrowserWindow } = require("electron");
const path = require("path");
const { registerIpcHandlers } = require("./ipc/index.js");

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "PhoneBook",
    titleBarStyle: "hiddenInset",
    transparent: false,
    backgroundColor: "#f5f5f7",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.NODE_ENV === "development" || process.argv.includes("--dev")) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL || "http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
