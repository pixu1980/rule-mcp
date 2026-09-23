/** Playwright configuration for WCAG smoke tests. */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/a11y",
  use: { baseURL: "http://127.0.0.1:5173" },
  webServer: { command: "pnpm dev -- --host 127.0.0.1", url: "http://127.0.0.1:5173", reuseExistingServer: true }
});
