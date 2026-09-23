/**
 * @module vite.config
 * Vite configuration for React + TypeScript frontend.
 */

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".");

  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_PORT) || 3000,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.VITE_API_ORIGIN || "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
