/**
 * @module playwright.config
 *
 * Playwright configuration for accessibility tests. Boots the Vite dev
 * server automatically so `pnpm test:a11y` works standalone.
 */

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: {
    baseURL: "http://localhost:3001",
  },
});
