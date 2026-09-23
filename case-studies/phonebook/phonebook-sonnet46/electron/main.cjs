/**
 * @file electron/main.cjs
 * @description Electron main process — thin orchestration layer.
 * Creates the BrowserWindow, registers IPC handlers, and manages app lifecycle.
 */
"use strict";

const { app, BrowserWindow, nativeTheme } = require("electron");
const path = require("path");
const { registerIpcHandlers } = require("./ipc/index.cjs");

const isDev = process.env.NODE_ENV === "development";

/** @type {BrowserWindow | null} */
let mainWin = null;

/**
 * Creates the main application window with macOS-native styling.
 */
function createWindow() {
  nativeTheme.themeSource = "dark";

  mainWin = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 20 },
    backgroundColor: "#09090D",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWin.loadURL(process.env.ELECTRON_RENDERER_URL || "http://localhost:5173");
  } else {
    mainWin.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWin.once("ready-to-show", () => {
    mainWin.show();
  });

  mainWin.on("closed", () => {
    mainWin = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
