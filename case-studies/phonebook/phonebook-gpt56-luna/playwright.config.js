import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/a11y",
  use: { baseURL: "http://127.0.0.1:3000", headless: true },
  webServer: { command: "pnpm dev", url: "http://127.0.0.1:3000", reuseExistingServer: true },
});
