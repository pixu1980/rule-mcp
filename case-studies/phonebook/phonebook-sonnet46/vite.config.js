/**
 * @file vite.config.js
 * @description Vite configuration for the phonebook renderer (React).
 * Root is set to `src/` so index.html lives at src/index.html.
 * Base is `./` for file:// compatibility in Electron production builds.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
    strictPort: true,
  },
});
