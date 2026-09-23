import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".");

  return {
    plugins: [react()],
    server: { port: Number(env.VITE_PORT) || 5173, strictPort: true },
    test: {
      environment: "jsdom",
      setupFiles: "./tests/setup.ts",
      include: ["tests/**/*.test.tsx", "tests/**/*.test.ts"],
    },
  };
});
