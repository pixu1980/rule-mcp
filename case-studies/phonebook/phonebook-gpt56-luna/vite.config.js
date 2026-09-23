import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src",
  plugins: [react()],
  base: "./",
  build: { outDir: "../dist", emptyOutDir: true },
  server: { port: Number(process.env.VITE_PORT) || 3000, strictPort: true },
  test: {
    include: ["**/*.{test,spec}.{js,jsx}"],
    environment: "jsdom",
    setupFiles: "../tests/setup.js",
    css: true,
  },
});
