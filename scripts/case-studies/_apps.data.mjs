

/**
 * @module scripts/case-studies/apps
 *
 * The six case-study apps: where each lives, which ports it searches from, and
 * the environment it needs.
 *
 * Data file: exempt from the file-size cap (ADR 061).
 *
 * @see scripts/case-studies/index.mjs - the launcher that consumes it
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The repository's `case-studies` directory. */
export const CASES = join(HERE, "..", "..", "case-studies");

/** The loopback name Vite binds by default and Electron is told to load. */
export const HOST = "localhost";

/**
 * The env shared by the three phonebook Electron apps.
 *
 * @param {number} web - the Vite port
 * @returns {Record<string, string>}
 */
function electronEnv(web) {
  return {
    VITE_PORT: String(web),
    ELECTRON_RENDERER_URL: `http://localhost:${web}`,
    NODE_ENV: "development",
  };
}

/** The six apps: port bases to search from, and the env each one needs. */
export const APPS = [
  {
    id: "bookmarks-ds4-flash",
    label: "bm-ds4",
    kind: "web",
    dir: join(CASES, "bookmarks-manager", "bookmarks-manager-ds4-flash"),
    webBase: 3000,
    apiBase: 4000,
    env: ({ web, api }) => ({
      VITE_PORT: String(web),
      VITE_API_ORIGIN: `http://127.0.0.1:${api}`,
      PORT: String(api),
      ALLOWED_ORIGINS: `http://localhost:${web}`,
    }),
  },
  {
    id: "bookmarks-gpt56-luna",
    label: "bm-gpt",
    kind: "web",
    dir: join(CASES, "bookmarks-manager", "bookmarks-manager-gpt56-luna"),
    webBase: 3010,
    apiBase: 4010,
    env: ({ web, api }) => ({
      VITE_PORT: String(web),
      VITE_API_URL: `http://127.0.0.1:${api}`,
      PORT: String(api),
      WEB_ORIGIN: `http://localhost:${web}`,
    }),
  },
  {
    id: "bookmarks-sonnet5",
    label: "bm-sonnet",
    kind: "web",
    dir: join(CASES, "bookmarks-manager", "bookmarks-manager-sonnet5"),
    webBase: 3020,
    apiBase: 4020,
    env: ({ web, api }) => ({
      VITE_PORT: String(web),
      VITE_API_ORIGIN: `http://127.0.0.1:${api}`,
      PORT: String(api),
      ALLOWED_ORIGINS: `http://localhost:${web}`,
    }),
  },
  {
    id: "phonebook-ds4-flash",
    label: "pb-ds4",
    kind: "electron",
    dir: join(CASES, "phonebook", "phonebook-ds4-flash"),
    webBase: 3030,
    env: ({ web }) => electronEnv(web),
  },
  {
    id: "phonebook-gpt56-luna",
    label: "pb-gpt",
    kind: "electron",
    dir: join(CASES, "phonebook", "phonebook-gpt56-luna"),
    webBase: 3040,
    env: ({ web }) => electronEnv(web),
  },
  {
    id: "phonebook-sonnet46",
    label: "pb-sonnet",
    kind: "electron",
    dir: join(CASES, "phonebook", "phonebook-sonnet46"),
    webBase: 3050,
    env: ({ web }) => electronEnv(web),
  },
];
