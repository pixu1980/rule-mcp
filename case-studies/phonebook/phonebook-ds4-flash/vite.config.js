/**
 * FILE: vite.config.js
 * USAGE: Vite configuration for the PhoneBook React app with Electron support.
 * Target: modern Chromium (Electron 35+ supports top-level await in modules).
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "chrome120",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
    strictPort: true,
  },
});
