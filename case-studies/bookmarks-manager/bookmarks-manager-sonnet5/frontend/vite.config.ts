/**
 * @file Vite build configuration for the bookmarks-manager frontend.
 * Proxies `/api` to the Express backend during development so the browser
 * only ever talks to a single origin (avoids CORS friction in dev).
 */
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".");

  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_PORT) || 3001,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.VITE_API_ORIGIN || "http://localhost:3002",
          changeOrigin: true,
        },
      },
    },
  };
});
